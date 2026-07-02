"""
scrapers/store_search.py — PriceScout v4.0 Store Search Engine
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Responsible for executing the search query inside each target store,
parsing the search results page using Scrapling, and identifying the
most relevant first product URL.

Todos los dominios principales usan StealthyFetcher para bypasear
Cloudflare y captchas. DynamicFetcher solo para tiendas sin protección.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import logging
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Perfiles de búsqueda por tienda ─────────────────────────────────────────
# url_contains: alguno de estos strings debe estar en el href del producto
# url_excludes: si alguno de estos está en el href, se descarta
# base_domain:  dominio base para construir URLs absolutas (si difiere del store_domain)
# use_stealth:  True = StealthyFetcher (Camoufox anti-bot), False = DynamicFetcher

STORE_SEARCH_PROFILES = {
    "mercadolibre.cl": {
        # La búsqueda va en listado.mercadolibre.cl
        "search_pattern": "https://listado.mercadolibre.cl/{query}",
        # Confirmado: Los hrefs son www.mercadolibre.cl/.../p/MLCxxxxxx
        "selectors": [
            "a.ui-search-link",
            "a.ui-search-item__group__element",
            ".ui-search-result__content-wrapper a",
            "ol.ui-search-layout li a",
            ".ui-search-result a",
        ],
        # Patrón real confirmado: debe contener el ID del producto /p/MLC o /MLC-
        "url_contains": ["/p/MLC", "/MLC-"],
        "url_excludes": ["listado.mercadolibre.cl", "click1.mercadolibre", "brand_ads", "#", "javascript:", "mclics", "accesibilidad", "feedback"],
        "base_domain": "www.mercadolibre.cl",
        "use_stealth": True,
        # MercadoLibre SPA: necesita JS completo + 8s para React hydration
        "stealth_opts": {
            "disable_resources": False,
            "wait": 8000,    # Confirmado experimentalmente: 8s necesario
            "solve_cloudflare": False,
        },
    },
    "falabella.com": {
        "search_pattern": "https://www.falabella.com/falabella-cl/search?Ntt={query}",
        "selectors": [
            "a.pod-link",
            "a[href*='/falabella-cl/product/']",
            "[class*='grid-pod'] a",
            ".search-results-4-grid a",
            "div[class*='pod-'] a",
        ],
        "url_contains": ["/falabella-cl/product/"],
        "url_excludes": ["javascript:", "#", "/category/"],
        "base_domain": "www.falabella.com",
        # StealthyFetcher para bypasear Cloudflare 403
        "use_stealth": True,
    },
    "ripley.cl": {
        # URL confirmada: www.ripley.cl/search?text= (simple.ripley.cl devuelve 404)
        # HTTP 522 = error de red/timeout de servidor (no Cloudflare)
        # Sin solve_cloudflare (genera "No Cloudflare challenge found" y falla)
        "search_pattern": "https://www.ripley.cl/search?text={query}",
        "selectors": [
            "a[href*='/producto/']",
            ".catalog-product-item a",
            ".product-card a",
            "[class*='catalog'] a",
        ],
        "url_contains": ["/producto/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.ripley.cl",
        "use_stealth": True,
        "stealth_opts": {
            "disable_resources": False,
            "wait": 5000,
            "solve_cloudflare": False,   # 522 es timeout de red, no Cloudflare
        },
    },
    "paris.cl": {
        "search_pattern": "https://www.paris.cl/search?text={query}",
        "selectors": [
            # Paris SPA/SFCC — buscar todos los anchors de productos (terminan en .html o contienen el formato clásico de pdp)
            "a[href*='.html']",
            ".product-tile a",
            ".product-grid-item a",
            ".search-result-items a",
            ".product-image a",
            "a.link-to-pdp"
        ],
        # En Paris.cl las URLs de productos suelen terminar en .html
        "url_contains": [".html"],
        # Excluir banners Cencosud, portales corporativos, categorías y estáticos
        "url_excludes": [
            "tarjetacencosud", "cencosud", "/avance/", "javascript:", "#",
            "sostenibilidad", "gift-card", "informaciones-legales", "mi-cuenta",
            "mis-compras", "seguimiento", "ayuda", "/jumbo-prime", "/easy",
            "/jumbo", "/santaisabel", "/spidchile", "vestua-paris.html",
            "snkr-wash.html", "noviosparis"
        ],
        "base_domain": "www.paris.cl",
        "use_stealth": True,
        "stealth_opts": {
            "disable_resources": False,
            "wait": 6000,
            # Sin wait_selector — Paris puede no tener .product-tile en DOM
            "solve_cloudflare": False,
        },
    },
    "lider.cl": {
        "search_pattern": "https://www.lider.cl/supermercado/search?query={query}",
        "selectors": [
            ".product-card_card__link",
            "a[href*='/product/']",
            "a[class*='product-card']",
        ],
        "url_contains": ["/product/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.lider.cl",
        "use_stealth": True,
    },
    "pcfactory.cl": {
        "search_pattern": "https://www.pcfactory.cl/?texto={query}",
        "selectors": [
            ".product a",
            "a[href*='/producto/']",
            ".product-card a",
        ],
        "url_contains": ["/producto/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.pcfactory.cl",
        "use_stealth": False,
    },
    "hites.cl": {
        "search_pattern": "https://www.hites.com/search?q={query}",
        "selectors": [
            ".product-image a",
            "a[href*='/p/']",
            "a[class*='product-link']",
        ],
        "url_contains": ["/p/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.hites.com",
        "use_stealth": False,
    },
    "abcdin.cl": {
        "search_pattern": "https://www.abcdin.cl/search?q={query}",
        "selectors": [
            "a.product-item-link",
            "a[href*='/p/']",
            ".product-image a",
        ],
        "url_contains": ["/p/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.abcdin.cl",
        "use_stealth": False,
    },
    "sodimac.cl": {
        "search_pattern": "https://sodimac.falabella.com/sodimac-cl/search?Ntt={query}",
        "selectors": [
            "a.pod-link",
            "a[href*='/sodimac-cl/product/']",
            ".search-results-4-grid a",
        ],
        "url_contains": ["/sodimac-cl/product/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "sodimac.falabella.com",
        "use_stealth": False,
    },
    "eliteperfumes.cl": {
        "search_pattern": "https://www.eliteperfumes.cl/search?q={query}",
        "selectors": [
            "a[href*='/products/']",
            ".product-card a",
            ".grid-view-item__link",
        ],
        "url_contains": ["/products/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.eliteperfumes.cl",
        "use_stealth": False,
    },
    "spdigital.cl": {
        "search_pattern": "https://www.spdigital.cl/search?q={query}",
        "selectors": [
            "a[href*='/products/']",
            "a[href*='/product/']",
            ".product-card a",
            ".item-product a",
        ],
        "url_contains": ["/products/", "/product/"],
        "url_excludes": ["javascript:", "#"],
        "base_domain": "www.spdigital.cl",
        "use_stealth": False,
    },
}


def clean_url(href: str, base_domain: str) -> str:
    """
    Normaliza un href relativo en URL absoluta.
    - '//cdn...' → 'https://cdn...'
    - '/producto/...' → 'https://{base_domain}/producto/...'
    - 'https://...' → sin cambios
    """
    if not href:
        return ""
    href = href.strip()
    if href.startswith("//"):
        return f"https:{href}"
    elif href.startswith("/"):
        return f"https://{base_domain}{href}"
    return href


def search_store_product_url(store_domain: str, query: str) -> Optional[str]:
    """
    Busca un producto en la tienda indicada y retorna la URL del primer resultado relevante.

    Args:
        store_domain: clave del perfil (ej: "mercadolibre.cl")
        query: nombre del producto a buscar

    Returns:
        URL absoluta del producto, o None si no se encontró.
    """
    profile = STORE_SEARCH_PROFILES.get(store_domain)
    if not profile:
        logger.warning(f"[Search Engine] Sin perfil de búsqueda para: {store_domain}")
        return None

    query_encoded = urllib.parse.quote_plus(query)
    search_url = profile["search_pattern"].format(query=query_encoded)
    base_domain = profile.get("base_domain", f"www.{store_domain}")
    url_excludes = profile.get("url_excludes", [])

    logger.info(f"[Search Engine] Buscando '{query}' en {store_domain} → {search_url}")

    try:
        # ── Selección del fetcher ──────────────────────────────────────────────
        if profile.get("use_stealth", False):
            from scrapling.fetchers import StealthyFetcher
            logger.info(f"[Search Engine] StealthyFetcher (Camoufox) para {store_domain}")

            # Opciones base — se pueden sobreescribir por perfil con stealth_opts
            stealth_defaults = {
                "headless": True,
                "block_webrtc": True,
                "google_search": True,
                "disable_resources": True,   # Por defecto ahorra ancho de banda
                "locale": "es-CL",
                "timezone_id": "America/Santiago",
                "timeout": 45000,
                "wait": 3000,
                "solve_cloudflare": False,
            }
            # Merge con opciones específicas del perfil (sobreescriben las base)
            profile_opts = profile.get("stealth_opts", {})
            fetch_opts = {**stealth_defaults, **profile_opts}

            page = StealthyFetcher.fetch(search_url, **fetch_opts)
        else:
            from scrapling.fetchers import DynamicFetcher
            logger.info(f"[Search Engine] DynamicFetcher para {store_domain}")
            page = DynamicFetcher.fetch(
                search_url,
                headless=True,
                disable_resources=True,
                google_search=True,
                locale="es-CL",
                timezone_id="America/Santiago",
                timeout=25000,
                wait=1500,
            )

        if page is None:
            logger.error(f"[Search Engine] Fetch retornó None para {store_domain}")
            return None

        # ── Paso 1: Selectores específicos del perfil ─────────────────────────
        for selector in profile["selectors"]:
            elements = page.css(selector)
            for el in elements:
                href = el.attrib.get("href", "")
                if not href:
                    continue
                full_url = clean_url(href, base_domain)
                # Validar: al menos un patrón incluido y ningún patrón excluido
                has_pattern = any(pat in full_url for pat in profile["url_contains"])
                is_excluded = any(exc in full_url for exc in url_excludes)
                if has_pattern and not is_excluded:
                    logger.info(
                        f"[Search Engine] ✅ Producto encontrado via selector '{selector}': {full_url}"
                    )
                    return full_url

        # ── Paso 2: Fallback — escaneo de todos los anchors ──────────────────
        logger.info(f"[Search Engine] Fallback: escaneando todos los anchors para {store_domain}")
        for anchor in page.css("a"):
            href = anchor.attrib.get("href", "")
            if not href:
                continue
            full_url = clean_url(href, base_domain)
            has_pattern = any(pat in full_url for pat in profile["url_contains"])
            is_excluded = any(exc in full_url for exc in url_excludes)
            if has_pattern and not is_excluded:
                logger.info(f"[Search Engine] ✅ Producto encontrado via fallback: {full_url}")
                return full_url

        logger.warning(f"[Search Engine] ❌ Sin resultados para '{query}' en {store_domain}")
        return None

    except Exception as e:
        logger.error(f"[Search Engine] Error en {store_domain}: {e}", exc_info=True)
        return None
