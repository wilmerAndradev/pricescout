import httpx
import asyncio
import logging
import re
import json
from datetime import datetime, timezone
from scrapers.base import ScraperBase, ScrapedProduct
from scrapers.normalizer import normalize_product_title

logger = logging.getLogger(__name__)

class ShopifyJsScraper(ScraperBase):
    """
    Estrategia de sincronización alternativa para tiendas Shopify que bloquean /products.json.
    Intenta /collections/all/products.json y realiza un fallback extrayendo datos de scripts de la homepage.
    """

    async def fetch_products(self) -> list[ScrapedProduct]:
        scraped_products = []
        page = 1
        limit = 250
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        
        # Intentamos primero a través de /collections/all/products.json
        use_js_fallback = False
        
        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            while True:
                url = f"{self.store_url}/collections/all/products.json?limit={limit}&page={page}"
                self.logger.info(f"[ShopifyJS] Fetching collection page {page} from {self.store_name}...")
                
                retries = 3
                success = False
                response_data = None
                
                for attempt in range(1, retries + 1):
                    try:
                        response = await client.get(url)
                        if response.status_code == 200:
                            response_data = response.json()
                            success = True
                            break
                        elif response.status_code == 404:
                            self.logger.warning(f"Endpoint not found (404) for collections JSON. Triggering JS fallback.")
                            use_js_fallback = True
                            break
                        elif response.status_code == 403 or response.status_code == 401:
                            self.logger.warning(f"Access blocked ({response.status_code}). Triggering JS fallback.")
                            use_js_fallback = True
                            break
                        else:
                            wait_time = attempt * 2
                            await asyncio.sleep(wait_time)
                    except Exception as e:
                        self.logger.warning(f"Request failed: {e}. Waiting...")
                        await asyncio.sleep(attempt * 2)
                        
                if use_js_fallback:
                    break
                    
                if not success or not response_data or "products" not in response_data:
                    self.logger.warning("Failed to fetch collections JSON. Triggering JS fallback.")
                    use_js_fallback = True
                    break
                    
                products = response_data["products"]
                if not products:
                    self.logger.info(f"No more products in collection. Finished at page {page - 1}.")
                    break
                    
                self.logger.info(f"Found {len(products)} products on collection page {page}.")
                
                for prod in products:
                    prod_title = prod.get("title", "")
                    handle = prod.get("handle", "")
                    if not prod_title or not handle:
                        continue
                        
                    variants = prod.get("variants", [])
                    images = prod.get("images", [])
                    default_image = images[0].get("src") if images else None
                    
                    for variant in variants:
                        variant_title = variant.get("title", "")
                        if variant_title and variant_title.lower() not in ("default title", "default", "1", "standard"):
                            title = f"{prod_title} {variant_title}"
                        else:
                            title = prod_title
                            
                        variant_id = variant.get("id")
                        product_url = f"{self.store_url}/products/{handle}"
                        if variant_id:
                            product_url += f"?variant={variant_id}"
                            
                        image_url = default_image
                        if variant.get("featured_image"):
                            image_url = variant["featured_image"].get("src") or default_image
                            
                        try:
                            price = float(variant.get("price") or 0)
                        except (ValueError, TypeError):
                            price = 0.0
                            
                        available = bool(variant.get("available", True))
                        
                        scraped_products.append(
                            ScrapedProduct(
                                store_slug=self.store_slug,
                                store_name=self.store_name,
                                store_url=self.store_url,
                                title=title,
                                title_normalized=normalize_product_title(title),
                                price=price,
                                currency="CLP",
                                url=product_url,
                                image_url=image_url,
                                available=available,
                                variants=variants,
                                raw_data=prod,
                                scraped_at=datetime.now(timezone.utc),
                                sync_method="shopify_js"
                            )
                        )
                page += 1
                await self._request_delay()
                
        # Fallback de extracción de JS en el HTML
        if use_js_fallback or not scraped_products:
            self.logger.info("[ShopifyJS] Executing JS script extraction fallback...")
            try:
                from scrapling.fetchers import StealthyFetcher
            except ImportError:
                self.logger.error("Scrapling not installed, cannot run JS extraction fallback.")
                return scraped_products
                
            try:
                # Descargar la página principal o la página de catálogo de colecciones
                fallback_url = f"{self.store_url}/collections/all"
                self.logger.info(f"[ShopifyJS Fallback] Fetching {fallback_url} with Scrapling...")
                page_res = StealthyFetcher.fetch(
                    fallback_url,
                    headless=True,
                    timeout=45000,
                    wait=3000,
                )
                
                if not page_res:
                    self.logger.error("StealthyFetcher returned None for fallback page.")
                    return scraped_products
                    
                html = page_res.html if hasattr(page_res, 'html') else str(page_res)
                
                # Intentamos extraer del objeto JavaScript de Shopify
                # 1. Buscar JSON-LD (application/ld+json o application/json)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                
                # Buscamos JSON-LD de productos
                json_ld_scripts = soup.find_all("script", type="application/ld+json")
                for script in json_ld_scripts:
                    try:
                        data = json.loads(script.string or "")
                        # A veces viene como lista de productos o un único producto
                        items = []
                        if isinstance(data, list):
                            items = data
                        elif isinstance(data, dict):
                            if data.get("@type") == "ItemList" and "itemListElement" in data:
                                items = data["itemListElement"]
                            elif data.get("@type") == "Product":
                                items = [data]
                                
                        for item in items:
                            prod_data = item
                            # Si es ItemListElement, el producto real puede estar en 'item'
                            if "item" in item:
                                prod_data = item["item"]
                                
                            if not isinstance(prod_data, dict) or prod_data.get("@type") != "Product":
                                continue
                                
                            prod_title = prod_data.get("name", "")
                            prod_url = prod_data.get("url", "")
                            if not prod_title:
                                continue
                                
                            if prod_url and not prod_url.startswith("http"):
                                prod_url = self.store_url + prod_url
                                
                            image_url = prod_data.get("image")
                            if isinstance(image_url, list) and image_url:
                                image_url = image_url[0]
                            elif isinstance(image_url, dict):
                                image_url = image_url.get("url")
                                
                            # Offers (Precios y disponibilidad)
                            offers = prod_data.get("offers", {})
                            price = 0.0
                            available = True
                            if isinstance(offers, dict):
                                price = float(offers.get("price") or 0)
                                available = "InStock" in offers.get("availability", "InStock")
                            elif isinstance(offers, list) and offers:
                                price = float(offers[0].get("price") or 0)
                                available = "InStock" in offers[0].get("availability", "InStock")
                                
                            scraped_products.append(
                                ScrapedProduct(
                                    store_slug=self.store_slug,
                                    store_name=self.store_name,
                                    store_url=self.store_url,
                                    title=prod_title,
                                    title_normalized=normalize_product_title(prod_title),
                                    price=price,
                                    currency="CLP",
                                    url=prod_url or fallback_url,
                                    image_url=image_url,
                                    available=available,
                                    variants=[],
                                    raw_data=prod_data,
                                    scraped_at=datetime.now(timezone.utc),
                                    sync_method="shopify_js"
                                )
                            )
                    except Exception as e:
                        self.logger.warning(f"Error parsing JSON-LD script: {e}")
                        
                # 2. Si no hay JSON-LD, intentar regex sobre window.ShopifyAnalytics o variables de JS
                if not scraped_products:
                    # Buscamos variables como window.ShopifyAnalytics.meta o Shopify.products
                    meta_match = re.search(r"window\.ShopifyAnalytics\.meta\s*=\s*(\{.*?\});", html, re.DOTALL)
                    if meta_match:
                        try:
                            meta_data = json.loads(meta_match.group(1))
                            # A veces contiene información del producto actual o listado
                            products_meta = meta_data.get("products", [])
                            for pm in products_meta:
                                title = pm.get("name", "")
                                if not title:
                                    continue
                                price = float(pm.get("price") or 0)
                                id_prod = pm.get("id")
                                scraped_products.append(
                                    ScrapedProduct(
                                        store_slug=self.store_slug,
                                        store_name=self.store_name,
                                        store_url=self.store_url,
                                        title=title,
                                        title_normalized=normalize_product_title(title),
                                        price=price,
                                        currency="CLP",
                                        url=fallback_url,
                                        image_url=None,
                                        available=True,
                                        variants=[],
                                        raw_data=pm,
                                        scraped_at=datetime.now(timezone.utc),
                                        sync_method="shopify_js"
                                    )
                                )
                        except Exception as e:
                            self.logger.warning(f"Failed parsing window.ShopifyAnalytics: {e}")
                            
            except Exception as e:
                self.logger.error(f"Failed fallback extraction: {e}")
                
        return scraped_products
