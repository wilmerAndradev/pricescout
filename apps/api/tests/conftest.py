import os
import sys
from unittest.mock import MagicMock

# 1. Set environment variables before any imports to prevent initialization failures
os.environ["NEXT_PUBLIC_SUPABASE_URL"] = "https://mocked.supabase.co"
os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "mocked-anon-key"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "mocked-service-key"
os.environ["SUPABASE_URL"] = "https://mocked.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "mocked-service-key"
os.environ["REDIS_URL"] = "redis://mocked-redis:6379/0"

# Add the apps/api directory to sys.path so tests can import modules directly
api_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if api_path not in sys.path:
    sys.path.insert(0, api_path)

# Mock redis module
import redis

mock_redis = MagicMock()
redis.from_url = MagicMock(return_value=mock_redis)

# Mock supabase module create_client BEFORE importing auth, core.plans, tasks.jobs
import supabase

mock_supabase_client = MagicMock()
supabase.create_client = MagicMock(return_value=mock_supabase_client)

# Define mock response structure for fluent query builder chain
class MockResponse:
    def __init__(self, data=None, count=None):
        self.data = data or []
        self.count = count

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
        return MockResponse(self._data, self._count)

# Attach query builder mock helper to mock client
mock_supabase_client.table = MagicMock(return_value=MockQueryBuilder())
mock_supabase_client.rpc = MagicMock(return_value=MockResponse())

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def clean_mocks():
    """Reset mocks between tests to avoid pollution."""
    mock_supabase_client.reset_mock()
    mock_redis.reset_mock()
    # Re-attach standard returns
    mock_supabase_client.table.return_value = MockQueryBuilder()
    mock_supabase_client.rpc.return_value = MockResponse()

@pytest.fixture
def supabase_mock():
    """Expose the mocked supabase client to individual tests."""
    return mock_supabase_client

@pytest.fixture
def redis_mock():
    """Expose the mocked Redis client to individual tests."""
    return mock_redis

@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    from main import app
    with TestClient(app) as c:
        yield c
