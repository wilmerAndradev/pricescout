import os

# Auto-cargar variables de entorno desde .env.local
# Busca en múltiples ubicaciones posibles para funcionar con uvicorn --reload
if not os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
    _candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "web", ".env.local"),
        r"c:\Users\SuperUsuario\Documents\PC - Trabajo\Proyectos\PriceScout_Chile\apps\web\.env.local",
    ]
    for _env_path in _candidates:
        _env_path = os.path.normpath(_env_path)
        if os.path.exists(_env_path):
            with open(_env_path, "r", encoding="utf-8") as _f:
                for _line in _f:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        _v = _v.strip().strip("'").strip('"')
                        os.environ.setdefault(_k.strip(), _v)
            break

import time
import logging

_logger = logging.getLogger(__name__)

def execute_with_retry(query_builder, max_retries=3, delay=0.15):
    """Executes a Supabase query with retries on Windows WinError 10035 (WSAEWOULDBLOCK) socket errors."""
    for attempt in range(max_retries):
        try:
            return query_builder.execute()
        except OSError as e:
            if getattr(e, "winerror", None) == 10035 or "10035" in str(e) or "WSAEWOULDBLOCK" in str(e):
                _logger.warning(f"Database query encountered WinError 10035. Retrying {attempt+1}/{max_retries}...")
                time.sleep(delay)
                continue
            raise
        except Exception as e:
            if "10035" in str(e) or "WSAEWOULDBLOCK" in str(e):
                _logger.warning(f"Database query encountered socket error. Retrying {attempt+1}/{max_retries}...")
                time.sleep(delay)
                continue
            raise
    return query_builder.execute()

from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client

security = HTTPBearer()

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise RuntimeError("Supabase URL and Key must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Receives the JWT token from the Authorization header,
    decodes it and verifies it using Supabase's getUser endpoint.
    """
    token = credentials.credentials
    
    try:
        # Verify token by asking Supabase auth
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
