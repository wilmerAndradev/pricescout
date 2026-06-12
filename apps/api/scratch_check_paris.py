import sys
import os
from scrapling.fetchers import StealthyFetcher

urls = [
    "https://www.parisperfumes.cl/marcas-1",
    "https://www.parisperfumes.cl/ofertas",
    "https://www.parisperfumes.cl/perfumes-1",
    "https://www.parisperfumes.cl/perfumes-1/colonias"
]

def check():
    for url in urls:
        print(f"Checking {url}...")
        try:
            page = StealthyFetcher.fetch(url, timeout=30000)
            if page:
                html = page.html_content if hasattr(page, 'html_content') else (page.body if hasattr(page, 'body') else str(page))
                if isinstance(html, bytes):
                    html = html.decode('utf-8', errors='ignore')
                print(f"  Status: {page.status} | Length: {len(html)}")
                lower_html = html.lower()
                has_products = "precio" in lower_html or "price" in lower_html or "clp" in lower_html or "$" in lower_html
                print(f"  Has products signatures: {has_products}")
            else:
                print("  Page is None")
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    check()
