import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import auth
from auth import supabase, execute_with_retry

STORE_SLUGS = [
    "cosmetic",
    "comprarenchile",
    "elite-perfumes",
    "lodoro",
    "multimarcas",
    "mundo-aromas",
    "perfumisimo",
    "productos-de-lujo",
    "silk-perfumes",
    "yauras",
    "alarab",
    "alisha",
    "paris-perfumes",
    "sairam",
    "joy-perfumes"
]

def main():
    print("Querying exact product counts per store in database...")
    total = 0
    for slug in STORE_SLUGS:
        try:
            res = execute_with_retry(supabase.table("products").select("id", count="exact").eq("store_slug", slug).limit(1))
            count = res.count if res.count is not None else 0
            print(f"- {slug}: {count} products")
            total += count
        except Exception as e:
            print(f"Error checking {slug}: {e}")
    print(f"\nTotal products across all listed stores: {total}")

if __name__ == "__main__":
    main()
