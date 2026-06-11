import os
import sys
import asyncio

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import auth to load env variables first
import auth
from scrapers.tasks import _sync_store_async

# List of Shopify JSON stores to sync
SHOPIFY_STORES = [
    "comprarenchile",
    "elite-perfumes",
    "lodoro",
    "multimarcas",
    "mundo-aromas",
    "perfumisimo",
    "productos-de-lujo",
    "yauras"
]

async def sync_all():
    print("Starting sync of Shopify stores in database...")
    for slug in SHOPIFY_STORES:
        print(f"\n--- Syncing store: {slug} ---")
        try:
            res = await _sync_store_async(slug)
            print(f"Result for {slug}: {res}")
        except Exception as e:
            print(f"Error syncing {slug}: {e}")

if __name__ == "__main__":
    asyncio.run(sync_all())
