import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Form
from pydantic import BaseModel

from auth import get_current_user, execute_with_retry
from core.transbank import TransbankWebpayClient
from supabase import create_client, Client

# Initialize service role client for writes bypassing RLS
_supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
_anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
_write_key = _service_key if _service_key and _service_key != "your-service-role-key-here" else _anon_key
supabase_admin: Client = create_client(_supabase_url, _write_key)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])
tbk_client = TransbankWebpayClient()

# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class InitiatePaymentRequest(BaseModel):
    plan_id: str
    return_url: str

# Helper functions for subscription and proration logic

async def get_user_subscription_and_plan(user_id: str):
    """Retrieves the active subscription and associated plan details for a user."""
    # Find active or past_due subscription
    sub_res = execute_with_retry(
        supabase_admin.table("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user_id)
        .in_("status", ["active", "past_due"])
    )
    
    if sub_res.data:
        sub = sub_res.data[0]
        # Check if expired
        now = datetime.now(timezone.utc)
        period_end = datetime.fromisoformat(sub["current_period_end"].replace("Z", "+00:00"))
        
        if period_end < now:
            # Check grace period (3 days)
            grace_end = period_end + timedelta(days=3)
            if now <= grace_end:
                if sub["status"] != "past_due":
                    # Mark status as past_due in DB
                    execute_with_retry(
                        supabase_admin.table("subscriptions")
                        .update({"status": "past_due"})
                        .eq("id", sub["id"])
                    )
                    sub["status"] = "past_due"
                return sub, sub["plans"]
            else:
                # Fully expired. Update status in DB.
                execute_with_retry(
                    supabase_admin.table("subscriptions")
                    .update({"status": "expired"})
                    .eq("id", sub["id"])
                )
        else:
            return sub, sub["plans"]
            
    # Default to Gratis plan
    plan_res = execute_with_retry(
        supabase_admin.table("plans").select("*").eq("id", "gratis")
    )
    if not plan_res.data:
        raise HTTPException(status_code=500, detail="Gratis plan not seeded in database")
        
    return None, plan_res.data[0]

def calculate_proration_credit(current_sub: dict, current_plan: dict) -> int:
    """Calculates unused plan value as credit for upgrade."""
    if not current_sub or current_plan["id"] == "gratis" or current_plan["price_clp"] <= 0:
        return 0
        
    now = datetime.now(timezone.utc)
    period_start = datetime.fromisoformat(current_sub["current_period_start"].replace("Z", "+00:00"))
    period_end = datetime.fromisoformat(current_sub["current_period_end"].replace("Z", "+00:00"))
    
    total_duration = (period_end - period_start).total_seconds()
    remaining_duration = (period_end - now).total_seconds()
    
    if remaining_duration <= 0 or total_duration <= 0:
        return 0
        
    # Unused percentage of plan price
    ratio = remaining_duration / total_duration
    credit = int(current_plan["price_clp"] * ratio)
    return max(0, credit)

async def confirm_transaction_logic(token: str) -> dict:
    """Idempotent logic to confirm a Transbank transaction and update subscriptions."""
    # 1. Fetch transaction record
    tx_res = execute_with_retry(
        supabase_admin.table("payment_transactions").select("*").eq("token", token)
    )
    if not tx_res.data:
        logger.error(f"Transaction not found in database for token: {token}")
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    tx = tx_res.data[0]
    
    # Idempotency check: if transaction is already resolved
    if tx["status"] in ["approved", "rejected"]:
        logger.info(f"Transaction {token} already resolved as {tx['status']}. Returning cached state.")
        sub_res = execute_with_retry(
            supabase_admin.table("subscriptions").select("*").eq("user_id", tx["user_id"])
        )
        return {
            "status": tx["status"],
            "buy_order": tx["buy_order"],
            "amount": tx["amount"],
            "plan_id": tx["plan_id"],
            "subscription": sub_res.data[0] if sub_res.data else None
        }
        
    # 2. Call Transbank to commit/confirm the transaction
    try:
        tbk_res = await tbk_client.commit_transaction(token)
    except Exception as e:
        logger.error(f"Transbank commit request failed for token {token}: {e}")
        # Mark transaction as failed in DB
        execute_with_retry(
            supabase_admin.table("payment_transactions")
            .update({"status": "failed", "updated_at": "now()"})
            .eq("id", tx["id"])
        )
        raise HTTPException(status_code=502, detail="Failed to communicate with payment processor")
        
    response_code = tbk_res.get("response_code")
    tbk_status = tbk_res.get("status")
    
    # 3. Handle success vs rejection
    if response_code == 0 and tbk_status in ["AUTHORIZED", "INITIALIZED"]:
        # APPROVED
        logger.info(f"Transaction {token} approved by Transbank.")
        
        # Update transaction log
        execute_with_retry(
            supabase_admin.table("payment_transactions")
            .update({
                "status": "approved",
                "authorization_code": tbk_res.get("authorization_code"),
                "payment_type_code": tbk_res.get("payment_type_code"),
                "response_code": response_code,
                "transaction_date": tbk_res.get("transaction_date"),
                "updated_at": "now()"
            })
            .eq("id", tx["id"])
        )
        
        # Fetch target plan details
        plan_res = execute_with_retry(
            supabase_admin.table("plans").select("*").eq("id", tx["plan_id"])
        )
        plan = plan_res.data[0]
        
        # Compute billing period end date
        now = datetime.now(timezone.utc)
        if plan["billing_interval"] == "year":
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)
            
        # Get card details if available
        card_number = tbk_res.get("card_detail", {}).get("card_number", "unknown")
        
        # Upsert Subscription
        sub_payload = {
            "user_id": tx["user_id"],
            "plan_id": tx["plan_id"],
            "status": "active",
            "current_period_start": now.isoformat(),
            "current_period_end": period_end.isoformat(),
            "cancel_at_period_end": False,
            "transbank_token": token,
            "transbank_buy_order": tx["buy_order"],
            "payment_method": f"Tarjeta (**** {card_number})",
            "updated_at": "now()"
        }
        
        # Check if subscription already exists to get ID
        existing_sub = execute_with_retry(
            supabase_admin.table("subscriptions").select("id").eq("user_id", tx["user_id"])
        )
        
        if existing_sub.data:
            sub_res = execute_with_retry(
                supabase_admin.table("subscriptions")
                .update(sub_payload)
                .eq("id", existing_sub.data[0]["id"])
            )
        else:
            sub_res = execute_with_retry(
                supabase_admin.table("subscriptions").insert(sub_payload)
            )
            
        return {
            "status": "approved",
            "buy_order": tx["buy_order"],
            "amount": tx["amount"],
            "plan_id": tx["plan_id"],
            "subscription": sub_res.data[0] if sub_res.data else None
        }
        
    else:
        # REJECTED or failed response_code
        logger.warning(f"Transaction {token} rejected by Transbank. Response Code: {response_code}")
        
        # Update transaction log
        execute_with_retry(
            supabase_admin.table("payment_transactions")
            .update({
                "status": "rejected",
                "response_code": response_code,
                "updated_at": "now()"
            })
            .eq("id", tx["id"])
        )
        
        return {
            "status": "rejected",
            "buy_order": tx["buy_order"],
            "amount": tx["amount"],
            "plan_id": tx["plan_id"],
            "subscription": None
        }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/initiate", status_code=202)
async def initiate_payment(request: InitiatePaymentRequest, user_id: str = Depends(get_current_user)):
    """
    Starts the purchase flow for a paid SaaS plan with Webpay Plus.
    Calculates proration credit if upgrading, initiates Webpay transaction, and logs it.
    """
    target_plan_id = request.plan_id
    
    # 1. Verify target plan exists and is not 'gratis'
    plan_res = execute_with_retry(
        supabase_admin.table("plans").select("*").eq("id", target_plan_id)
    )
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Target plan not found")
        
    target_plan = plan_res.data[0]
    if target_plan["id"] == "gratis":
        raise HTTPException(status_code=400, detail="Cannot purchase the Gratis plan")
        
    # 2. Get current subscription & plan to evaluate proration
    current_sub, current_plan = await get_user_subscription_and_plan(user_id)
    
    # If already on the requested plan and active, reject
    if current_sub and current_sub["plan_id"] == target_plan_id and current_sub["status"] == "active":
        raise HTTPException(status_code=400, detail="You already have an active subscription to this plan")
        
    # 3. Calculate proration credit and charge amount
    # Only credit if upgrading (price of target > price of current)
    credit = 0
    if current_sub and target_plan["price_clp"] > current_plan["price_clp"]:
        credit = calculate_proration_credit(current_sub, current_plan)
        
    charge_amount = max(10, target_plan["price_clp"] - credit) # Webpay minimum is $10 CLP
    
    # 4. Generate transaction data
    buy_order = f"BO_{user_id[:8]}_{int(datetime.now().timestamp() * 1000)}"
    session_id = f"SESS_{user_id[:8]}"
    
    # 5. Call Transbank Webpay Plus REST API
    try:
        tbk_data = await tbk_client.initiate_transaction(
            buy_order=buy_order,
            session_id=session_id,
            amount=charge_amount,
            return_url=request.return_url
        )
    except Exception as e:
        logger.error(f"Failed to initiate payment with Transbank: {e}")
        raise HTTPException(status_code=502, detail="Failed to communicate with payment processor")
        
    token = tbk_data.get("token")
    redirect_url = tbk_data.get("url")
    
    if not token or not redirect_url:
        logger.error("Transbank failed to return token or redirect URL.")
        raise HTTPException(status_code=502, detail="Invalid response from payment processor")
        
    # 6. Log payment transaction in DB
    tx_payload = {
        "user_id": user_id,
        "plan_id": target_plan_id,
        "is_annual": target_plan["billing_interval"] == "year",
        "amount": charge_amount,
        "status": "initiated",
        "buy_order": buy_order,
        "session_id": session_id,
        "token": token
    }
    
    execute_with_retry(
        supabase_admin.table("payment_transactions").insert(tx_payload)
    )
    
    return {
        "token": token,
        "url": f"{redirect_url}?token_ws={token}", # Standard redirection payload format
        "amount": charge_amount,
        "buy_order": buy_order
    }


@router.post("/confirm")
async def confirm_payment(token: str, user_id: str = Depends(get_current_user)):
    """
    Explicit endpoint for frontend client to confirm a transaction by token.
    Returns the transaction status and active subscription if approved.
    """
    # Verify transaction belongs to this user
    tx_res = execute_with_retry(
        supabase_admin.table("payment_transactions").select("user_id").eq("token", token)
    )
    if not tx_res.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx_res.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Transaction belongs to another user")
        
    return await confirm_transaction_logic(token)


@router.post("/webhook")
async def payment_webhook(token_ws: Optional[str] = Form(None), TBK_TOKEN: Optional[str] = Form(None)):
    """
    Webhook / IPN callback for Transbank Webpay Plus.
    Webpay sends token_ws in form data upon completion, or TBK_TOKEN if aborted/failed.
    """
    # Handle abort/cancellation
    if TBK_TOKEN and not token_ws:
        logger.warning(f"User aborted checkout flow. Webpay returned TBK_TOKEN: {TBK_TOKEN}")
        # Mark transaction as rejected/aborted in database
        execute_with_retry(
            supabase_admin.table("payment_transactions")
            .update({"status": "rejected", "updated_at": "now()"})
            .eq("token", TBK_TOKEN)
        )
        return {"status": "aborted", "token": TBK_TOKEN}
        
    if not token_ws:
        raise HTTPException(status_code=400, detail="Missing transaction token (token_ws)")
        
    # Execute confirmation logic idempotently
    result = await confirm_transaction_logic(token_ws)
    return {"status": result["status"], "buy_order": result["buy_order"]}


@router.get("/status")
async def get_billing_status(user_id: str = Depends(get_current_user)):
    """
    Returns the user's current subscription, plan features, and limits,
    along with usage stats (e.g. searches performed in the current month).
    """
    sub, plan = await get_user_subscription_and_plan(user_id)
    
    # Count searches in the current calendar month
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    searches_res = execute_with_retry(
        supabase_admin.table("searches")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", start_of_month.isoformat())
    )
    searches_count = searches_res.count if searches_res.count is not None else 0
    
    return {
        "subscription": sub,
        "plan": plan,
        "usage": {
            "searches_this_month": searches_count,
            "searches_limit": plan["searches_per_month"],
            "stores_per_search_limit": plan["stores_per_search"],
            "projects_limit": plan["projects_limit"],
            "alerts_limit": plan["alerts_limit"],
            "history_days_limit": plan["history_days"]
        }
    }


@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(get_current_user)):
    """
    Cancels the active subscription at the end of the current billing period.
    Plan remains active until current_period_end.
    """
    sub_res = execute_with_retry(
        supabase_admin.table("subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "active")
    )
    
    if not sub_res.data:
        raise HTTPException(status_code=404, detail="No active subscription found to cancel")
        
    sub = sub_res.data[0]
    
    execute_with_retry(
        supabase_admin.table("subscriptions")
        .update({"cancel_at_period_end": True, "updated_at": "now()"})
        .eq("id", sub["id"])
    )
    
    return {"message": "Subscription scheduled to cancel at the end of the billing cycle"}
