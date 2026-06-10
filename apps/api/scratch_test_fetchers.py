from scrapling.fetchers import DynamicFetcher, StealthyFetcher
import sys

store = sys.argv[1] if len(sys.argv) > 1 else "falabella.com"
url = sys.argv[2] if len(sys.argv) > 2 else "https://www.falabella.com/falabella-cl/search?Ntt=Sauvage+Dior+100ml"

print(f"Testing store: {store}")
print(f"URL: {url}")

print("\n--- Testing with DynamicFetcher ---")
try:
    page = DynamicFetcher.fetch(
        url,
        headless=True,
        disable_resources=True,
        google_search=True,
        locale="es-CL",
        timezone_id="America/Santiago",
        timeout=15000,
        wait=1000
    )
    print("DynamicFetcher status:", page.status)
    title = page.css("title").get() if page else "None"
    print("DynamicFetcher Title:", title)
except Exception as e:
    print("DynamicFetcher Error:", e)

print("\n--- Testing with StealthyFetcher ---")
try:
    page = StealthyFetcher.fetch(url, timeout=20000)
    print("StealthyFetcher status:", page.status)
    title = page.css("title").get() if page else "None"
    print("StealthyFetcher Title:", title)
except Exception as e:
    print("StealthyFetcher Error:", e)
