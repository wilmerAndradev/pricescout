import os
from supabase import create_client

def main():
    env_path = "../web/.env.local"
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if line_str and not line_str.startswith("#") and "=" in line_str:
                    key, val = line_str.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")
                    
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not supabase_url:
        print("Error: NEXT_PUBLIC_SUPABASE_URL not found")
        return
        
    supabase = create_client(supabase_url, supabase_key)
    res = supabase.table("searches").select("*").order("created_at", desc=True).limit(10).execute()
    for r in res.data:
        search_id = r.get('id')
        res_count = supabase.table("search_results").select("id", count="exact").eq("search_id", search_id).limit(1).execute()
        count = res_count.count if res_count.count is not None else 0
        print(f"ID: {search_id} | Status: {r.get('status')} | Count: {count} | Query: {r.get('query')}")

if __name__ == "__main__":
    main()
