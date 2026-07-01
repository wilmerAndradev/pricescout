import logging
import os
from tasks.celery_app import app
from supabase import create_client, Client
from auth import execute_with_retry
from scrapers.matcher import score_match
from scrapers.normalizer import is_dupe_product

logger = logging.getLogger(__name__)

# ─── Supabase writer (service role bypasses RLS) ─────────────────────────────
_supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
_anon_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
_write_key = (
    _service_key
    if _service_key and _service_key != "your-service-role-key-here"
    else _anon_key
)
supabase_writer: Client = create_client(_supabase_url, _write_key)


# ─── Mapeo de Categorías y Tiendas ──────────────────────────────────────────
STORE_CATEGORIES = {
    "falabella.com": ["tecnología", "computación", "hardware", "moda", "calzado", "hogar", "perfumería", "juguetes", "supermercado"],
    "ripley.cl": ["tecnología", "computación", "hardware", "moda", "calzado", "hogar", "perfumería", "juguetes"],
    "paris.cl": ["tecnología", "computación", "hardware", "moda", "calzado", "hogar", "perfumería", "juguetes"],
    "mercadolibre.cl": ["tecnología", "computación", "hardware", "moda", "calzado", "hogar", "perfumería", "juguetes", "construcción", "herramientas", "supermercado", "otros"],
    "lider.cl": ["supermercado", "hogar", "perfumería", "juguetes"],
    "pcfactory.cl": ["tecnología", "computación", "hardware"],
    "abcdin.cl": ["tecnología", "hogar"],
    "hites.cl": ["moda", "calzado", "hogar", "perfumería"],
    "sodimac.cl": ["construcción", "herramientas", "hogar"],
    "eliteperfumes.cl": ["perfumería"],
    "spdigital.cl": ["tecnología", "computación", "hardware"]
}

STORE_NAMES = {
    "cosmetic.cl": "Cosmetic",
    "comprarenchile.cl": "ComprarenChile",
    "eliteperfumes.cl": "Elite Perfumes",
    "lodoro.cl": "Lodoro",
    "multimarcasperfumes.cl": "MultiMarcas Perfumes",
    "mundoaromas.cl": "Mundo Aromas",
    "perfumisimo.cl": "Perfumisimo",
    "productosdelujo.cl": "Productos de Lujo",
    "silkperfumes.cl": "Silk Perfumes",
    "yauras.cl": "Yauras",
    "alarab.cl": "Alarab",
    "alishaperfumes.cl": "Alisha Perfumes",
    "parisperfumes.cl": "ParisPerfumes",
    "sairam.cl": "Sairam",
    "joyperfumes.cl": "JoyPerfumes"
}

def get_relevant_stores_for_category(category: str, limit: int = 5) -> list:
    general_stores = ["mercadolibre.cl", "falabella.com", "ripley.cl", "paris.cl"]
    matching_stores = []
    for store, categories in STORE_CATEGORIES.items():
        if category in categories:
            matching_stores.append(store)
            
    stores = []
    for s in matching_stores:
        if s not in stores:
            stores.append(s)
            
    for s in general_stores:
        if len(stores) >= limit:
            break
        if s not in stores:
            stores.append(s)
            
    return stores[:limit]


# ─── Celery Tasks ────────────────────────────────────────────────────────────

@app.task(bind=True, rate_limit="5/s", max_retries=1)
def scrape_store_search_task(self, search_id: str, store_domain: str, query: str):
    """
    Celery task that searches a single store, resolves the product URL,
    extracts the product details, and saves the result to `search_results`.
    """
    logger.info(f"Starting store search on '{store_domain}' for '{query}' | Search ID: {search_id}")
    
    store_name = STORE_NAMES.get(store_domain, "Tienda")
    
    try:
        from scrapers.store_search import search_store_product_url
        from tasks.scraping_router import route_and_extract
        
        # 1. Discover product URL
        product_url = search_store_product_url(store_domain, query)
        
        if not product_url:
            # Save empty result so the frontend knows we completed this store but found nothing
            supabase_writer.table("search_results").insert({
                "search_id": search_id,
                "store_domain": store_domain,
                "store_name": store_name,
                "product_url": "",
                "title": "Producto no encontrado",
                "price_clp": 0,
                "in_stock": False,
                "extraction_method": "deterministic",
                "confidence_score": "low"
            }).execute()
            return {"status": "no_results", "store": store_domain}
            
        # 2. Clean URL: remove tracking/sponsored params that cause timeouts
        from urllib.parse import urlparse, urlunparse, urlencode, parse_qs
        try:
            parsed = urlparse(product_url)
            # Remove query params known to cause issues
            bad_params = {"sponsoredClickData", "utm_source", "utm_medium", "utm_campaign", "cid"}
            qs = parse_qs(parsed.query, keep_blank_values=True)
            clean_qs = {k: v for k, v in qs.items() if k not in bad_params}
            clean_query = urlencode(clean_qs, doseq=True)
            product_url = urlunparse(parsed._replace(query=clean_query, fragment=""))
            logger.info(f"[URL Clean] Cleaned URL for {store_domain}: {product_url[:120]}")
        except Exception:
            pass  # Si falla el limpiado, usar URL original

        # 3. Extract details from product URL
        data = route_and_extract(product_url, supabase_client=supabase_writer)
        
        # Save complete result to database
        supabase_writer.table("search_results").insert({
            "search_id": search_id,
            "store_domain": store_domain,
            "store_name": store_name,
            "product_url": product_url,
            "title": data.get("name", "Producto"),
            "price_clp": data.get("price", 0),
            "original_price_clp": data.get("price_original"),
            "discount_pct": data.get("discount_percent"),
            "image_url": data.get("image_url", ""),
            "description": data.get("extraction_notes", "")[:300], # Description or notes
            "in_stock": data.get("in_stock", True),
            "extraction_method": data.get("extraction_method", "deterministic"),
            "confidence_score": data.get("confidence_score") or "high"
        }).execute()
        
        return {"status": "success", "store": store_domain, "url": product_url}
        
    except Exception as exc:
        logger.error(f"Error in scrape_store_search_task for {store_domain}: {exc}")
        # Insert failure record
        try:
            supabase_writer.table("search_results").insert({
                "search_id": search_id,
                "store_domain": store_domain,
                "store_name": store_name,
                "product_url": "",
                "title": "Error al extraer datos",
                "price_clp": 0,
                "in_stock": False,
                "extraction_method": "deterministic",
                "confidence_score": "low"
            }).execute()
        except Exception as db_exc:
            logger.error(f"Failed to insert failure record for {store_domain}: {db_exc}")
        return {"status": "failed", "store": store_domain, "error": str(exc)}


@app.task(bind=True)
def search_complete_callback_task(self, results, search_id: str):
    """Callback executed when all parallel store searches complete."""
    logger.info(f"All parallel scraping jobs finished for Search ID: {search_id}. Updating status to completed.")
    try:
        supabase_writer.table("searches").update({"status": "completed"}).eq("id", search_id).execute()
    except Exception as e:
        logger.error(f"Failed to update search status to completed: {e}")


import re

BRAND_SYNONYMS = {
    "Dior": ["dior", "christian dior"],
    "Chanel": ["chanel"],
    "Giorgio Armani": ["giorgio armani", "armani", "giorgioarmani"],
    "Paco Rabanne": ["paco rabanne", "rabanne", "pacorabanne"],
    "Carolina Herrera": ["carolina herrera", "ch", "carolinaherrera"],
    "Versace": ["versace"],
    "Hugo Boss": ["hugo boss", "boss", "hugoboss"],
    "Calvin Klein": ["calvin klein", "ck", "calvinklein"],
    "Yves Saint Laurent": ["yves saint laurent", "ysl", "yves saint-laurent", "yvessaintlaurent"],
    "Guerlain": ["guerlain"],
    "Givenchy": ["givenchy"],
    "Tom Ford": ["tom ford", "tf", "tomford"],
    "Creed": ["creed"],
    "Bvlgari": ["bvlgari", "bulgari"],
    "Dolce & Gabbana": ["dolce & gabbana", "dolce and gabbana", "d&g", "dg", "dolce&gabbana"],
    "Jean Paul Gaultier": ["jean paul gaultier", "jpg", "jeanpaulgaultier"],
    "Montblanc": ["montblanc", "mont blanc"],
    "Ralph Lauren": ["ralph lauren", "polo ralph lauren", "polo"],
    "Hermes": ["hermes", "hermès"],
    "Prada": ["prada"],
    "Mugler": ["mugler", "thierry mugler"],
    "Valentino": ["valentino"],
    "Nautica": ["nautica"],
    "Issey Miyake": ["issey miyake", "isseymiyake"],
    "Kenzo": ["kenzo"],
    "Lacoste": ["lacoste"],
    "Antonio Banderas": ["antonio banderas", "banderas", "antoniobanderas"],
    "Diesel": ["diesel"],
    "Elizabeth Arden": ["elizabeth arden", "arden"],
    "Estee Lauder": ["estee lauder", "estée lauder", "esteelauder"],
    "Clinique": ["clinique"],
    "Shiseido": ["shiseido"],
    "Victoria's Secret": ["victoria's secret", "victorias secret", "vs"],
    "Oster": ["oster"],
    "Asus": ["asus"],
    "Nike": ["nike"]
}

def smart_capitalize(text: str) -> str:
    """
    Capitaliza de forma inteligente: Iniciales en mayúsculas,
    y mantiene acrónimos de perfumería (EDT, EDP, etc.) y volumen (ML) en mayúsculas.
    """
    words = text.split()
    capitalized = []
    for w in words:
        # Remover signos de puntuación pegados para evaluar la palabra base
        w_clean = re.sub(r'[^\w]', '', w).lower()
        if w_clean in ["edt", "edp", "edc", "cologne", "parfum", "deo"]:
            capitalized.append(w.upper())
        elif w_clean.endswith("ml") and w_clean[:-2].isdigit():
            val = w_clean[:-2]
            capitalized.append(f"{val}ML")
        else:
            capitalized.append(w.capitalize())
    return " ".join(capitalized)

def parse_product_details(raw_title: str) -> tuple[str, str, str, str, str]:
    """
    Parsea el título original para extraer:
    (marca, título_limpio, género, volumen, sku)
    """
    title = raw_title.strip()
    
    # 1. Encontrar la marca
    detected_brand = "Genérico"
    title_lower = title.lower()
    
    # Ordenamos de más largo a más corto para evitar colisiones tempranas parciales
    sorted_brands = sorted(BRAND_SYNONYMS.keys(), key=len, reverse=True)
    
    for brand_key in sorted_brands:
        synonyms = BRAND_SYNONYMS[brand_key]
        found = False
        for syn in synonyms:
            if len(syn) <= 3:
                pattern = r'\b' + re.escape(syn) + r'\b'
            else:
                pattern = r'\b' + re.escape(syn) + r'\b|\b' + re.escape(syn.replace(" ", "")) + r'\b'
            if re.search(pattern, title_lower):
                detected_brand = brand_key
                found = True
                break
        if found:
            break
            
    # 2. Extraer volumen
    volume = ""
    vol_match = re.search(r'\b(\d+)\s*ml\b', title_lower)
    if vol_match:
        volume = f"{vol_match.group(1)}ml"
        
    # 3. Extraer género
    gender = "Unisex"
    if re.search(r'\b(mujer|women|woman|femme|ella|girl|lady)\b', title_lower):
        gender = "Mujer"
    elif re.search(r'\b(hombre|men|man|homme|él|boy|gentleman)\b', title_lower):
        gender = "Hombre"
        
    # 4. Extraer SKU/Código del final (ej: dio28, DIO30, DIO25)
    sku = ""
    sku_match = re.search(r'\b([a-zA-Z]+\d+)\b$', title)
    if sku_match:
        sku = sku_match.group(1).upper()
        
    # 5. Limpiar el título
    clean = title
    
    # Remover SKU del final si existe
    if sku:
        clean = re.sub(r'\b' + re.escape(sku_match.group(1)) + r'\b$', '', clean).strip()
        
    # Remover todos los sinónimos de la marca detectada
    if detected_brand != "Genérico":
        synonyms = BRAND_SYNONYMS[detected_brand]
        for syn in synonyms:
            if len(syn) <= 3:
                pattern = r'\b' + re.escape(syn) + r'\b'
            else:
                pattern = r'\b' + re.escape(syn) + r'\b|\b' + re.escape(syn.replace(" ", "")) + r'\b'
            clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)
            
    # Limpiar espacios extra y guiones
    clean = re.sub(r'\s+', ' ', clean)
    clean = clean.strip().strip("-").strip()
    
    # Capitalizar de forma inteligente
    if clean:
        clean = smart_capitalize(clean)
    else:
        clean = "Producto"
        
    return detected_brand, clean, gender, volume, sku

@app.task(bind=True)
def run_autonomous_search(self, search_id: str):
    """
    Master Celery task:
    Queries the database products table instead of doing real-time scraping.
    """
    logger.info(f"Starting database-driven autonomous search task for Search ID: {search_id}")
    
    try:
        # Fetch the search record
        res = execute_with_retry(supabase_writer.table("searches").select("*").eq("id", search_id))
        if not res.data:
            logger.error(f"Search record not found for ID: {search_id}")
            return
            
        search_record = res.data[0]
        query = search_record["query"]
        user_id = search_record.get("user_id")
        environment_id = search_record.get("environment_id")
        
        # 1. Update status to processing
        execute_with_retry(supabase_writer.table("searches").update({"status": "processing"}).eq("id", search_id))
        
        # Get user plan limits and environment restrictions
        from core.plans import get_user_plan_and_limits
        plan_limits = get_user_plan_and_limits(user_id)
        max_stores = plan_limits["stores_per_search"]
        
        allowed_domains = None
        if environment_id:
            try:
                env_res = execute_with_retry(
                    supabase_writer.table("environments")
                    .select("store_domains, custom_domains")
                    .eq("id", environment_id)
                )
                if env_res.data:
                    store_domains = env_res.data[0].get("store_domains") or []
                    custom_domains = env_res.data[0].get("custom_domains") or []
                    allowed_domains = {d.strip().lower() for d in (store_domains + custom_domains) if d.strip()}
            except Exception as env_err:
                logger.error(f"Error fetching environment domains in search task: {env_err}")
        
        # 2. Inferencia de categoría rápida
        category = "perfumería"
        try:
            from tasks.llm_extractor import infer_product_category
            category = infer_product_category(query, supabase_writer)
        except Exception:
            pass
        execute_with_retry(supabase_writer.table("searches").update({"category_inferred": category}).eq("id", search_id))

        # 3. Buscar usando PostgreSQL FTS jerárquico (RPC search_products)
        #    - OR filtra: cualquier palabra del query es suficiente para aparecer
        #    - Score compuesto (AND*0.7 + OR*0.3) ordena por relevancia
        #    - Nunca excluye productos relacionados (estuches, variantes de ml)
        from search.query_builder import build_search_query
        query_data = build_search_query(query)
        
        products = []
        try:
            rpc_res = execute_with_retry(supabase_writer.rpc("search_products", {
                "query_text":    query_data["query_text"],
                "result_limit":  60,
                "result_offset": 0,
                "filter_store":  None,
            }))
            products = rpc_res.data or []
            logger.info(
                f"FTS hierarchical search: '{query}' → {len(products)} results "
                f"(tokens: {query_data['tokens']})"
            )
        except Exception as fts_err:
            logger.warning(f"FTS RPC failed, falling back to ILIKE: {fts_err}")
            # Fallback: ILIKE simple si la RPC falla por algún motivo
            from scrapers.normalizer import normalize_product_title, extract_volume_ml
            normalized_query = normalize_product_title(query)
            query_volume = extract_volume_ml(query)
            terms = [t for t in normalized_query.split() if len(t) > 1]
            if terms:
                q_builder = supabase_writer.table("products").select("*")
                for term in terms:
                    if query_volume and (term == "ml" or (term.isdigit() and int(term) == query_volume)):
                        continue
                    q_builder = q_builder.ilike("title_normalized", f"%{term}%")
                fallback_res = q_builder.limit(60).execute()
                products = fallback_res.data or []
            
        # 4. Registrar los resultados en la tabla search_results
        SLUG_TO_DOMAIN_AND_NAME = {
            "cosmetic": ("cosmetic.cl", "Cosmetic"),
            "comprarenchile": ("comprarenchile.cl", "ComprarenChile"),
            "elite-perfumes": ("eliteperfumes.cl", "Elite Perfumes"),
            "lodoro": ("lodoro.cl", "Lodoro"),
            "multimarcas": ("multimarcasperfumes.cl", "MultiMarcas Perfumes"),
            "mundo-aromas": ("mundoaromas.cl", "Mundo Aromas"),
            "perfumisimo": ("perfumisimo.cl", "Perfumisimo"),
            "productos-de-lujo": ("productosdelujo.cl", "Productos de Lujo"),
            "silk-perfumes": ("silkperfumes.cl", "Silk Perfumes"),
            "yauras": ("yauras.cl", "Yauras"),
            "alarab": ("alarab.cl", "Alarab"),
            "alisha": ("alishaperfumes.cl", "Alisha Perfumes"),
            "paris-perfumes": ("parisperfumes.cl", "ParisPerfumes"),
            "sairam": ("sairam.cl", "Sairam"),
            "joy-perfumes": ("joyperfumes.cl", "JoyPerfumes")
        }
        
        results_inserted = 0
        inserted_store_domains = set()
        
        # Deduplicar la lista de productos por store_slug y URL única para evitar tarjetas duplicadas
        unique_products = {}
        for prod in products:
            slug = prod.get("store_slug")
            url = prod.get("url")
            if not slug or not url:
                continue
            
            key = (slug, url)
            existing = unique_products.get(key)
            if not existing:
                unique_products[key] = prod
            else:
                # Priorizar el que esté disponible (available = True)
                existing_avail = existing.get("available", True)
                current_avail = prod.get("available", True)
                
                if current_avail and not existing_avail:
                    unique_products[key] = prod
                elif current_avail == existing_avail:
                    # Si la disponibilidad es la misma, priorizar el registro más reciente
                    existing_seen = existing.get("last_seen_at") or ""
                    current_seen = prod.get("last_seen_at") or ""
                    if current_seen > existing_seen:
                        unique_products[key] = prod
                        
        products = list(unique_products.values())

        for prod in products:
            raw_title = prod.get("title") or ""
            
            # Use continuous scoring matching engine
            score = score_match(query, raw_title)
            is_dupe = is_dupe_product(raw_title)
            
            if is_dupe:
                if score < 0.25:
                    continue
            else:
                if score < 0.80:
                    continue
                
            slug = prod.get("store_slug")
            domain_name = SLUG_TO_DOMAIN_AND_NAME.get(slug)
            if not domain_name:
                continue
            domain, name = domain_name
            domain_lower = domain.strip().lower()
            
            # Restringir a los dominios del entorno si está configurado
            if allowed_domains is not None and domain_lower not in allowed_domains:
                continue
                
            # Validar límite de tiendas por búsqueda
            if domain_lower not in inserted_store_domains:
                if max_stores != -1 and len(inserted_store_domains) >= max_stores:
                    # Se alcanzó el límite de tiendas para este plan, ignorar resultados de nuevos dominios
                    continue
                inserted_store_domains.add(domain_lower)
            
            # Limpiar el título y extraer los metadatos estructurados
            brand, clean_title, gender, vol, sku = parse_product_details(raw_title)
            
            # Si el volumen no se extrajo del título, usar el de la base de datos
            if not vol:
                db_vol = prod.get("volume_ml")
                if db_vol:
                    vol = f"{db_vol}ml"
            
            # Si no hay SKU en el título, buscarlo en raw_data de variants si existe
            if not sku:
                sku_raw = prod.get("raw_data", {}).get("sku")
                if not sku_raw and "variants" in prod.get("raw_data", {}) and prod.get("raw_data", {})["variants"]:
                    sku_raw = prod.get("raw_data", {})["variants"][0].get("sku")
                if sku_raw:
                    sku = str(sku_raw).upper()
                    
            # Si es regular (sin tipo estuche), marcar tipo
            presentation = "Regular"
            title_lower = raw_title.lower()
            if any(k in title_lower for k in ["set", "estuche", "pack", "cofre", "kit", "deo", "desodorante"]):
                presentation = "Estuche/Set"
            elif "tester" in title_lower or "probador" in title_lower:
                presentation = "Tester"
                
            # Serializar metadatos en la descripción: brand=X;gender=Y;volume=Z;type=T;sku=S
            metadata_parts = [
                f"brand={brand}",
                f"gender={gender}",
                f"volume={vol}",
                f"type={presentation}",
                f"sku={sku}"
            ]
            desc_val = ";".join(metadata_parts)
            
            # Calcular descuento si tiene original price
            price = prod.get("price", 0)
            orig_price = None
            raw_data = prod.get("raw_data") or {}
            
            if raw_data:
                orig_price = raw_data.get("compare_at_price") or raw_data.get("price_original") or raw_data.get("original_price")
                if not orig_price and "variants" in raw_data and raw_data["variants"]:
                    orig_price = raw_data["variants"][0].get("compare_at_price")

            # Convertir a float y luego int
            try:
                price_clp = int(float(price))
            except Exception:
                price_clp = 0

            discount = None
            orig_price_int = None
            try:
                if orig_price:
                    # Algunos Shopify JSON guardan compare_at_price como string o centavos, normalizar
                    orig_price_val = float(orig_price)
                    # Si está en formato centavos de Shopify (ej: 4500000 para 45000), dividir
                    if orig_price_val > price_clp * 10:
                        orig_price_val = orig_price_val / 100.0
                    
                    if orig_price_val > price_clp:
                        orig_price_int = int(orig_price_val)
                        discount = int((orig_price_int - price_clp) / orig_price_int * 100)
            except Exception:
                orig_price_int = None
                
            execute_with_retry(supabase_writer.table("search_results").insert({
                "search_id": search_id,
                "store_domain": domain,
                "store_name": name,
                "product_url": prod.get("url"),
                "title": clean_title,
                "price_clp": price_clp,
                "original_price_clp": orig_price_int,
                "discount_pct": discount,
                "image_url": prod.get("image_url"),
                "description": desc_val,
                "in_stock": prod.get("available", True),
                "extraction_method": "database",
                "confidence_score": "high"
            }))
            results_inserted += 1
            
        logger.info(f"Database search completed. Inserted {results_inserted} results for Search ID: {search_id}")
        
        # 5. Marcar búsqueda como completada
        execute_with_retry(supabase_writer.table("searches").update({"status": "completed"}).eq("id", search_id))
        
    except Exception as e:
        logger.error(f"Error in run_autonomous_search: {e}")
        try:
            execute_with_retry(supabase_writer.table("searches").update({"status": "failed"}).eq("id", search_id))
        except Exception as db_exc:
            logger.error(f"Failed to mark search as failed in DB: {db_exc}")


@app.task(bind=True, rate_limit="1/s", max_retries=3)
def scrape_url_task(self, url: str, user_id: str = None, comparison_job_id: str = None):
    """
    Celery task — Hybrid Scraping Pipeline (SRS v2.0).
    Routes URL through scraping_router which selects:
      - Motor A (Deterministic Parser) for known stores
      - Motor B (LLM Universal) for unknown domains
    Saves result to Supabase price_results table.
    """
    is_celery = self and hasattr(self, "request") and self.request
    if is_celery:
        job_id = self.request.id
    else:
        import uuid
        job_id = f"local_{uuid.uuid4()}"
        
    logger.info(f"Starting scrape job {job_id} for URL: {url} by user {user_id}")

    try:
        from tasks.scraping_router import route_and_extract

        data = route_and_extract(url, supabase_client=supabase_writer)

        logger.info(
            f"Extracted: {data['name']} | ${data['price']} "
            f"| method={data.get('extraction_method')} "
            f"| confidence={data.get('confidence_score')}"
        )

        # Save to Supabase price_results
        if user_id and data["price"] >= 0:
            result_payload = {
                "job_id": job_id,
                "user_id": user_id,
                "comparison_job_id": comparison_job_id,
                "product_name": data["name"],
                "price": data["price"],
                "price_original": data.get("price_original"),
                "image_url": data.get("image_url", ""),
                "source_url": url,
                "store_name": data["source"],
                "in_stock": data.get("in_stock", True),
                "extraction_method": data.get("extraction_method", "parser"),
                "confidence_score": data.get("confidence_score"),
            }
            supabase_writer.table("price_results").insert(result_payload).execute()
            logger.info("Saved result to database successfully.")

        return {"status": "success", "url": url, "data": data}

    except Exception as exc:
        logger.error(f"Failed to scrape {url}: {str(exc)}")
        retries = self.request.retries if is_celery else 0
        max_retries = self.max_retries if is_celery else 0
        
        if retries >= max_retries:
            # Insert failed record so the frontend knows this URL is done
            if user_id and comparison_job_id:
                try:
                    supabase_writer.table("price_results").insert({
                        "job_id": job_id,
                        "user_id": user_id,
                        "comparison_job_id": comparison_job_id,
                        "product_name": "Error al extraer",
                        "price": 0,
                        "source_url": url,
                        "store_name": "Error",
                        "in_stock": False,
                        "extraction_method": "llm",
                        "confidence_score": "low"
                    }).execute()
                except Exception as db_exc:
                    logger.error(f"Failed to insert error record: {db_exc}")
        if is_celery:
            raise self.retry(exc=exc, countdown=2 ** retries)
        else:
            raise exc
