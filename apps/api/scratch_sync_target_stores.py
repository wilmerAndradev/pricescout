import os
import sys
import asyncio
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import auth to load env variables first
import auth
from auth import supabase, execute_with_retry
from scrapers.tasks import _sync_store_async

TARGET_STORES = [
    "elite-perfumes",
    "multimarcas",
    "joy-perfumes",
    "paris-perfumes",
    "sairam"
]

async def sync_all():
    print("=== STARTING TARGET STORES SYNC ===")
    start_total = time.time()
    
    # Let's count products before
    counts_before = {}
    for slug in TARGET_STORES:
        try:
            res = execute_with_retry(supabase.table("products").select("id", count="exact").eq("store_slug", slug).limit(1))
            counts_before[slug] = res.count if res.count is not None else 0
        except Exception as e:
            counts_before[slug] = f"Error: {e}"
            
    print("Initial product counts:")
    for slug, count in counts_before.items():
        print(f"  - {slug}: {count}")
        
    for slug in TARGET_STORES:
        print(f"\n--- Syncing store: {slug} ---")
        start_store = time.time()
        try:
            res = await _sync_store_async(slug)
            duration = time.time() - start_store
            print(f"Result for {slug} (took {duration:.2f}s): {res}")
            
            # Count after
            res_after = execute_with_retry(supabase.table("products").select("id", count="exact").eq("store_slug", slug).limit(1))
            count_after = res_after.count if res_after.count is not None else 0
            
            # Count active after
            res_active = execute_with_retry(supabase.table("products").select("id", count="exact").eq("store_slug", slug).eq("available", True).limit(1))
            count_active = res_active.count if res_active.count is not None else 0
            
            print(f"Post-sync check for {slug}:")
            print(f"  - Total products in DB: {count_after} (was {counts_before.get(slug)})")
            print(f"  - Active products: {count_active}")
        except Exception as e:
            print(f"Error syncing {slug}: {e}")
            
    print(f"\n=== TARGET STORES SYNC FINISHED (Total time: {time.time() - start_total:.2f}s) ===")

if __name__ == "__main__":
    asyncio.run(sync_all())
