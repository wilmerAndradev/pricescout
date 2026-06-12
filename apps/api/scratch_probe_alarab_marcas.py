import sys
import os
from scrapling.fetchers import StealthyFetcher
from bs4 import BeautifulSoup

url = "https://www.alarab.cl/marcas"
print(f"Fetching {url}...")
try:
    page = StealthyFetcher.fetch(url, timeout=30000)
    if page:
        html = page.html_content if hasattr(page, 'html_content') else (page.body if hasattr(page, 'body') else str(page))
        if isinstance(html, bytes):
            html = html.decode('utf-8', errors='ignore')
        print(f"Status: {page.status} | Length: {len(html)}")
        
        soup = BeautifulSoup(html, "html.parser")
        # List links that might point to collections or brands
        brand_links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True)[:40]
            # Capture links containing collections, brands or marcas
            if any(k in href.lower() for k in ["collection", "brand", "marca", "hombre", "mujer", "unisex"]):
                brand_links.add((href, text))
                
        print(f"Found {len(brand_links)} brand/category candidate links:")
        for href, text in sorted(brand_links):
            print(f"  - {href} | Text: {text}")
    else:
        print("Page is None")
except Exception as e:
    print(f"Error: {e}")
