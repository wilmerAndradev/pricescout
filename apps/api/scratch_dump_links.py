from scrapling.fetchers import StealthyFetcher
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

urls = [
    "https://www.alarab.cl",
    "https://sairam.cl",
    "https://www.parisperfumes.cl"
]

def dump_all_links(url):
    print(f"\n===========================================")
    print(f"DUMPING ALL LINKS FOR: {url}")
    print(f"===========================================")
    try:
        page = StealthyFetcher.fetch(url, timeout=30000)
        if not page:
            print("Failed: page is None")
            return
        
        html = page.html if hasattr(page, 'html') else str(page)
        soup = BeautifulSoup(html, "html.parser")
        
        links = set()
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            text = a.get_text(strip=True)
            # Resolve relative URLs
            full_url = urljoin(url, href)
            parsed_href = urlparse(full_url)
            parsed_base = urlparse(url)
            
            # Keep only internal links
            if parsed_href.netloc == parsed_base.netloc or not parsed_href.netloc:
                path = parsed_href.path
                if path and path != "/":
                    links.add((path, text))
                    
        print(f"Found {len(links)} internal links:")
        for path, text in sorted(links):
            print(f"  - {path} | Text: '{text}'")
            
    except Exception as e:
        print(f"Error dumping links for {url}: {e}")

if __name__ == "__main__":
    for u in urls:
        dump_all_links(u)
