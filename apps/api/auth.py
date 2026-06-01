import os
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
