"""
scrapers/ripley.py — Motor A · Ripley.cl
SRS v3.0 §MA-04 — Scraper con StealthyFetcher (Camoufox) para bypasear Cloudflare.

Ripley usa Hybris / SFCC con sus propias clases de precio .price-ripley y schema.org.
"""

from scrapers.stealth_base import StealthyBaseScraper


class RipleyScraper(StealthyBaseScraper):
    store_name = "Ripley"

    WAIT_SELECTOR = ".product-title, h1"
    WAIT_AFTER_LOAD = 2000

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.product-title",
            "h1[class*='title']",
            "[itemprop='name']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        price = self._first_price(page, [
            "[itemprop='price']",
            "li.price-ripley span",
            ".product-price .price",
            "[class*='normal-price'] span",
            "[class*='internet-price'] span",
        ])

        # ── Precio original ───────────────────────────────────────────────────
        price_original = self._first_price(page, [
            ".internet-price del",
            "del[class*='price']",
            ".price-was span",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            ".gallery-image img",
            ".product-images img",
            "picture img",
            "[class*='product-image'] img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        in_stock = not self._has_element(page, ".sold-out, .no-stock, [class*='out-of-stock']")

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
