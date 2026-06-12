from scrapling.fetchers import StealthyFetcher

urls = [
    "https://www.alarab.cl",
    "https://sairam.cl"
]

def debug_html(url):
    print(f"\n===========================================")
    print(f"RAW HTML DEBUG FOR: {url}")
    print(f"===========================================")
    try:
        page = StealthyFetcher.fetch(url, timeout=30000)
        if not page:
            print("Failed: page is None")
            return
            
        html = page.html if hasattr(page, 'html') else str(page)
        print(f"HTML Length: {len(html)}")
        print("First 3000 characters:")
        print("-------------------------------------------")
        print(html[:3000])
        print("-------------------------------------------")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    for u in urls:
        debug_html(u)
