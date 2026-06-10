import requests
import json
import time

url = "http://localhost:8000/api/v1/search"
payload = {
    "query": "Lattafa Yara Elixir EDP 100 ml"
}
headers = {
    "Content-Type": "application/json"
}

print("Initiating search via POST /api/v1/search...")
try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status Code: {response.status_code}")
    print(response.json())
    
    if response.status_code == 202:
        search_id = response.json()["search_id"]
        print(f"Search ID: {search_id}")
        
        # Poll results
        for i in range(10):
            print(f"Polling results (attempt {i+1})...")
            res_response = requests.get(f"{url}/{search_id}/results")
            res_data = res_response.json()
            print(f"Status: {res_data.get('status')}")
            print(f"Results found: {len(res_data.get('results', []))}")
            if res_data.get('status') == 'completed':
                print("Search completed!")
                # Print some sample results
                for r in res_data.get('results', [])[:5]:
                    print(f"- {r.get('store_name')}: {r.get('title')} | {r.get('price_clp')} CLP | {r.get('product_url')}")
                break
            time.sleep(2)
except Exception as e:
    print(f"Error: {e}")
