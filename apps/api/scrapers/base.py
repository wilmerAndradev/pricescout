from abc import ABC, abstractmethod
import logging
import re
import asyncio
import random
from datetime import datetime, timezone
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ScrapedProduct(BaseModel):
    store_slug: str           # Identificador único de la tienda (ej: "cosmetic")
    store_name: str           # Nombre legible (ej: "Cosmetic")
    store_url: str            # URL base de la tienda
    title: str                # Nombre del producto sin normalizar
    title_normalized: str     # Nombre normalizado (usar normalizer.py)
    price: float              # Precio en CLP
    currency: str = "CLP"     # Siempre "CLP"
    url: str                  # URL directa al producto
    image_url: str | None = None
    available: bool           # Si tiene stock
    variants: list[dict] = [] # Variantes (tallas, ml, etc.) si existen
    raw_data: dict            # JSON crudo original para debug
    scraped_at: datetime      # Timestamp UTC del momento del scrape
    sync_method: str          # "shopify_json" | "shopify_js" | "html_parser"


class SyncResult(BaseModel):
    store_slug: str
    total_scraped: int = 0
    added: int = 0
    updated: int = 0
    errors: list[str] = []
    success: bool = True


class ScraperBase(ABC):
    """
    Clase base abstracta para todos los scrapers de sincronización de catálogo.
    Soporta rate limiting y persistencia directa en Supabase.
    """

    def __init__(self, store_slug: str, store_name: str, store_url: str, catalog_url: str | None = None):
        self.store_slug = store_slug
        self.store_name = store_name
        self.store_url = store_url.rstrip("/")
        self.catalog_url = catalog_url
        self.logger = logging.getLogger(f"scraper.{self.store_slug}")
        
        # Cargar retardos de peticiones desde el entorno
        import os
        try:
            self.delay_min = float(os.environ.get("SCRAPER_REQUEST_DELAY_MIN", 1.0))
            self.delay_max = float(os.environ.get("SCRAPER_REQUEST_DELAY_MAX", 3.0))
        except ValueError:
            self.delay_min = 1.0
            self.delay_max = 3.0

    @abstractmethod
    async def fetch_products(self) -> list[ScrapedProduct]:
        """Fetch all products for the store using the assigned strategy."""
        pass

    async def _request_delay(self):
        """Espera aleatoria entre peticiones para evitar bloqueos y saturación."""
        delay = random.uniform(self.delay_min, self.delay_max)
        self.logger.debug(f"Esperando {delay:.2f} segundos antes de la siguiente petición...")
        await asyncio.sleep(delay)

    async def run(self, db_client=None) -> SyncResult:
        """
        Ejecuta la sincronización completa del catálogo de la tienda.
        Si se pasa un cliente de Supabase (db_client), guarda los resultados en DB.
        """
        self.logger.info(f"Iniciando sincronización para la tienda: {self.store_name} ({self.store_slug})")
        result = SyncResult(store_slug=self.store_slug)
        
        try:
            products = await self.fetch_products()
            result.total_scraped = len(products)
            
            if db_client:
                await self._save_to_db(db_client, products, result)
                
            self.logger.info(
                f"Sincronización completada para {self.store_name}. "
                f"Extraídos: {result.total_scraped} | Creados: {result.added} | "
                f"Actualizados: {result.updated} | Errores: {len(result.errors)}"
            )
        except Exception as e:
            self.logger.exception(f"Error crítico en ejecución de sync para {self.store_slug}: {e}")
            result.errors.append(str(e))
            result.success = False
            
        return result

    async def _save_to_db(self, db_client, products: list[ScrapedProduct], result: SyncResult):
        """
        Persiste los productos extraídos en la tabla 'products' y registra el historial.
        """
        self.logger.info(f"Guardando {len(products)} productos en la base de datos...")
        now_iso = datetime.now(timezone.utc).isoformat()
        from auth import execute_with_retry
        
        # Actualizar estado de sincronización de la tienda
        try:
            execute_with_retry(db_client.table("stores").upsert({
                "slug": self.store_slug,
                "name": self.store_name,
                "url": self.store_url,
                "sync_method": products[0].sync_method if products else "unknown",
                "catalog_url": self.catalog_url,
                "active": True,
                "last_sync_at": now_iso,
                "last_sync_products_count": len(products)
            }))
        except Exception as e:
            self.logger.error(f"No se pudo actualizar el estado de la tienda {self.store_slug}: {e}")
            result.errors.append(f"Store status update failed: {str(e)}")

        if not products:
            return

        from scrapers.normalizer import extract_volume_ml

        # Preparar todos los prod_data
        all_prod_data = []
        for prod in products:
            try:
                # Intentar obtener volumen de ml del producto
                volume_ml = prod.raw_data.get("volume_ml")
                if volume_ml is None and prod.variants:
                    volume_ml = prod.variants[0].get("volume_ml")
                if volume_ml is None:
                    volume_ml = extract_volume_ml(prod.title)

                prod_data = {
                    "store_slug": prod.store_slug,
                    "title": prod.title,
                    "title_normalized": prod.title_normalized,
                    "price": prod.price,
                    "currency": prod.currency,
                    "url": prod.url,
                    "image_url": prod.image_url,
                    "available": prod.available,
                    "volume_ml": volume_ml,
                    "variants": prod.variants,
                    "raw_data": prod.raw_data,
                    "sync_method": prod.sync_method,
                    "last_seen_at": now_iso
                }
                all_prod_data.append(prod_data)
            except Exception as e:
                self.logger.error(f"Error al preparar producto '{prod.title}': {e}")
                result.errors.append(f"Failed to prepare product '{prod.title}': {str(e)}")

        # Procesar en chunks de 100
        chunk_size = 100
        for i in range(0, len(all_prod_data), chunk_size):
            chunk = all_prod_data[i:i + chunk_size]
            try:
                # Intentar upsert bulk con reintentos para evitar WSAEWOULDBLOCK
                upsert_res = execute_with_retry(
                    db_client.table("products").upsert(
                        chunk,
                        on_conflict="store_slug,title_normalized"
                    )
                )

                if upsert_res.data:
                    history_records = []
                    for db_prod in upsert_res.data:
                        product_id = db_prod.get("id")
                        first_seen = db_prod.get("first_seen_at")
                        
                        # Calcular estadísticas (Creado vs Actualizado)
                        is_new = False
                        if first_seen:
                            try:
                                fs_dt = datetime.fromisoformat(first_seen.replace("Z", "+00:00"))
                                now_dt = datetime.now(timezone.utc)
                                if (now_dt - fs_dt).total_seconds() < 15:
                                    is_new = True
                            except Exception:
                                pass
                                
                        if is_new:
                            result.added += 1
                        else:
                            result.updated += 1
                            
                        # Preparar registro de historial
                        history_records.append({
                            "product_id": product_id,
                            "store_slug": db_prod.get("store_slug"),
                            "title_normalized": db_prod.get("title_normalized"),
                            "price": db_prod.get("price"),
                            "available": db_prod.get("available"),
                            "recorded_at": now_iso
                        })

                    if history_records:
                        try:
                            execute_with_retry(db_client.table("product_price_history").insert(history_records))
                        except Exception as e:
                            self.logger.error(f"Error al insertar historial bulk en chunk {i//chunk_size}: {e}")
                            result.errors.append(f"Bulk history insert failed for chunk: {str(e)}")

            except Exception as e:
                self.logger.warning(f"Upsert bulk fallido para chunk {i//chunk_size}, intentando individualmente. Error: {e}")
                # Fallback: procesar uno por uno los productos del chunk
                for prod_data in chunk:
                    try:
                        upsert_res = execute_with_retry(
                            db_client.table("products").upsert(
                                prod_data,
                                on_conflict="store_slug,title_normalized"
                            )
                        )
                        
                        if upsert_res.data:
                            db_prod = upsert_res.data[0]
                            product_id = db_prod.get("id")
                            first_seen = db_prod.get("first_seen_at")
                            
                            is_new = False
                            if first_seen:
                                try:
                                    fs_dt = datetime.fromisoformat(first_seen.replace("Z", "+00:00"))
                                    now_dt = datetime.now(timezone.utc)
                                    if (now_dt - fs_dt).total_seconds() < 15:
                                        is_new = True
                                except Exception:
                                    pass
                                    
                            if is_new:
                                result.added += 1
                            else:
                                result.updated += 1
                                
                            execute_with_retry(
                                db_client.table("product_price_history").insert({
                                    "product_id": product_id,
                                    "store_slug": prod_data["store_slug"],
                                    "title_normalized": prod_data["title_normalized"],
                                    "price": prod_data["price"],
                                    "available": prod_data["available"],
                                    "recorded_at": now_iso
                                })
                            )
                    except Exception as ex:
                        self.logger.error(f"Error de fallback al guardar producto '{prod_data.get('title')}': {ex}")
                        result.errors.append(f"Failed to save product (fallback) '{prod_data.get('title')}': {str(ex)}")

        # Desactivar productos que no fueron vistos en esta sincronización
        try:
            execute_with_retry(
                db_client.table("products")
                .update({"available": False})
                .eq("store_slug", self.store_slug)
                .lt("last_seen_at", now_iso)
            )
            self.logger.info("Productos obsoletos marcados como no disponibles.")
        except Exception as e:
            self.logger.error(f"Error al desactivar productos obsoletos para {self.store_slug}: {e}")
            result.errors.append(f"Failed to deactivate stale products: {str(e)}")




def _parse_clp(text: str) -> int:
    """Convierte '$249.990' o '249990' a entero 249990. Función global compartida."""
    cleaned = re.sub(r"[^\d]", "", str(text))
    try:
        return int(cleaned) if cleaned else 0
    except ValueError:
        return 0


class ScraplingBaseScraper(ABC):
    """
    Clase base para todos los scrapers deterministas del Motor A.
    Usa Scrapling DynamicFetcher (Chromium gestionado por Playwright + stealth patches).

    Para tiendas con Cloudflare (Lider), ver scrapers/lider.py que usa StealthyFetcher.
    """

    store_name: str = "Tienda"

    # Selectores de espera por defecto. Cada scraper puede sobrescribir.
    WAIT_SELECTOR: str = "h1, [itemprop='price'], [itemprop='name']"
    WAIT_STATE: str = "attached"
    WAIT_TIMEOUT: int = 30000       # ms
    WAIT_AFTER_LOAD: int = 2000     # ms extra post-carga para JS de precios

    def __init__(self, url: str):
        self.url = url

    def parse(self) -> dict:
        """
        Descarga la página con Scrapling DynamicFetcher y extrae datos del producto.

        Returns:
            dict con: name, price, price_original, discount_percent, image_url,
                      in_stock, source, extraction_method, confidence_score,
                      extraction_notes
        """
        try:
            from scrapling.fetchers import DynamicFetcher
        except ImportError as e:
            logger.error(f"[{self.store_name}] Scrapling no instalado: {e}")
            raise RuntimeError("SCRAPLING_NOT_INSTALLED") from e

        logger.info(f"[{self.store_name}] DynamicFetcher → {self.url}")

        try:
            page = DynamicFetcher.fetch(
                self.url,
                headless=True,
                disable_resources=True,     # Descarta fuentes/media → +25% velocidad
                google_search=True,         # Referer Google → más humano
                locale="es-CL",
                timezone_id="America/Santiago",
                timeout=self.WAIT_TIMEOUT,
                wait=self.WAIT_AFTER_LOAD,
                wait_selector=self.WAIT_SELECTOR,
                wait_selector_state=self.WAIT_STATE,
            )
        except Exception as e:
            logger.error(f"[{self.store_name}] DynamicFetcher falló: {e}")
            raise RuntimeError(f"SCRAPING_FETCH_ERROR: {e}") from e

        if page is None:
            raise RuntimeError(f"[{self.store_name}] Scrapling retornó None")

        # Delegamos extracción específica al scraper hijo
        result = self._extract(page)

        # Normalización de campos obligatorios (SRS MA-05)
        result["source"] = self.store_name
        result["extraction_method"] = "parser"
        result.setdefault("price_original", None)
        result.setdefault("discount_percent", self._calc_discount(
            result.get("price", 0), result.get("price_original")
        ))
        result.setdefault("in_stock", True)
        result.setdefault("confidence_score", None)
        result.setdefault("extraction_notes", None)

        logger.info(
            f"[{self.store_name}] ✅ name={result.get('name','')[:50]!r} | "
            f"price=${result.get('price', 0):,} | orig=${result.get('price_original')}"
        )
        return result

    @abstractmethod
    def _extract(self, page) -> dict:
        """
        Implementación específica de extracción para cada tienda.

        Args:
            page: Objeto Response de Scrapling (soporta .css(), .find(), .attrib, etc.)

        Returns:
            dict con: name, price, image_url.
            Opcionalmente: price_original, in_stock, discount_percent.
        """
        pass

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_clp(text: str) -> int:
        return _parse_clp(text)

    @staticmethod
    def _calc_discount(price: int, price_original) -> int | None:
        """Calcula % de descuento si hay precio original mayor al precio actual."""
        if price_original and price_original > price > 0:
            return round((1 - price / price_original) * 100)
        return None

    @staticmethod
    def _first_text(page, selectors: list[str]) -> str:
        """
        Itera selectores CSS y retorna el primer texto no vacío encontrado.
        Usa la API de Scrapling: page.css(selector) → lista de elementos.
        """
        for sel in selectors:
            elements = page.css(sel)
            if elements:
                text = elements[0].get_all_text(strip=True)
                if text and len(text) > 2:
                    return text
        return ""

    @staticmethod
    def _first_price(page, selectors: list[str]) -> int:
        """
        Itera selectores CSS y retorna el primer precio CLP válido (>0) encontrado.
        Intenta primero el atributo 'content' (schema.org), luego texto interior.
        """
        for sel in selectors:
            elements = page.css(sel)
            if elements:
                el = elements[0]
                raw = el.attrib.get("content", "") or el.get_all_text(strip=True)
                parsed = _parse_clp(raw)
                if parsed > 0:
                    return parsed
        return 0

    @staticmethod
    def _first_src(page, selectors: list[str]) -> str:
        """Itera selectores e imagen y retorna el primer src http válido."""
        for sel in selectors:
            elements = page.css(sel)
            if elements:
                src = elements[0].attrib.get("src", "")
                if src and src.startswith("http"):
                    return src
        return ""

    @staticmethod
    def _has_element(page, selector: str) -> bool:
        """True si existe al menos un elemento que coincida con el selector."""
        return len(page.css(selector)) > 0
