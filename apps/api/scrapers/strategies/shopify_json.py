import httpx
import asyncio
import logging
from datetime import datetime, timezone
from scrapers.base import ScraperBase, ScrapedProduct
from scrapers.normalizer import normalize_product_title

logger = logging.getLogger(__name__)

class ShopifyJsonScraper(ScraperBase):
    """
    Estrategia de sincronización para Shopify usando el endpoint público /products.json.
    """

    async def fetch_products(self) -> list[ScrapedProduct]:
        scraped_products = []
        page = 1
        limit = 250
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }
        
        async with httpx.AsyncClient(headers=headers, timeout=30.0, follow_redirects=True) as client:
            while True:
                url = f"{self.store_url}/products.json?limit={limit}&page={page}"
                self.logger.info(f"Fetching page {page} from {self.store_name}...")
                
                # Intentos de reintento con backoff exponencial
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
                        elif response.status_code == 429:
                            wait_time = attempt * 5
                            self.logger.warning(f"Rate limited (429). Attempt {attempt}/{retries}. Waiting {wait_time}s...")
                            await asyncio.sleep(wait_time)
                        elif 500 <= response.status_code < 600:
                            wait_time = attempt * 2
                            self.logger.warning(f"Server error ({response.status_code}). Attempt {attempt}/{retries}. Waiting {wait_time}s...")
                            await asyncio.sleep(wait_time)
                        else:
                            self.logger.error(f"HTTP error {response.status_code} fetching page {page}")
                            break
                    except httpx.RequestError as exc:
                        wait_time = attempt * 2
                        self.logger.warning(f"Request error: {exc}. Attempt {attempt}/{retries}. Waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                
                if not success or not response_data or "products" not in response_data:
                    self.logger.error(f"Failed to fetch products on page {page} after {retries} attempts.")
                    break
                    
                products = response_data["products"]
                if not products:
                    self.logger.info(f"No more products found. Finished at page {page - 1}.")
                    break
                    
                self.logger.info(f"Found {len(products)} products on page {page}.")
                
                # Procesar productos y variantes
                for prod in products:
                    prod_title = prod.get("title", "")
                    handle = prod.get("handle", "")
                    
                    if not prod_title or not handle:
                        continue
                        
                    variants = prod.get("variants", [])
                    images = prod.get("images", [])
                    
                    # Imagen por defecto del producto
                    default_image = images[0].get("src") if images else None
                    
                    for variant in variants:
                        variant_title = variant.get("title", "")
                        
                        # Combinar título si la variante es descriptiva (ej: volumen en ml)
                        if variant_title and variant_title.lower() not in ("default title", "default", "1", "standard"):
                            title = f"{prod_title} {variant_title}"
                        else:
                            title = prod_title
                            
                        # Construir URL con el id de variante específico
                        variant_id = variant.get("id")
                        product_url = f"{self.store_url}/products/{handle}"
                        if variant_id:
                            product_url += f"?variant={variant_id}"
                            
                        # Imagen de la variante o imagen por defecto
                        image_url = default_image
                        if variant.get("featured_image"):
                            image_url = variant["featured_image"].get("src") or default_image
                            
                        # Extraer precio y stock
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
                                variants=variants, # Guardar todas las variantes para debug
                                raw_data=prod,
                                scraped_at=datetime.now(timezone.utc),
                                sync_method="shopify_json"
                            )
                        )
                        
                # Incrementar página y aplicar retardo entre páginas
                page += 1
                await self._request_delay()
                
        return scraped_products
