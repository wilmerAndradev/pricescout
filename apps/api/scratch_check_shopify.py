import httpx
import json

urls = [
    "https://www.alarab.cl",
    "https://sairam.cl",
    "https://www.parisperfumes.cl"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

async def check_site(url):
    print(f"\n===========================================")
    print(f"Checking Shopify endpoints for: {url}")
    print(f"===========================================")
    
    endpoints = [
        "/products.json?limit=1",
        "/collections/all/products.json?limit=1"
    ]
    
    async with httpx.AsyncClient(headers=headers, timeout=15.0, follow_redirects=True) as client:
        # Check homepage headers and body keywords
        try:
            res = await client.get(url)
            print(f"Homepage Status: {res.status_code}")
            server = res.headers.get("Server", "Unknown")
            print(f"Server header: {server}")
            
            # Check for shopify keywords in homepage body
            body_text = res.text.lower()
            is_shopify = any(k in body_text for k in ["shopify.theme", "cdn.shopify.com", "shopify-payment-button"])
            print(f"Shopify signatures in homepage: {is_shopify}")
            
        except Exception as e:
            print(f"Error checking homepage: {e}")
            
        # Check endpoints
        for ep in endpoints:
            ep_url = url + ep
            try:
                res = await client.get(ep_url)
                print(f"  Endpoint: {ep} | Status: {res.status_code}")
                if res.status_code == 200:
                    try:
                        data = res.json()
                        if "products" in data:
                            print(f"  -> SUCCESS! Found shopify products JSON at {ep}")
                    except Exception:
                        print("  -> Responded 200 but not valid JSON")
            except Exception as e:
                print(f"  Endpoint error {ep}: {e}")

if __name__ == "__main__":
    import asyncio
    for u in urls:
        asyncio.run(check_site(u))
