import os
import json
import logging
import asyncio
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import httpx

from scrapers.base import ScraperBase, ScrapedProduct
from scrapers.normalizer import normalize_product_title

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
Eres un extractor de datos de e-commerce. Del siguiente HTML de una tienda online chilena,
extrae TODOS los productos visibles en la página de listado.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin backticks.
El JSON debe tener esta estructura exacta:
{{
  "products": [
    {{
      "title": "nombre completo del producto",
      "price": 29990,
      "currency": "CLP",
      "url": "URL absoluta del producto o ruta relativa",
      "image_url": "URL de la imagen principal o null",
      "available": true,
      "variants": [],
      "is_dupe": false,
      "dupe_of": null
    }}
  ],
  "next_page_url": "URL de la siguiente página o null si es la última"
}}

Reglas:
- Si el precio tiene puntos de miles (29.990), conviértelo a número entero (29990).
- Si no puedes extraer un campo, usa null.
- "is_dupe": true si el nombre indica que es una inspiración, dupe, o versión árabe 
  de otro perfume. Palabras que lo indican: inspirado en, dupe, tipo, estilo, attar, 
  aceite árabe, inspired by, impression of, our version of, compare to, al estilo de.
- "dupe_of": si is_dupe es true, extraer el nombre del perfume original al que hace 
  referencia. Ejemplo: "Inspirado en Chanel N5" → dupe_of: "Chanel N5".

HTML:
{html}
"""


class HtmlParserScraper(ScraperBase):
    """
    Estrategia de sincronización genérica utilizando IA (Gemini/Groq) para parsear el catálogo HTML.
    Utiliza Scrapling StealthyFetcher para descargar y evadir Cloudflare,
    y extrae información semánticamente de forma paginada.
    """

    async def fetch_products(self) -> list[ScrapedProduct]:
        scraped_products = []
        resolved_url_str = await self._resolve_catalog_url()
        
        if not resolved_url_str:
            self.logger.error("No se pudo resolver una URL de catálogo válida para iniciar.")
            return scraped_products

        try:
            from scrapling.fetchers import StealthyFetcher
        except ImportError:
            self.logger.error("Scrapling no instalado. Abortando estrategia HTML Parser.")
            return scraped_products

        # Si vienen múltiples URLs separadas por comas, procesar cada una secuencialmente
        urls_to_process = [u.strip() for u in resolved_url_str.split(",") if u.strip()]
        self.logger.info(f"URLs de catálogo a procesar secuencialmente: {urls_to_process}")

        for start_url in urls_to_process:
            self.logger.info(f"--- Iniciando extracción para URL base: {start_url} ---")
            current_url = start_url
            page_count = 1
            max_pages = 10  # Límite por sección para evitar loops y consumo excesivo de tokens
            
            while current_url and page_count <= max_pages:
                self.logger.info(f"Scraping catalog page {page_count} at: {current_url}")
                
                # 1. Descargar HTML con StealthyFetcher (anti-Cloudflare)
                html = None
                try:
                    # Ejecutamos el fetch en un hilo para no bloquear el bucle de eventos
                    loop = asyncio.get_running_loop()
                    page = await loop.run_in_executor(
                        None,
                        lambda: StealthyFetcher.fetch(
                            current_url,
                            headless=True,
                            solve_cloudflare=True,
                            block_webrtc=True,
                            hide_canvas=True,
                            google_search=True,
                            disable_resources=True,
                            timeout=60000,
                            wait=2000,
                            locale="es-CL",
                            timezone_id="America/Santiago"
                        )
                    )
                    if page:
                        if hasattr(page, 'body') and page.body:
                            html = page.body.decode('utf-8', errors='ignore') if isinstance(page.body, bytes) else str(page.body)
                        else:
                            html = page.html if hasattr(page, 'html') else str(page)
                except Exception as e:
                    self.logger.error(f"Error fetching URL {current_url}: {e}")
                    break

                if not html or len(html) < 200:
                    self.logger.error(f"Obtained empty or invalid HTML from {current_url}")
                    break

                # 2. Limpiar el HTML para reducir tokens (Trafilatura con fallback a BeautifulSoup estructurado)
                cleaned_html = self._clean_html(html, current_url)

                # 3. Extraer productos utilizando el LLM (Gemini con fallback a Groq)
                extraction = await self._extract_with_llm(cleaned_html)
                
                if not extraction or "products" not in extraction:
                    self.logger.error(f"Failed to extract product list on page {page_count}.")
                    break
                    
                products = extraction["products"]
                self.logger.info(f"Extracted {len(products)} products from page {page_count}.")
                
                for prod in products:
                    title = prod.get("title", "")
                    if not title:
                        continue
                        
                    prod_url = prod.get("url", "")
                    if prod_url:
                        # Resolver URL relativa a absoluta
                        prod_url = urljoin(current_url, prod_url)
                    else:
                        prod_url = current_url
                        
                    image_url = prod.get("image_url")
                    if image_url:
                        image_url = urljoin(current_url, image_url)
                        
                    try:
                        price = float(prod.get("price") or 0)
                    except (ValueError, TypeError):
                        price = 0.0
                        
                    available = bool(prod.get("available", True))
                    
                    scraped_products.append(
                        ScrapedProduct(
                            store_slug=self.store_slug,
                            store_name=self.store_name,
                            store_url=self.store_url,
                            title=title,
                            title_normalized=normalize_product_title(title),
                            price=price,
                            currency="CLP",
                            url=prod_url,
                            image_url=image_url,
                            available=available,
                            variants=prod.get("variants") or [],
                            raw_data=prod,
                            scraped_at=datetime.now(timezone.utc),
                            sync_method="html_parser"
                        )
                    )

                # 4. Determinar la siguiente página
                next_page = extraction.get("next_page_url")
                if next_page:
                    next_page_abs = urljoin(current_url, next_page)
                    # Evitar loops si la URL es la misma o coincide con alguna base
                    if next_page_abs == current_url or next_page_abs in urls_to_process:
                        self.logger.info("Next page URL is the same or a base URL. Stopping category.")
                        break
                    current_url = next_page_abs
                    page_count += 1
                    await self._request_delay()
                else:
                    self.logger.info("No next page URL returned. Category completed.")
                    break
                    
        return scraped_products

    def _clean_html(self, html: str, url: str) -> str:
        """
        Limpia el HTML preservando la estructura del catálogo (grillas de productos).
        Prioriza BeautifulSoup estructurado y limpio para e-commerce, con fallback a Trafilatura/truncado.
        """
        # 1. BeautifulSoup estructurado (óptimo para e-commerce)
        from bs4 import BeautifulSoup
        try:
            soup = BeautifulSoup(html, "html.parser")
            # Decomponer scripts, estilos y elementos de navegación molestos
            for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav", "iframe", "aside"]):
                tag.decompose()
            # Limpiar atributos innecesarios de las etiquetas para ahorrar tokens
            for tag in soup.find_all(True):
                attrs = {}
                if tag.name == "a" and "href" in tag.attrs:
                    attrs["href"] = tag.attrs["href"]
                elif tag.name == "img":
                    src = tag.attrs.get("src") or tag.attrs.get("data-src") or tag.attrs.get("data-lazy-src")
                    if src:
                        attrs["src"] = src
                tag.attrs = attrs
            
            cleaned_soup = str(soup)
            if len(cleaned_soup) > 200:
                # 150k caracteres caben holgadamente en Gemini 2.5 y evitan truncar paginación
                return cleaned_soup[:150000]
        except Exception as e:
            self.logger.warning(f"BeautifulSoup cleaning failed: {e}")

        # 2. Fallback a Trafilatura
        try:
            import trafilatura
            cleaned = trafilatura.extract(
                html,
                url=url,
                include_links=True,
                include_comments=False,
                output_format="markdown"
            )
            if cleaned and len(cleaned) > 200:
                return cleaned[:100000]
        except Exception as e:
            self.logger.warning(f"Trafilatura fallback failed: {e}")
            
        return html[:100000]

    async def _resolve_catalog_url(self) -> str | None:
        """
        Prueba diferentes rutas comunes si catalog_url no es válida.
        Las prueba en orden: catalog_url, /catalogo, /productos, /tienda, /shop, /collections/all
        """
        if self.catalog_url and "," in self.catalog_url:
            self.logger.info(f"Configuración de categorías múltiples detectada: {self.catalog_url}")
            return self.catalog_url

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        urls_to_try = []
        if self.catalog_url:
            urls_to_try.append(self.catalog_url)
            
        # Rutas comunes para agregar
        paths = ["/catalogo", "/productos", "/tienda", "/shop", "/collections/all"]
        for p in paths:
            urls_to_try.append(f"{self.store_url}{p}")
            
        async with httpx.AsyncClient(headers=headers, timeout=15.0, follow_redirects=True) as client:
            for url in urls_to_try:
                try:
                    self.logger.info(f"Probing catalog URL: {url}")
                    response = await client.get(url)
                    if response.status_code == 200 and len(response.text) > 1000:
                        self.logger.info(f"Resolved catalog URL successfully: {url}")
                        return url
                except Exception as e:
                    self.logger.debug(f"Catalog probe failed for {url}: {e}")
                    
        # Si todo falla, retornar la primera por defecto
        return self.catalog_url or f"{self.store_url}/collections/all"

    async def _extract_with_llm(self, cleaned_html: str) -> dict | None:
        """Llama a Gemini 2.5 Flash-Lite, y a Groq en caso de error."""
        prompt = EXTRACTION_PROMPT.format(html=cleaned_html)
        
        # 1. Intentar con Gemini
        gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_api_key)
                
                # Intentar usar el modelo pedido, o el estable en su defecto
                model_names = [
                    "gemini-2.5-flash-lite-preview-06-17",
                    "gemini-2.5-flash-lite",
                    "gemini-flash-latest",
                    "gemini-3.1-flash-lite"
                ]
                data = None
                for name in model_names:
                    try:
                        self.logger.info(f"Trying Gemini model: {name} for semantic extraction...")
                        model = genai.GenerativeModel(
                            model_name=name,
                            generation_config={
                                "response_mime_type": "application/json",
                                "temperature": 0.0,
                                "max_output_tokens": 8000,
                            }
                        )
                        
                        max_retries = 3
                        for attempt in range(max_retries):
                            try:
                                # Ejecutar en hilo
                                loop = asyncio.get_running_loop()
                                response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
                                if response and response.text:
                                    data = json.loads(response.text)
                                    self.logger.info(f"Successfully extracted data with Gemini ({name})")
                                    break
                            except Exception as api_err:
                                err_str = str(api_err)
                                if ("429" in err_str or "quota" in err_str.lower() or "limit" in err_str.lower()) and attempt < max_retries - 1:
                                    import re
                                    match = re.search(r"Please retry in (\d+(?:\.\d+)?)s", err_str)
                                    wait_time = float(match.group(1)) + 2.0 if match else 20.0
                                    self.logger.warning(f"Límite de cuota Gemini (429). Esperando {wait_time:.1f} segundos para reintentar... (Intento {attempt+1}/{max_retries})")
                                    await asyncio.sleep(wait_time)
                                    continue
                                raise api_err
                        
                        if data:
                            break
                    except Exception as model_err:
                        self.logger.warning(f"Gemini model {name} failed: {model_err}")
                        continue
                
                if data:
                    return data
                else:
                    raise ValueError("All configured Gemini models failed to generate response")
            except Exception as e:
                self.logger.warning(f"Gemini extraction failed: {e}. Trying fallback to Groq...")

        # 2. Fallback a Groq (Llama 3.3)
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_api_key)
                
                self.logger.info("Calling Groq (llama-3.3-70b-versatile) fallback...")
                loop = asyncio.get_running_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {
                                "role": "system",
                                "content": "Eres un extractor de datos de e-commerce. Responde SIEMPRE con JSON válido de acuerdo a la estructura pedida."
                            },
                            {"role": "user", "content": prompt},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.0,
                        max_tokens=2048,
                    )
                )
                
                data = json.loads(response.choices[0].message.content)
                return data
            except Exception as e:
                self.logger.error(f"Groq fallback extraction failed: {e}")
                
        return None
