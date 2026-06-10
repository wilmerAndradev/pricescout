"""
scrapers/paris.py — Motor A · Paris.cl (Cencosud)
SRS v3.0 §MA-04 — Scraper con StealthyFetcher (Camoufox) para bypasear Cloudflare.

Paris usa SFCC (Salesforce Commerce Cloud) con schema.org microdata.
Los precios están en [itemprop='price'] con atributo content.
"""

from scrapers.stealth_base import StealthyBaseScraper


class ParisScraper(StealthyBaseScraper):
    store_name = "Paris"

    WAIT_SELECTOR = "h1, [itemprop='name'], .product-name"
    WAIT_AFTER_LOAD = 2000

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.product-name",
            "h1[itemprop='name']",
            "[itemprop='name']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        price = self._first_price(page, [
            "[itemprop='price']",
            ".price-container .price",
            ".product-price span",
            ".sales .value",
        ])

        # ── Precio original ───────────────────────────────────────────────────
        price_original = self._first_price(page, [
            ".list-price",
            "del",
            ".price-was",
            "[class*='price-original']",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            "img[itemprop='image']",
            "figure img",
            ".gallery img",
            "picture img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".out-of-stock, .no-disponible, .sin-stock")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
