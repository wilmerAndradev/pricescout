"""
tasks/scraping_router.py — Motor Híbrido · SRS v3.0 §MA-04
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motor A (determinista):  dominio ∈ KNOWN_STORES → scraper Scrapling específico
Motor B (LLM universal): dominio ∉ KNOWN_STORES → Gemini 2.5 Flash-Lite + Groq

Arquitectura de scrapers:
  - Tiendas estándar   → DynamicFetcher (ScraplingBaseScraper.parse())
  - Lider.cl           → StealthyFetcher (LiderScraper.scrape()) ← anti-Cloudflare

SRS §MA-05: Cada resultado incluye extraction_method, confidence_score, source.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import os
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ─── Tiendas conocidas (Motor A) ─────────────────────────────────────────────
# Fuente de verdad: también usado por el frontend (MA-03) para mostrar favicons.

_DEFAULT_KNOWN = (
    "mercadolibre.cl,falabella.com,ripley.cl,paris.cl,"
    "lider.cl,pcfactory.cl,abcdin.cl,hites.cl"
)


def _get_known_domains() -> set:
    raw = os.environ.get("KNOWN_STORES", _DEFAULT_KNOWN)
    return {d.strip().lower() for d in raw.split(",") if d.strip()}


def _extract_domain(url: str) -> str:
    """'https://www.falabella.com/producto/...' → 'falabella.com'"""
    try:
        host = urlparse(url).hostname or ""
        parts = host.lower().split(".")
        return ".".join(parts[-2:]) if len(parts) >= 2 else host
    except Exception:
        return ""


def _get_scraper_for_domain(domain: str, url: str):
    """
    Retorna un objeto scraper listo para usar.
    - Tiendas estándar: instancia de ScraplingBaseScraper (llama .parse())
    - Lider: objeto con método .scrape(url) estático (StealthyFetcher)
    - None si el dominio no tiene implementación todavía.
    """
    from scrapers.mercadolibre import MercadoLibreScraper
    from scrapers.falabella import FalabellaScraper
    from scrapers.ripley import RipleyScraper
    from scrapers.paris import ParisScraper
    from scrapers.lider import LiderScraper
    from scrapers.pcfactory import PCFactoryScraper
    from scrapers.abcdin import AbcDinScraper
    from scrapers.hites import HitesScraper

    PARSER_REGISTRY = {
        "mercadolibre.cl": MercadoLibreScraper,
        "falabella.com":   FalabellaScraper,
        "ripley.cl":       RipleyScraper,
        "paris.cl":        ParisScraper,
        "lider.cl":        LiderScraper,        # usa StealthyFetcher — interfaz diferente
        "pcfactory.cl":    PCFactoryScraper,
        "abcdin.cl":       AbcDinScraper,
        "hites.cl":        HitesScraper,
    }

    klass = PARSER_REGISTRY.get(domain)
    if klass is None:
        return None

    # Lider tiene interfaz estática scrape(url) — no necesita instanciación con url
    if domain == "lider.cl":
        return klass   # retornamos la clase, no una instancia

    return klass(url)  # instancia con url para scrapers estándar


def route_and_extract(url: str, supabase_client=None) -> dict:
    """
    Función central de routing. SRS §MA-04.

    Retorna dict normalizado listo para insertar en price_history (SRS §7.2).
    Lanza RuntimeError en fallo duro (no recuperable sin LLM fallback).
    """
    domain = _extract_domain(url)
    known_domains = _get_known_domains()

    if domain in known_domains:
        # ── Motor A: Parser determinista (Scrapling) ──────────────────────────
        logger.info(f"[Router] '{domain}' → Motor A (Scrapling)")
        scraper = _get_scraper_for_domain(domain, url)

        if scraper is None:
            # Dominio en whitelist pero sin parser implementado → LLM fallback
            logger.warning(f"[Router] Sin parser para '{domain}' → Motor B (LLM)")
            return _llm_fallback(url, domain, supabase_client)

        try:
            # Lider usa interfaz estática .scrape(url)
            if domain == "lider.cl":
                result = scraper.scrape(url)
            else:
                # Todos los demás usan .parse() de ScraplingBaseScraper
                result = scraper.parse()

        except RuntimeError as e:
            err_msg = str(e)

            # BOT_BLOCKED o SCRAPLING_FETCH_ERROR → intentamos LLM como rescate
            if any(k in err_msg for k in ("BOT_BLOCKED", "SCRAPLING_FETCH_ERROR", "SCRAPING_FETCH_ERROR")):
                logger.warning(
                    f"[Router] Motor A falló en '{domain}' ({err_msg[:80]}…) → Motor B (LLM)"
                )
                return _llm_fallback(url, domain, supabase_client)
            raise

        # Asegurar todos los campos del SRS §MA-05
        result.setdefault("extraction_method", "parser")
        result.setdefault("confidence_score", None)
        result.setdefault("extraction_notes", None)
        result.setdefault("discount_percent", None)
        result.setdefault("price_original", None)
        return result

    else:
        # ── Motor B: LLM Universal (Gemini 2.5 Flash-Lite + Groq fallback) ────
        logger.info(f"[Router] '{domain}' → Motor B (LLM Universal)")
        return _llm_fallback(url, domain, supabase_client)


def _llm_fallback(url: str, domain: str, supabase_client=None) -> dict:
    """Invoca el extractor LLM y normaliza el campo source."""
    from tasks.llm_extractor import extract_with_llm
    result = extract_with_llm(url, supabase_client=supabase_client)
    # Normalizar source: si es genérico "Tienda" usar nombre del dominio
    if result.get("source") in ("Tienda", None, ""):
        result["source"] = domain.split(".")[0].capitalize()
    return result
