"""
scrapers/hites.py — Motor A · Hites.com
SRS v3.0 §MA-04 — Tienda conocida, parser determinista con Scrapling DynamicFetcher.

Hites usa SFCC con microdata schema.org. Precios en [itemprop='price'] y .price-sales.
"""

from scrapers.base import ScraplingBaseScraper


class HitesScraper(ScraplingBaseScraper):
    store_name = "Hites"

    WAIT_SELECTOR = "h1, [itemprop='name']"
    WAIT_AFTER_LOAD = 2000

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "[itemprop='name']",
            "h1.product-name",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        price = self._first_price(page, [
            "[itemprop='price']",
            ".sales .value",
            ".price-sales",
            ".product-price .price",
        ])

        # ── Precio original ───────────────────────────────────────────────────
        price_original = self._first_price(page, [
            ".price-standard del",
            ".list-price",
            "del",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            ".primary-image",
            ".product-image-container img",
            "figure img",
            "picture img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".out-of-stock, .sin-stock, [class*='OutOfStock']")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
