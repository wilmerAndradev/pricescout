import os
from supabase import create_client, Client
import asyncio

supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase: Client = create_client(supabase_url, supabase_key)

def get_token():
    res = supabase.auth.sign_in_with_password({
        "email": "test1@yopmail.com",
        "password": "Password123!"
    })
    print(res.session.access_token)

if __name__ == "__main__":
    get_token()
