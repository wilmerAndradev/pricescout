import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

# Test environment constants
TEST_USER_ID = "test-user-123"
TEST_TOKEN = "test-token-xyz"
TEST_BUY_ORDER = "BO_test_123"

@pytest.fixture
def mock_supabase(supabase_mock):
    """Alias for consistency in billing tests."""
    return supabase_mock

@pytest.fixture
def mock_transbank():
    with patch("routers.billing.tbk_client") as mock_tbk:
        yield mock_tbk

def test_get_user_subscription_and_plan_gratis_default(mock_supabase):
    from routers.billing import get_user_subscription_and_plan
    # Setup mock to simulate no active subscription, returns Gratis plan
    def side_effect_table(table_name):
        if table_name == "subscriptions":
            return MockQueryBuilder(data=[])
        elif table_name == "plans":
            return MockQueryBuilder(data=[{"id": "gratis", "name": "Gratis", "price_clp": 0, "billing_interval": "month"}])
        return MockQueryBuilder()
        
    mock_supabase.table = MagicMock(side_effect=side_effect_table)
    
    # Run async function in event loop
    import asyncio
    sub, plan = asyncio.run(get_user_subscription_and_plan(TEST_USER_ID))
    
    assert sub is None
    assert plan["id"] == "gratis"

@pytest.mark.asyncio
async def test_initiate_payment_success(client, mock_supabase, mock_transbank):
    from auth import get_current_user
    # Setup mock for plan lookup
    starter_plan = {
        "id": "starter_monthly",
        "name": "Starter",
        "price_clp": 4990,
        "billing_interval": "month"
    }
    
    # Configure mock responses sequentially
    # 1. plan lookup: select("").eq("id", target)
    mock_query_plan = MagicMock()
    mock_query_plan.execute.return_value.data = [starter_plan]
    
    # 2. current subscription lookup: select("").eq("").in_("").execute
    mock_query_sub = MagicMock()
    mock_query_sub.execute.return_value.data = [] # No current subscription
    
    # Mock gratis fallback plan lookup
    mock_query_gratis = MagicMock()
    mock_query_gratis.execute.return_value.data = [
        {"id": "gratis", "name": "Gratis", "price_clp": 0, "billing_interval": "month"}
    ]
    
    def side_effect_table(table_name):
        mock_tbl = MagicMock()
        if table_name == "plans":
            mock_tbl.select.return_value.eq.return_value = mock_query_plan
        elif table_name == "subscriptions":
            mock_tbl.select.return_value.eq.return_value.in_.return_value = mock_query_sub
        else:
            mock_tbl.insert.return_value = MagicMock()
        return mock_tbl
        
    mock_supabase.table.side_effect = side_effect_table
    
    # Mock Transbank Client
    mock_transbank.initiate_transaction = AsyncMock(return_value={
        "token": TEST_TOKEN,
        "url": "https://mock.transbank.cl/pay"
    })
    
    # Call initiate endpoint
    # Bypass auth using dependency override
    from main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    try:
        response = client.post("/api/v1/billing/initiate", json={
            "plan_id": "starter_monthly",
            "return_url": "http://localhost:3000/billing/confirm"
        }, headers={"Authorization": f"Bearer {TEST_TOKEN}"})
    finally:
        app.dependency_overrides.clear()
        
    assert response.status_code == 202
    json_data = response.json()
    assert json_data["token"] == TEST_TOKEN
    assert TEST_TOKEN in json_data["url"]
    assert json_data["amount"] == 4990

@pytest.mark.asyncio
async def test_confirm_payment_approved(mock_supabase, mock_transbank):
    from routers.billing import confirm_transaction_logic
    # Setup transaction record mock
    tx_record = {
        "id": "tx-123",
        "user_id": TEST_USER_ID,
        "plan_id": "starter_monthly",
        "amount": 4990,
        "status": "initiated",
        "buy_order": TEST_BUY_ORDER,
        "token": TEST_TOKEN
    }
    
    mock_query_tx = MagicMock()
    mock_query_tx.execute.return_value.data = [tx_record]
    
    # Plan details mock
    starter_plan = {
        "id": "starter_monthly",
        "name": "Starter",
        "price_clp": 4990,
        "billing_interval": "month"
    }
    mock_query_plan = MagicMock()
    mock_query_plan.execute.return_value.data = [starter_plan]
    
    # Existing subscription mock (none)
    mock_query_existing_sub = MagicMock()
    mock_query_existing_sub.execute.return_value.data = []
    
    def side_effect_table(table_name):
        mock_tbl = MagicMock()
        if table_name == "payment_transactions":
            mock_tbl.select.return_value.eq.return_value = mock_query_tx
            mock_tbl.update.return_value.eq.return_value = MagicMock()
        elif table_name == "plans":
            mock_tbl.select.return_value.eq.return_value = mock_query_plan
        elif table_name == "subscriptions":
            mock_tbl.select.return_value.eq.return_value = mock_query_existing_sub
            mock_tbl.insert.return_value.execute.return_value.data = [{"id": "sub-123", "status": "active"}]
        return mock_tbl
        
    mock_supabase.table.side_effect = side_effect_table
    
    # Mock Transbank Commit
    mock_transbank.commit_transaction = AsyncMock(return_value={
        "response_code": 0,
        "status": "AUTHORIZED",
        "authorization_code": "123456",
        "payment_type_code": "VN",
        "transaction_date": "2026-06-11T14:30:00Z",
        "card_detail": {"card_number": "6623"}
    })
    
    # Execute confirmation
    result = await confirm_transaction_logic(TEST_TOKEN)
    
    assert result["status"] == "approved"
    assert result["amount"] == 4990
    assert result["plan_id"] == "starter_monthly"
    assert result["subscription"] is not None

@pytest.mark.asyncio
async def test_confirm_payment_rejected(mock_supabase, mock_transbank):
    from routers.billing import confirm_transaction_logic
    # Setup transaction record mock
    tx_record = {
        "id": "tx-123",
        "user_id": TEST_USER_ID,
        "plan_id": "starter_monthly",
        "amount": 4990,
        "status": "initiated",
        "buy_order": TEST_BUY_ORDER,
        "token": TEST_TOKEN
    }
    
    mock_query_tx = MagicMock()
    mock_query_tx.execute.return_value.data = [tx_record]
    
    def side_effect_table(table_name):
        mock_tbl = MagicMock()
        if table_name == "payment_transactions":
            mock_tbl.select.return_value.eq.return_value = mock_query_tx
            mock_tbl.update.return_value.eq.return_value = MagicMock()
        return mock_tbl
        
    mock_supabase.table.side_effect = side_effect_table
    
    # Mock Transbank Commit as rejected (response_code != 0)
    mock_transbank.commit_transaction = AsyncMock(return_value={
        "response_code": 5,
        "status": "FAILED"
    })
    
    # Execute confirmation
    result = await confirm_transaction_logic(TEST_TOKEN)
    
    assert result["status"] == "rejected"
    assert result["subscription"] is None

@pytest.mark.asyncio
async def test_cancel_subscription_success(client, mock_supabase):
    from auth import get_current_user
    # Setup mock active subscription
    active_sub = {
        "id": "sub-123",
        "user_id": TEST_USER_ID,
        "plan_id": "starter_monthly",
        "status": "active"
    }
    
    mock_query_sub = MagicMock()
    mock_query_sub.execute.return_value.data = [active_sub]
    
    def side_effect_table(table_name):
        mock_tbl = MagicMock()
        if table_name == "subscriptions":
            mock_tbl.select.return_value.eq.return_value.eq.return_value = mock_query_sub
            mock_tbl.update.return_value.eq.return_value = MagicMock()
        return mock_tbl
        
    mock_supabase.table.side_effect = side_effect_table
    
    # Call cancel endpoint
    from main import app
    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    try:
        response = client.post("/api/v1/billing/cancel", headers={"Authorization": f"Bearer {TEST_TOKEN}"})
    finally:
        app.dependency_overrides.clear()
        
    assert response.status_code == 200
    assert "cancel at the end of the billing cycle" in response.json()["message"]
