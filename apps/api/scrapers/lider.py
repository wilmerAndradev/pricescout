"""
Lider.cl scraper — Motor A (deterministic) con Scrapling StealthyFetcher.

Lider (Walmart Chile) usa Cloudflare Turnstile. El StealthyFetcher de Scrapling
lo bypassa automáticamente con `solve_cloudflare=True`, eliminando la necesidad
de la guardia BOT_BLOCKED que usábamos antes.

API usada (según docs oficiales):
  https://scrapling.readthedocs.io/en/latest/fetching/stealthy.html

Selectores basados en DOM inspection 2026-05-02 (Tachyons utility classes).
"""

import logging
import re

logger = logging.getLogger(__name__)


def _parse_clp(raw: str) -> int:
    """Convierte un string de precio CLP como '$1.299.990' → 1299990."""
    if not raw:
        return 0
    digits = re.sub(r"[^\d]", "", raw)
    return int(digits) if digits else 0


class LiderScraper:
    """Scraper para lider.cl usando Scrapling StealthyFetcher (anti-Cloudflare)."""

    store_name = "Lider"

    def parse(self) -> dict:
        raise NotImplementedError("Use scrape(url) instead.")

    @classmethod
    def scrape(cls, url: str) -> dict:
        """
        Descarga la página con StealthyFetcher y extrae los datos del producto.

        Args:
            url: URL del producto en lider.cl

        Returns:
            dict con keys: name, price, price_original, image_url, in_stock, source
        """
        try:
            from scrapling.fetchers import StealthyFetcher
        except ImportError as e:
            logger.error(f"[Lider] Scrapling no está instalado: {e}")
            raise RuntimeError("SCRAPLING_NOT_INSTALLED") from e

        logger.info(f"[Lider] Fetching con StealthyFetcher (anti-Cloudflare): {url}")

        # ── Fetch con bypass de Cloudflare ──────────────────────────────────────
        # timeout=60000ms es el mínimo recomendado por la doc para solve_cloudflare
        # wait_selector: esperamos el h1 o precio antes de extraer
        # disable_resources: acelera ~25% descartando fuentes/imágenes/media
        try:
            page = StealthyFetcher.fetch(
                url,
                headless=True,
                solve_cloudflare=True,
                block_webrtc=True,
                hide_canvas=True,
                google_search=True,            # Referer = google.com (parece más humano)
                disable_resources=True,        # Descarta fuentes, imágenes, media → más rápido
                timeout=60000,                 # 60s mínimo cuando solve_cloudflare=True
                wait=2000,                     # 2s extra para JS de precios
                wait_selector="h1, [class*='price'], [itemprop='price']",
                wait_selector_state="attached",
                locale="es-CL",
                timezone_id="America/Santiago",
            )
        except Exception as e:
            logger.error(f"[Lider] StealthyFetcher falló: {e}")
            raise RuntimeError(f"SCRAPLING_FETCH_ERROR: {e}") from e

        # ── Validación: detección de bloqueo residual ────────────────────────────
        # Aunque solve_cloudflare resuelva el challenge, validamos el resultado
        page_html = str(page) if page else ""
        if "robot or human" in page_html.lower() or "access denied" in page_html.lower():
            logger.warning("[Lider] Contenido parece página de bloqueo, abortando.")
            raise RuntimeError("BOT_BLOCKED: Lider retornó página de bloqueo")

        # ── Extracción de datos ──────────────────────────────────────────────────
        name = "Unknown Product"
        price = 0
        price_original = None
        image_url = ""

        # — Nombre del producto —
        name_selectors = [
            "h1",
            "[class*='ProductTitle']",
            "[class*='ProductName']",
            "[class*='product-title']",
            "h1.prod-ProductTitle",
            "h2[class*='title']",
            "[data-testid*='title']",
            "[data-testid*='product-name']",
        ]
        for sel in name_selectors:
            elements = page.css(sel)
            if elements:
                text = elements[0].get_all_text(strip=True)
                if text and len(text) > 3:
                    name = text
                    break

        # — Precio actual (Tachyons: "b lh-copy dark-gray f1 mr2") —
        price_selectors = [
            "span.b.lh-copy.dark-gray",
            "[class*='f1 mr2']",
            "[class*='dark-gray f1']",
            "[itemprop='price']",
            ".price-characteristic",
            "[class*='Price__current']",
            "[class*='price-current']",
        ]
        for sel in price_selectors:
            elements = page.css(sel)
            if elements:
                el = elements[0]
                # Intentar primero el atributo content (schema.org) luego text
                raw = el.attrib.get("content", "") or el.get_all_text(strip=True)
                parsed = _parse_clp(raw)
                if parsed > 0:
                    price = parsed
                    break

        # — Precio tachado / original —
        strike_selectors = [
            "span.strike",
            "[class*='strike']",
            "[class*='nearer-mid-gray strike']",
            ".price-old",
            "[class*='price-original']",
            "[class*='Price__original']",
        ]
        for sel in strike_selectors:
            elements = page.css(sel)
            if elements:
                raw = elements[0].get_all_text(strip=True)
                parsed = _parse_clp(raw)
                if parsed > 0 and parsed != price:
                    price_original = parsed
                    break

        # — Imagen —
        image_selectors = [
            "img[class*='Image_image']",
            "img.prod-hero-image-carousel-img",
            "img[class*='hero']",
            "img[class*='product']",
            "picture img",
            "img[alt][src*='lider']",
            "img[alt][src*='walmart']",
        ]
        for sel in image_selectors:
            elements = page.css(sel)
            if elements:
                src = elements[0].attrib.get("src", "")
                if src and src.startswith("http"):
                    image_url = src
                    break

        # — Stock —
        oos_elements = page.css(
            ".prod-OOSText, .out-of-stock, [class*='OutOfStock'], [class*='sin-stock']"
        )
        in_stock = len(oos_elements) == 0

        logger.info(
            f"[Lider] ✅ name={name[:50]!r} | price=${price:,} | original=${price_original}"
        )

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
            "source": "Lider",
        }
