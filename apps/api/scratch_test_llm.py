import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

# Load env variables from apps/web/.env.local manually
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web", ".env.local")
if os.path.exists(env_path):
    print(f"Loading env from {env_path}")
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

# Add apps/api to path
sys.path.append(os.path.dirname(__file__))

from tasks.llm_extractor import extract_with_llm

if __name__ == "__main__":
    # Test URL
    test_url = "https://www.parisperfumes.cl/"
    print(f"Testing LLM extraction for: {test_url}")
    
    # Also test classification
    from tasks.llm_extractor import infer_product_category
    try:
        cat = infer_product_category("perfume yara lattafa")
        print(f"\nCategory classification test: 'perfume yara lattafa' -> Category: {cat}")
    except Exception as e:
        print(f"Classification test failed: {e}")

    try:
        result = extract_with_llm(test_url)
        print("\n=== EXTRACTION RESULT ===")
        import pprint
        pprint.pprint(result)
        print("=========================")
    except Exception as e:
        print(f"\nExtraction failed: {e}")
        import traceback
        traceback.print_exc()
