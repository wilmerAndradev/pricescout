"""
scrapers/abcdin.py — Motor A · ABCDin.cl
SRS v3.0 §MA-04 — Tienda conocida, parser determinista con Scrapling DynamicFetcher.

ABCDin usa una tienda SFCC con microdata schema.org y clases .sale-price, .current-price.
"""

from scrapers.base import ScraplingBaseScraper


class AbcDinScraper(ScraplingBaseScraper):
    store_name = "ABCDin"

    WAIT_SELECTOR = "h1, .product-name, [itemprop='name']"
    WAIT_AFTER_LOAD = 2000

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.product-name",
            "h1[class*='title']",
            "[itemprop='name']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        price = self._first_price(page, [
            "[itemprop='price']",
            ".sale-price",
            ".current-price",
            ".product-price .price",
        ])

        # ── Precio original ───────────────────────────────────────────────────
        price_original = self._first_price(page, [
            ".regular-price del",
            ".was-price",
            "del",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            "img.primary-image",
            ".product-image img",
            "figure img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".out-of-stock, .agotado, [class*='OutOfStock']")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
