import logging
from datetime import datetime, timezone

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from scrapers.base import ScrapedProduct, ScraperBase
from scrapers.normalizer import normalize_product_title

logger = logging.getLogger(__name__)

def _is_retryable_status(exception):
    if isinstance(exception, httpx.HTTPStatusError):
        status_code = exception.response.status_code
        return status_code == 429 or (500 <= status_code < 600)
    return isinstance(exception, httpx.RequestError)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception(_is_retryable_status),
    reraise=True
)
async def _get_with_retry(client: httpx.AsyncClient, url: str):
    response = await client.get(url)
    response.raise_for_status()
    return response

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

                try:
                    response = await _get_with_retry(client, url)
                    response_data = response.json()
                except Exception as exc:
                    self.logger.error(f"Failed to fetch products on page {page} after retries. Error: {exc}")
                    break

                if not response_data or "products" not in response_data:
                    self.logger.error(f"Invalid response structure on page {page}")
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
