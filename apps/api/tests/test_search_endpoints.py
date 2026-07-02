from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from main import app
from routers.search import get_optional_current_user

# Dummy constants
TEST_USER_ID = "test-user-123"
TEST_TOKEN = "test-token-xyz"

class MockQueryBuilder:
    def __init__(self, data=None, count=None):
        self._data = data or []
        self._count = count

    def select(self, *args, **kwargs): return self
    def insert(self, *args, **kwargs): return self
    def update(self, *args, **kwargs): return self
    def delete(self, *args, **kwargs): return self
    def eq(self, *args, **kwargs): return self
    def in_(self, *args, **kwargs): return self
    def gte(self, *args, **kwargs): return self
    def limit(self, *args, **kwargs): return self
    def rpc(self, *args, **kwargs): return self
    def execute(self):
        resp = MagicMock()
        resp.data = self._data
        resp.count = self._count
        return resp


@pytest.mark.asyncio
async def test_buscar_producto_exitoso(client, supabase_mock):
    """Happy path: search initiated successfully for an authenticated user within plan limits."""
    # Configure searches table mock to return valid search record for insertion and querying
    search_record = {
        "id": "search-uuid-123",
        "query": "zapatillas Nike Air Max 90",
        "user_id": TEST_USER_ID,
        "environment_id": None
    }

    def side_effect_table(table_name):
        if table_name == "searches":
            return MockQueryBuilder(data=[search_record])
        return MockQueryBuilder()

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    # Bypass auth and limits using FastAPI dependency overrides and mock
    app.dependency_overrides[get_optional_current_user] = lambda: TEST_USER_ID
    try:
        with patch("core.plans.check_monthly_search_limit") as mock_check_limit, \
             patch("tasks.celery_app.check_celery_available", return_value=False):

            response = client.post(
                "/api/v1/search",
                json={"query": "zapatillas Nike Air Max 90"},
                headers={"Authorization": f"Bearer {TEST_TOKEN}"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 202
    assert response.json()["search_id"] == "search-uuid-123"
    assert "Search initiated successfully" in response.json()["message"]
    mock_check_limit.assert_called_once()


@pytest.mark.asyncio
async def test_buscar_producto_sin_auth(client):
    """Error case: accessing a protected search endpoint without authentication returns 401."""
    response = client.get("/api/v1/search/environments")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_buscar_producto_limite_excedido(client, supabase_mock):
    """Error case: 402 if the user has reached their monthly search quota limit."""
    # Mock limit check to raise 402
    def raise_limit_exceeded(*args, **kwargs):
        raise HTTPException(
            status_code=402,
            detail={
                "detail": "Límite de búsquedas mensuales alcanzado",
                "code": "LIMIT_EXCEEDED"
            }
        )

    app.dependency_overrides[get_optional_current_user] = lambda: TEST_USER_ID
    try:
        with patch("core.plans.check_monthly_search_limit", side_effect=raise_limit_exceeded):
            response = client.post(
                "/api/v1/search",
                json={"query": "zapatillas Nike Air Max 90"},
                headers={"Authorization": f"Bearer {TEST_TOKEN}"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 402
    assert "Límite de búsquedas mensuales alcanzado" in str(response.json())


@pytest.mark.asyncio
async def test_buscar_producto_tiendas_excedidas(client, supabase_mock):
    """Error case: 403 if user requests an environment containing more stores than allowed by their plan."""
    # Mock user plan limits to Pro (max 20 stores)
    pro_plan_limits = {
        "name": "Pro",
        "searches_per_month": -1,
        "stores_per_search": 20,
        "can_choose_stores": True,
        "can_add_custom_stores": False,
        "projects_limit": 50
    }

    # Mock environment returns 25 stores (exceeding Pro limit of 20)
    mock_env_record = {
        "id": "env-uuid-999",
        "user_id": TEST_USER_ID,
        "name": "Heavy Environment",
        "store_domains": ["store1.cl"] * 21,  # 21 stores
        "custom_domains": ["custom1.cl", "custom2.cl", "custom3.cl", "custom4.cl"]  # 4 stores (total 25)
    }

    def side_effect_table(table_name):
        if table_name == "environments":
            return MockQueryBuilder(data=[mock_env_record])
        return MockQueryBuilder()

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    app.dependency_overrides[get_optional_current_user] = lambda: TEST_USER_ID
    try:
        with patch("core.plans.get_user_plan_and_limits", return_value=pro_plan_limits), \
             patch("core.plans.check_monthly_search_limit"):

            response = client.post(
                "/api/v1/search",
                json={
                    "query": "perfume Dior Sauvage",
                    "environment_id": "env-uuid-999"
                },
                headers={"Authorization": f"Bearer {TEST_TOKEN}"}
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert "LIMIT_EXCEEDED" in str(response.json())
