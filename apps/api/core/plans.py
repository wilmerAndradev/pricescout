"""
core/plans.py — Plan Limits and Enforcement core module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provides logic for validating and enforcing SaaS plan limits on the backend.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import logging
import redis
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException
from supabase import create_client, Client
from auth import execute_with_retry

logger = logging.getLogger(__name__)

# ─── Supabase Admin Client (Bypasses RLS for server-side verification) ───────
_supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
_service_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
_anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

_write_key = (
    _service_key
    if _service_key and _service_key != "your-service-role-key-here"
    else _anon_key
)

if not _supabase_url or not _write_key:
    logger.error("Supabase URL and credentials are not fully configured in environment.")

supabase_admin: Client = create_client(_supabase_url, _write_key)

# ─── Redis Client for Guest Limits ───────────────────────────────────────────
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url)

# ─── Default Hardcoded SaaS Plan Limits Fallback ─────────────────────────────
# Fuente de verdad: SRS §2.3.
# Se utilizará si la tabla 'plans' no existe o si la consulta falla.
PLAN_LIMITS = {
    "gratis": {
        "name": "Gratis",
        "searches_per_month": 10,
        "stores_per_search": 5,
        "can_choose_stores": False,
        "can_add_custom_stores": False,
        "projects_limit": 0,
    },
    "starter": {
        "name": "Starter",
        "searches_per_month": 100,
        "stores_per_search": 10,
        "can_choose_stores": False,
        "can_add_custom_stores": False,
        "projects_limit": 5,
    },
    "pro": {
        "name": "Pro",
        "searches_per_month": -1,  # Ilimitadas
        "stores_per_search": 20,
        "can_choose_stores": True,
        "can_add_custom_stores": False,
        "projects_limit": 50,
    },
    "business": {
        "name": "Business",
        "searches_per_month": -1,  # Ilimitadas
        "stores_per_search": -1,  # Sin límite
        "can_choose_stores": True,
        "can_add_custom_stores": True,
        "projects_limit": -1,  # Ilimitados
    }
}


def get_user_plan_and_limits(user_id: Optional[str]) -> dict:
    """
    Retrieves the plan ID and specific limits for a user.
    If user_id is None, returns the limits for the 'gratis' plan.
    Attempts to read limits dynamically from the 'plans' DB table first.
    """
    plan_id = "gratis"

    if user_id:
        try:
            # Query plan_id from user subscription
            res = execute_with_retry(
                supabase_admin.table("subscriptions")
                .select("plan_id")
                .eq("user_id", user_id)
                .in_("status", ["active", "past_due"])
            )
            if res.data and len(res.data) > 0:
                plan_id = res.data[0]["plan_id"] or "gratis"
        except Exception as e:
            logger.warning(
                f"Failed to query plan_id from subscriptions for user {user_id}. Falling back to default 'gratis' plan. Error: {e}"
            )
            plan_id = "gratis"

    # Try to load plans dynamically from 'plans' table
    try:
        plans_res = execute_with_retry(supabase_admin.table("plans").select("*"))
        if plans_res.data:
            db_limits = {}
            for row in plans_res.data:
                plan_id_lower = row["id"].lower()
                db_limits[row["id"]] = {
                    "name": row["name"],
                    "searches_per_month": row["searches_per_month"],
                    "stores_per_search": row["stores_per_search"],
                    "can_choose_stores": "pro" in plan_id_lower or "business" in plan_id_lower,
                    "can_add_custom_stores": "business" in plan_id_lower,
                    "projects_limit": row["projects_max"],
                }
            if plan_id in db_limits:
                return db_limits[plan_id]
    except Exception as e:
        # Fallback gracefully if plans table does not exist or fails
        logger.debug(f"Dynamic plans query failed or table not found: {e}. Using local fallback.")

    fallback_key = plan_id.replace("_monthly", "").replace("_yearly", "")
    return PLAN_LIMITS.get(fallback_key, PLAN_LIMITS["gratis"])


def check_monthly_search_limit(user_id: Optional[str], ip_address: str) -> None:
    """
    Validates if the user or guest IP has exceeded their monthly search quota.
    Raises HTTPException (402 Payment Required) if the limit is reached.
    """
    limits = get_user_plan_and_limits(user_id)
    limit = limits["searches_per_month"]

    if limit == -1:
        # Unlimited searches
        return

    now = datetime.now(timezone.utc)

    if user_id is None:
        # Validate guest IP searches count via Redis
        current_month_str = now.strftime("%Y-%m")
        redis_key = f"search_count:guest:{ip_address}:{current_month_str}"
        try:
            count_bytes = redis_client.get(redis_key)
            count = int(count_bytes) if count_bytes else 0
            if count >= limit:
                logger.info(f"Guest IP {ip_address} has reached the monthly search limit of {limit}.")
                raise HTTPException(
                    status_code=402,
                    detail={
                        "detail": "Límite de búsquedas mensuales alcanzado para tu plan Gratis. Regístrate para continuar.",
                        "code": "LIMIT_EXCEEDED"
                    }
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error checking guest search limits in Redis: {e}")
    else:
        # Validate logged-in user searches in Supabase for current calendar month
        first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
        try:
            res = execute_with_retry(
                supabase_admin.table("searches")
                .select("id", count="exact")
                .eq("user_id", user_id)
                .gte("created_at", first_of_month)
            )
            count = res.count or 0
            if count >= limit:
                logger.info(f"User {user_id} has reached the monthly search limit of {limit}.")
                raise HTTPException(
                    status_code=402,
                    detail={
                        "detail": f"Límite de búsquedas mensuales alcanzado para tu plan {limits['name']}.",
                        "code": "LIMIT_EXCEEDED"
                    }
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking user search limits in Supabase: {e}")


def increment_monthly_search_count(user_id: Optional[str], ip_address: str) -> None:
    """
    Increments the monthly search count for guest IP address.
    For logged-in users, the searches table records insertions automatically increment the count.
    """
    if user_id is None:
        # Increment Redis search count for guest IP
        now = datetime.now(timezone.utc)
        current_month_str = now.strftime("%Y-%m")
        redis_key = f"search_count:guest:{ip_address}:{current_month_str}"
        try:
            pipe = redis_client.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, 31 * 86400)  # 31 days TTL
            pipe.execute()
        except Exception as e:
            logger.warning(f"Error incrementing guest search count in Redis: {e}")
