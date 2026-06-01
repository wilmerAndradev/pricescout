"""
scrapers/base.py — Motor A · Base Scraper con Scrapling
SRS v3.0 §7 (Arquitectura Técnica) — Motor híbrido determinista.

Reemplaza el antiguo PlaywrightScraper (playwright-stealth) por Scrapling:
  - DynamicFetcher: para tiendas estándar (Falabella, Ripley, MercadoLibre, etc.)
  - StealthyFetcher: para tiendas con Cloudflare heavy (Lider) — ver scrapers/lider.py

Scrapling docs: https://scrapling.readthedocs.io/en/latest/
"""

from abc import ABC, abstractmethod
import logging
import re

logger = logging.getLogger(__name__)


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
