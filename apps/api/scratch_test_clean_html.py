import sys
import os
from scrapling.fetchers import StealthyFetcher
from bs4 import BeautifulSoup

url = "https://sairam.cl/perfumes-de-hombre"
print(f"Fetching {url}...")
try:
    page = StealthyFetcher.fetch(url, timeout=30000)
    html = page.html_content if hasattr(page, 'html_content') else (page.body if hasattr(page, 'body') else str(page))
    if isinstance(html, bytes):
        html = html.decode('utf-8', errors='ignore')
    print(f"Original HTML length: {len(html)}")
    
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav", "iframe", "aside"]):
        tag.decompose()
        
    for tag in soup.find_all(True):
        attrs = {}
        if tag.name == "a" and "href" in tag.attrs:
            attrs["href"] = tag.attrs["href"]
        elif tag.name == "img":
            src = tag.attrs.get("src") or tag.attrs.get("data-src") or tag.attrs.get("data-lazy-src")
            if src:
                attrs["src"] = src
        tag.attrs = attrs
        
    cleaned = str(soup)
    print(f"Cleaned HTML length: {len(cleaned)}")
    print("\n--- FIRST 2000 CHARACTERS OF CLEANED HTML ---")
    print(cleaned[:2000])
    print("\n--- LAST 2000 CHARACTERS OF CLEANED HTML ---")
    print(cleaned[-2000:])
except Exception as e:
    print(f"Error: {e}")
