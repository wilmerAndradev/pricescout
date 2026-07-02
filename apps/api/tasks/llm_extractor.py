"""
tasks/llm_extractor.py
Motor B · LLM Universal — SRS v3.0 §MA-04

Pipeline:
  1. Load page with Scrapling DynamicFetcher (stealth, domcontentloaded)
  2. Clean text with trafilatura (max 24.000 chars → ~6.000 tokens)
  3. Gemini 2.5 Flash-Lite  →  structured output (Pydantic + JSON mode)
  4. Fallback: Groq Llama 3.3  →  JSON mode
  5. Validate price CLP (100 – 100_000_000)
  6. Log call to Supabase llm_calls table
"""

import json
import logging
import os
import time
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ─── Pydantic schema (SRS §2.5) ─────────────────────────────────────────────

class ProductExtraction(BaseModel):
    product_name: str
    price_clp: int
    price_original_clp: Optional[int] = None
    discount_percent: Optional[int] = None
    image_url: Optional[str] = None
    in_stock: bool = True
    confidence: str = "medium"          # "high" | "medium" | "low"
    extraction_notes: Optional[str] = None


# ─── Prompt (versionado en código; en producción se leerá de DB) ─────────────

EXTRACTION_PROMPT = """
Eres un extractor de datos de productos de e-commerce chilenos.
Analiza el siguiente texto de una página de producto y extrae la información en JSON.

Reglas:
- price_clp: precio actual en pesos chilenos (CLP), solo el número entero, sin puntos ni símbolos
- price_original_clp: precio antes del descuento, None si no hay oferta
- discount_percent: porcentaje de descuento como entero, None si no hay
- in_stock: true si el producto está disponible, false si dice "sin stock" o "agotado"
- confidence: "high" si los datos son claros, "medium" si hay algo ambiguo, "low" si son muy inciertos
- image_url: URL completa de la imagen principal del producto, None si no está en el texto

Texto de la página:
---
{page_text}
---

Responde SOLO con el JSON, sin texto adicional.
"""

_PRICE_MIN = 100
_PRICE_MAX = 100_000_000


def _validate_price(price: int) -> bool:
    return _PRICE_MIN <= price <= _PRICE_MAX


def _clean_page_text(html: str, url: str, max_chars: int = 24000) -> str:
    """Extract clean text using trafilatura, truncated to avoid LLM token overflows."""
    try:
        import trafilatura
        text = trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
        )
        if text and len(text) > 20:
            return text[:max_chars]
    except Exception as e:
        logger.warning(f"trafilatura failed: {e}")

    # Fallback: plain text strip
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)[:max_chars]


def _fetch_page_html(url: str) -> str:
    """
    Fetch page HTML using Scrapling DynamicFetcher.
    Más stealthy que Playwright puro y no requiere launch_playwright_page.
    """
    try:
        from scrapling.fetchers import DynamicFetcher
    except ImportError as e:
        raise RuntimeError(f"Scrapling no instalado: {e}") from e

    page = DynamicFetcher.fetch(
        url,
        headless=True,
        disable_resources=True,     # descarta imágenes/fuentes → más rápido
        google_search=True,          # Referer Google
        locale="es-CL",
        timezone_id="America/Santiago",
        timeout=45000,
        wait=2000,                   # 2s extra para JS de precios
    )

    if page is None:
        raise RuntimeError(f"DynamicFetcher retornó None para {url}")

    # Scrapling Response expone .html con el HTML completo de la página
    return page.html if hasattr(page, 'html') else str(page)


def _call_gemini(prompt: str) -> ProductExtraction:
    """Call Gemini 2.5 Flash-Lite with structured output."""
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-lite",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.1,
        },
    )

    response = model.generate_content(prompt)
    data = json.loads(response.text)
    return ProductExtraction(**data)


def _call_groq(prompt: str) -> ProductExtraction:
    """Call Groq Llama 3.3 with JSON mode as fallback."""
    from groq import Groq

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Eres un extractor de datos de e-commerce. Responde SIEMPRE con JSON válido."
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=512,
    )

    data = json.loads(response.choices[0].message.content)
    return ProductExtraction(**data)


def _log_llm_call(supabase_client, provider: str, model: str, success: bool,
                  latency_ms: int, error_msg: Optional[str] = None):
    """Write LLM call metadata to Supabase llm_calls table."""
    try:
        supabase_client.table("llm_calls").insert({
            "provider": provider,
            "model": model,
            "success": success,
            "latency_ms": latency_ms,
            "error_msg": error_msg,
        }).execute()
    except Exception as e:
        logger.warning(f"Could not log LLM call: {e}")


def extract_with_llm(url: str, supabase_client=None) -> dict:
    """
    Main entry point for Motor LLM Universal.
    Returns dict compatible with price_results schema.

    Raises RuntimeError (SCR-010) if all providers fail.
    """
    # 1. Fetch + clean HTML
    logger.info(f"[LLM] Fetching page: {url}")
    try:
        html = _fetch_page_html(url)
    except Exception as e:
        raise RuntimeError(f"SCR-001: Could not fetch page — {e}")

    page_text = _clean_page_text(html, url)
    if not page_text or len(page_text) < 50:
        raise RuntimeError("SCR-013: trafilatura could not extract useful text")

    prompt = EXTRACTION_PROMPT.format(page_text=page_text)
    extraction: Optional[ProductExtraction] = None
    provider_used = None

    # 2. Try Gemini
    t0 = time.time()
    try:
        extraction = _call_gemini(prompt)
        provider_used = "gemini"
        latency = int((time.time() - t0) * 1000)
        logger.info(f"[LLM] Gemini success in {latency}ms")
        if supabase_client:
            _log_llm_call(supabase_client, "gemini", "gemini-2.0-flash-lite", True, latency)
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        logger.warning(f"[LLM] Gemini failed ({latency}ms): {e}")
        if supabase_client:
            _log_llm_call(supabase_client, "gemini", "gemini-2.0-flash-lite", False, latency, str(e))

    # 3. Fallback: Groq
    if extraction is None:
        t0 = time.time()
        try:
            extraction = _call_groq(prompt)
            provider_used = "groq"
            latency = int((time.time() - t0) * 1000)
            logger.info(f"[LLM] Groq fallback success in {latency}ms")
            if supabase_client:
                _log_llm_call(supabase_client, "groq", "llama-3.3-70b-versatile", True, latency)
        except Exception as e:
            latency = int((time.time() - t0) * 1000)
            logger.error(f"[LLM] Groq fallback failed ({latency}ms): {e}")
            if supabase_client:
                _log_llm_call(supabase_client, "groq", "llama-3.3-70b-versatile", False, latency, str(e))

    if extraction is None:
        raise RuntimeError("SCR-010: All LLM providers failed")

    # 4. Validate price
    if not _validate_price(extraction.price_clp):
        logger.error(f"SCR-011: Price out of range: {extraction.price_clp}")
        # One retry with explicit prompt
        retry_prompt = prompt + "\n\nIMPORTANTE: el precio DEBE ser un número CLP entre 100 y 100000000."
        try:
            if provider_used == "gemini":
                extraction = _call_gemini(retry_prompt)
            else:
                extraction = _call_groq(retry_prompt)
        except Exception:
            raise RuntimeError(f"SCR-011: LLM price invalid after retry: {extraction.price_clp}")
        if not _validate_price(extraction.price_clp):
            raise RuntimeError(f"SCR-011: LLM price still invalid after retry: {extraction.price_clp}")

    # 5. Build result dict (matches price_results schema)
    return {
        "name": extraction.product_name,
        "price": extraction.price_clp,
        "price_original": extraction.price_original_clp,
        "discount_percent": extraction.discount_percent,
        "image_url": extraction.image_url or "",
        "in_stock": extraction.in_stock,
        "source": "Tienda",          # overridden by router with store name
        "extraction_method": "llm",
        "confidence_score": extraction.confidence,
        "extraction_notes": extraction.extraction_notes,
    }


def infer_product_category(query: str, supabase_client=None) -> str:
    """
    Infers the category of a search query (e.g. 'perfumería', 'tecnología', 'calzado', etc.) using Gemini 2.0.
    """
    logger.info(f"[Classifier] Inferring category for query: '{query}'")
    prompt = f"""
    Clasifica la siguiente consulta de búsqueda de un usuario de e-commerce en una de estas categorías:
    tecnología, computación, hardware, moda, calzado, hogar, perfumería, juguetes, construcción, herramientas, supermercado, otros.

    Consulta de búsqueda: "{query}"

    Responde únicamente con el nombre exacto de la categoría seleccionada de la lista en minúsculas. No agregues explicaciones, puntuación ni texto adicional.
    """

    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("[Classifier] GEMINI_API_KEY not set, defaulting to 'otros'")
        return "otros"

    t0 = time.time()
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        response = model.generate_content(prompt)
        category = response.text.strip().lower()

        latency = int((time.time() - t0) * 1000)
        logger.info(f"[Classifier] Gemini classified as '{category}' in {latency}ms")

        # Validate category is in allowed list
        allowed = {"tecnología", "computación", "hardware", "moda", "calzado", "hogar", "perfumería", "juguetes", "construcción", "herramientas", "supermercado", "otros"}
        if category in allowed:
            if supabase_client:
                _log_llm_call(supabase_client, "gemini", "gemini-2.0-flash-lite", True, latency)
            return category
        else:
            logger.warning(f"[Classifier] Gemini returned unrecognized category '{category}', defaulting to 'otros'")
            return "otros"
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        logger.warning(f"[Classifier] Gemini classification failed ({latency}ms): {e}, defaulting to 'otros'")
        if supabase_client:
            _log_llm_call(supabase_client, "gemini", "gemini-2.0-flash-lite", False, latency, str(e))
        return "otros"

