import os
from supabase import create_client

def main():
    # Load .env.local manually
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
        print("Error: NEXT_PUBLIC_SUPABASE_URL not found in environment or .env.local")
        return
        
    supabase = create_client(supabase_url, supabase_key)
    
    # 1. Total rows in products table
    prod_res = supabase.table("products").select("id", count="exact").limit(1).execute()
    total_products = prod_res.count if prod_res.count is not None else 0
    print(f"Total rows in products table: {total_products}")
    
    # 2. Total rows in search_results table
    results_res = supabase.table("search_results").select("id", count="exact").limit(1).execute()
    total_results = results_res.count if results_res.count is not None else 0
    print(f"Total rows in search_results table: {total_results}")

if __name__ == "__main__":
    main()
