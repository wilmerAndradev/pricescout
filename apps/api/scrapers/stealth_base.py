"""
scrapers/stealth_base.py — Base Scraper con StealthyFetcher (Camoufox)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extiende ScraplingBaseScraper pero usa StealthyFetcher (Camoufox) en vez
de DynamicFetcher. Usado para tiendas con Cloudflare:
  - Falabella.com
  - MercadoLibre.cl
  - Ripley.cl
  - Paris.cl
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import logging

from scrapers.base import ScraplingBaseScraper

logger = logging.getLogger(__name__)


class StealthyBaseScraper(ScraplingBaseScraper):
    """
    Variante de ScraplingBaseScraper que usa StealthyFetcher (Camoufox).
    Bypasea Cloudflare, captchas y fingerprint detection.

    Hereda todos los helpers _first_text, _first_price, _first_src, _has_element
    pero sobreescribe parse() para usar StealthyFetcher.
    """

    # Tiempo de espera adicional (ms) post-carga — stealth tarda más en resolver JS
    WAIT_AFTER_LOAD: int = 3000
    WAIT_TIMEOUT: int = 60000   # 60s para dar tiempo al challenge de Cloudflare

    def parse(self) -> dict:
        """
        Descarga la página con StealthyFetcher y extrae datos del producto.
        Bypasea Cloudflare con Camoufox.
        """
        try:
            from scrapling.fetchers import StealthyFetcher
        except ImportError as e:
            logger.error(f"[{self.store_name}] Scrapling no instalado: {e}")
            raise RuntimeError("SCRAPLING_NOT_INSTALLED") from e

        logger.info(f"[{self.store_name}] StealthyFetcher (Camoufox) → {self.url}")

        try:
            page = StealthyFetcher.fetch(
                self.url,
                headless=True,
                solve_cloudflare=True,      # Resuelve challenges Cloudflare automáticamente
                block_webrtc=True,
                hide_canvas=True,
                google_search=True,         # Referer = Google → más humano
                disable_resources=True,     # Descarta fuentes/media → +25% velocidad
                locale="es-CL",
                timezone_id="America/Santiago",
                timeout=self.WAIT_TIMEOUT,
                wait=self.WAIT_AFTER_LOAD,
            )
        except Exception as e:
            logger.error(f"[{self.store_name}] StealthyFetcher falló: {e}")
            raise RuntimeError(f"SCRAPLING_FETCH_ERROR: {e}") from e

        if page is None:
            raise RuntimeError(f"[{self.store_name}] StealthyFetcher retornó None")

        # Detección de bloqueo residual
        page_html = str(page) if page else ""
        if any(s in page_html.lower() for s in [
            "robot or human", "access denied", "un paso más",
            "verify you are human", "sorry, you have been blocked"
        ]):
            logger.warning(f"[{self.store_name}] Contenido parece página de bloqueo")
            raise RuntimeError(f"BOT_BLOCKED: {self.store_name} retornó challenge residual")

        # Delegar extracción específica al scraper hijo
        result = self._extract(page)

        # Normalización de campos obligatorios (SRS MA-05)
        result["source"] = self.store_name
        result["extraction_method"] = "stealth_parser"
        result.setdefault("price_original", None)
        result.setdefault("discount_percent", self._calc_discount(
            result.get("price", 0), result.get("price_original")
        ))
        result.setdefault("in_stock", True)
        result.setdefault("confidence_score", None)
        result.setdefault("extraction_notes", None)

        logger.info(
            f"[{self.store_name}] ✅ name={result.get('name', '')[:50]!r} | "
            f"price=${result.get('price', 0):,} | orig=${result.get('price_original')}"
        )
        return result
