import sys
import os
from scrapling.fetchers import StealthyFetcher
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

urls = [
    "https://www.alarab.cl",
    "https://sairam.cl",
    "https://www.parisperfumes.cl"
]

def find_links(url):
    print(f"\n===========================================")
    print(f"Fetching homepage: {url}")
    print(f"===========================================")
    try:
        page = StealthyFetcher.fetch(url, timeout=30000)
        if not page:
            print("Failed: page is None")
            return
        print(f"Status: {page.status}")
        
        # Get html and parse links
        html = page.html if hasattr(page, 'html') else str(page)
        soup = BeautifulSoup(html, "html.parser")
        
        links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True)[:30]
            # Resolve relative URLs
            full_url = urljoin(url, href)
            parsed_href = urlparse(full_url)
            parsed_base = urlparse(url)
            
            # Keep only internal links
            if parsed_href.netloc == parsed_base.netloc or not parsed_href.netloc:
                path = parsed_href.path
                if any(keyword in path.lower() or keyword in text.lower() for keyword in ["colec", "collec", "tienda", "shop", "catalogo", "product", "aromas", "perfume", "all"]):
                    links.add((path, text))
                    
        print(f"Found {len(links)} candidate links:")
        for path, text in sorted(links):
            print(f"  - Path: {path} | Text: {text}")
            
    except Exception as e:
        print(f"Error fetching {url}: {e}")

if __name__ == "__main__":
    for u in urls:
        find_links(u)
