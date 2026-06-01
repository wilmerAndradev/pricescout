"""
scrapers/falabella.py — Motor A · Falabella.com
SRS v3.0 §MA-04 — Tienda conocida, parser determinista con Scrapling DynamicFetcher.

Falabella usa React con lazy-loading de precios. Sus clases CSS siguen el patrón
.copy12 (precio evento), .copy10 (precio normal), .copy8 (internet price).
"""

from scrapers.base import ScraplingBaseScraper


class FalabellaScraper(ScraplingBaseScraper):
    store_name = "Falabella"

    WAIT_SELECTOR = "h1, .product-name, [class*='ProductName'], [class*='product-name']"
    WAIT_AFTER_LOAD = 2500   # Falabella requiere más tiempo para renderizar precios

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.product-name",
            ".jsx-product-name",
            "[class*='product-name']",
            "[class*='ProductName']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        # Falabella muestra el precio de evento en .copy12 y el precio normal en .copy10
        # El atributo data-event-value tiene el precio limpio en algunos layouts
        price = self._first_price(page, [
            "[data-event-value]",
            "span.prices-0 span.copy4",
            ".copy12",
            ".copy10",
            ".copy8",
            "[itemprop='price']",
        ])

        # ── Precio original (tachado) ─────────────────────────────────────────
        price_original = self._first_price(page, [
            ".price-crossed-out",
            ".copy6",
            "del",
            "[class*='price-crossed']",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            "img.zoom-image-container",
            "figure img",
            ".gallery-zoom img",
            ".product-image img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".sold-out-msg, .out-of-stock")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
