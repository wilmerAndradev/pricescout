"""
scrapers/pcfactory.py — Motor A · PC Factory
SRS v3.0 §MA-04 — Tienda conocida, parser determinista con Scrapling DynamicFetcher.

PC Factory usa una tienda custom con clases .precio-clp y .titulo-producto.
"""

from scrapers.base import ScraplingBaseScraper


class PCFactoryScraper(ScraplingBaseScraper):
    store_name = "PC Factory"

    WAIT_SELECTOR = "h1, .titulo-producto, [itemprop='name']"
    WAIT_AFTER_LOAD = 2000

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.titulo-producto",
            "h1[itemprop='name']",
            "[itemprop='name']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        price = self._first_price(page, [
            ".precio-clp",
            "[itemprop='price']",
            ".price-clp",
            ".precio-internet",
        ])

        # ── Precio original ───────────────────────────────────────────────────
        price_original = self._first_price(page, [
            ".precio-normal del",
            ".precio-tachado",
            "del",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            "img.product-image",
            "#product-image img",
            ".product-gallery img",
            "figure img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".sin-stock, .out-of-stock, [class*='SinStock']")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
