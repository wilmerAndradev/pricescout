from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from core.plans import check_monthly_search_limit, get_user_plan_and_limits


# Helper class to mock fluent query calls
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
        # Create a mock response object
        resp = MagicMock()
        resp.data = self._data
        resp.count = self._count
        return resp


def test_get_user_plan_and_limits_gratis_fallback(supabase_mock):
    """Test that limits fall back to gratis details if database query fails or returns empty."""
    # Configure table mock to raise an error when select is called
    def side_effect_table(table_name):
        mock_builder = MagicMock()
        mock_builder.select.side_effect = Exception("DB error")
        return mock_builder

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    limits = get_user_plan_and_limits("user-123")
    assert limits["name"] == "Gratis"
    assert limits["searches_per_month"] == 10
    assert limits["stores_per_search"] == 5
    assert limits["projects_limit"] == 0


def test_get_user_plan_and_limits_db_starter(supabase_mock):
    """Test that limits are loaded correctly from database subscription when user is Starter."""
    # Configure table mock to return Starter details from DB
    def side_effect_table(table_name):
        if table_name == "subscriptions":
            return MockQueryBuilder(data=[{"plan_id": "starter"}])
        elif table_name == "plans":
            return MockQueryBuilder(data=[{
                "id": "starter",
                "name": "Starter Plan",
                "searches_per_month": 100,
                "stores_per_search": 10,
                "can_choose_stores": False,
                "projects_max": 5
            }])
        return MockQueryBuilder()

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    limits = get_user_plan_and_limits("user-123")
    assert limits["name"] == "Starter Plan"
    assert limits["searches_per_month"] == 100
    assert limits["stores_per_search"] == 10
    assert limits["projects_limit"] == 5


def test_usuario_gratis_no_puede_hacer_busqueda_11_guest(redis_mock):
    """Test that a guest/Gratis user is blocked after exceeding 10 searches in a month (11th search raises 402)."""
    # Redis returns 10 searches already done
    redis_mock.get.return_value = b"10"

    with pytest.raises(HTTPException) as excinfo:
        check_monthly_search_limit(user_id=None, ip_address="192.168.1.1")

    assert excinfo.value.status_code == 402
    assert "Límite de búsquedas mensuales alcanzado" in excinfo.value.detail["detail"]


def test_usuario_starter_puede_hacer_busqueda_100(supabase_mock):
    """Test that a Starter user can complete search number 100 (99 already registered in current month)."""
    # Configure table mock to return 99 searches
    def side_effect_table(table_name):
        if table_name == "subscriptions":
            return MockQueryBuilder(data=[{"plan_id": "starter"}])
        elif table_name == "searches":
            return MockQueryBuilder(count=99)
        return MockQueryBuilder()

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    # Should not raise exception
    check_monthly_search_limit(user_id="starter-user", ip_address="127.0.0.1")


def test_usuario_starter_no_puede_hacer_busqueda_101(supabase_mock):
    """Test that a Starter user is blocked when trying to make search number 101 (100 already registered)."""
    # Configure table mock to return 100 searches
    def side_effect_table(table_name):
        if table_name == "subscriptions":
            return MockQueryBuilder(data=[{"plan_id": "starter"}])
        elif table_name == "searches":
            return MockQueryBuilder(count=100)
        return MockQueryBuilder()

    supabase_mock.table = MagicMock(side_effect=side_effect_table)

    with pytest.raises(HTTPException) as excinfo:
        check_monthly_search_limit(user_id="starter-user", ip_address="127.0.0.1")

    assert excinfo.value.status_code == 402
    assert "Límite de búsquedas mensuales alcanzado" in excinfo.value.detail["detail"]


def test_usuario_gratis_max_5_tiendas(supabase_mock):
    """Verify that a Gratis plan specifies a maximum of 5 stores per search."""
    # Obtain limits for guest/gratis user
    # Configure table mock to return empty/gratis
    supabase_mock.table = MagicMock(return_value=MockQueryBuilder())
    limits = get_user_plan_and_limits(user_id=None)
    assert limits["stores_per_search"] == 5
