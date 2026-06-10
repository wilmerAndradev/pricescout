"""
scrapers/mercadolibre.py — Motor A · MercadoLibre.cl
SRS v3.0 §MA-04 — Scraper con StealthyFetcher para bypasear Captcha.

MercadoLibre usa React SSR. Activa Captcha 302 con DynamicFetcher.
StealthyFetcher (Camoufox) lo bypasea exitosamente.
Los precios están en meta[itemprop='price'] y en spans .andes-money-amount.
"""

from scrapers.stealth_base import StealthyBaseScraper


class MercadoLibreScraper(StealthyBaseScraper):
    store_name = "MercadoLibre"

    # MercadoLibre carga rápido; esperamos el título h1
    WAIT_SELECTOR = "h1.ui-pdp-title, h1"
    WAIT_AFTER_LOAD = 1500

    def _extract(self, page) -> dict:
        # ── Nombre ────────────────────────────────────────────────────────────
        name = self._first_text(page, [
            "h1.ui-pdp-title",
            "h1[class*='title']",
            "h1",
        ]) or "Unknown Product"

        # ── Precio actual ─────────────────────────────────────────────────────
        # Primero probamos meta itemprop (más confiable), luego spans visuales
        price = self._first_price(page, [
            "meta[itemprop='price']",
            "div.ui-pdp-price__second-line span.andes-money-amount__fraction",
            "span.andes-money-amount__fraction",
            ".ui-pdp-price__main-price span.andes-money-amount__fraction",
        ])

        # ── Precio original (tachado) ─────────────────────────────────────────
        price_original = self._first_price(page, [
            "s.andes-money-amount__fraction",
            "s .andes-money-amount__fraction",
            ".ui-pdp-price__original-value .andes-money-amount__fraction",
        ]) or None

        # ── Imagen ────────────────────────────────────────────────────────────
        image_url = self._first_src(page, [
            "img.ui-pdp-image",
            "figure img",
            ".ui-pdp-gallery img",
        ])

        # ── Stock ─────────────────────────────────────────────────────────────
        # MercadoLibre muestra el mensaje de stock en .ui-pdp-stock-availability__title
        in_stock = True
        stock_els = page.css(".ui-pdp-stock-availability__title")
        if stock_els:
            stock_text = stock_els[0].get_all_text(strip=True).lower()
            in_stock = "sin stock" not in stock_text and "agotado" not in stock_text

        return {
            "name": name,
            "price": price,
            "price_original": price_original,
            "image_url": image_url,
            "in_stock": in_stock,
        }
