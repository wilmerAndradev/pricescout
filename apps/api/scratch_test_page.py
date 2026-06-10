from scrapling.fetchers import StealthyFetcher
import sys

url = "https://alishaperfumes.cl/shop"
print(f"Fetching {url}...")
page = StealthyFetcher.fetch(url, timeout=30000)

print("\n--- Scrapling Response Inspection ---")
print("page object:", page)
print("page type:", type(page))
print("hasattr html:", hasattr(page, 'html'))
if hasattr(page, 'html'):
    print("page.html len:", len(page.html))
print("str(page) len:", len(str(page)))
print("hasattr text:", hasattr(page, 'text'))
if hasattr(page, 'text'):
    print("page.text len:", len(page.text))
print("hasattr body:", hasattr(page, 'body'))
if hasattr(page, 'body'):
    print("page.body len:", len(page.body))
print("hasattr content:", hasattr(page, 'content'))
if hasattr(page, 'content'):
    print("page.content len:", len(page.content))
