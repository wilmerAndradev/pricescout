import os
import sys

# Asegurar que el path del backend está en sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.normalizer import normalize_product_title, extract_volume_ml
from tasks.jobs import parse_product_details, BRAND_SYNONYMS, supabase_writer
from auth import execute_with_retry

def get_suggestions(query: str):
    print(f"\n--- Query original: '{query}' ---")
    
    # 1. Normalizar y extraer tokens core
    query_normalized = normalize_product_title(query)
    print(f"Normalizado: '{query_normalized}'")
    
    from scrapers.matcher import BRAND_WORDS, GENERIC_WORDS
    
    query_tokens = query_normalized.split()
    core_tokens = [
        t for t in query_tokens 
        if t not in BRAND_WORDS and t not in GENERIC_WORDS and not t.isdigit()
    ]
    print(f"Tokens core: {core_tokens}")
    
    # 2. Volumen y concentración del query original
    query_volume = extract_volume_ml(query)
    print(f"Volumen original: {query_volume} ml")
    
    valid_concentrations = ["edt", "edp", "edc", "parfum", "cologne", "extrait"]
    query_concentration = next((t for t in query_tokens if t in valid_concentrations), None)
    print(f"Concentración original: {query_concentration}")
    
    # 3. Detectar marca original
    brand, clean, gender, volume_str, sku = parse_product_details(query)
    print(f"Marca detectada: '{brand}'")
    
    # 4. Construir query Supabase
    q = supabase_writer.table("products").select("title, title_normalized, volume_ml, store_slug")
    
    # Solo registros con store_slug no nulo
    q = q.not_.is_("store_slug", "null")
    
    # Filtrar por sinónimos de la marca si no es Genérico
    if brand != "Genérico":
        syns = BRAND_SYNONYMS.get(brand, [])
        if syns:
            or_filter = ",".join([f"title_normalized.ilike.%{syn}%" for syn in syns])
            q = q.or_(or_filter)
            print(f"Filtro de marca (or_): {or_filter}")
            
    # Filtrar por tokens core
    for token in core_tokens:
        q = q.ilike("title_normalized", f"%{token}%")
        
    # Ordenar por volume_ml ASC
    q = q.order("volume_ml")
    
    # Limit 50 para tener suficiente margen para filtrar en Python
    q = q.limit(50)
    
    try:
        res = execute_with_retry(q)
        products = res.data or []
        print(f"Productos encontrados en DB (antes de filtrar): {len(products)}")
        for p in products[:5]:
            print(f" - {p['title']} (volumen_ml: {p['volume_ml']})")
    except Exception as e:
        print(f"Error en consulta Supabase: {e}")
        return []
        
    # 5. Filtrar en Python: diferente volume_ml O diferente concentración
    suggestions = []
    seen_combinations = set() # (volume_ml, concentración)
    
    for prod in products:
        title = prod["title"]
        title_norm = prod["title_normalized"]
        prod_volume = prod["volume_ml"] # es un entero o None en la DB
        
        # Si el volumen es nulo en la DB, intentar extraer del título
        if prod_volume is None:
            prod_volume = extract_volume_ml(title)
            
        # Detectar concentración del producto
        prod_tokens = title_norm.split()
        prod_concentration = next((t for t in prod_tokens if t in valid_concentrations), None)
        
        # Filtro: diferente volume_ml O diferente concentración
        # (Si el volumen original es None, o la conc original es None, no podemos comparar estrictamente,
        # pero sigamos la lógica: debe ser diferente de lo detectado, o si no se detectó volumen original,
        # consideramos diferente si tiene cualquier volumen).
        is_different_volume = (query_volume is not None and prod_volume is not None and prod_volume != query_volume)
        is_different_concentration = (query_concentration is not None and prod_concentration is not None and prod_concentration != query_concentration)
        
        # Si el query original no tenía volumen, cualquier volumen de producto es diferente/variante
        if query_volume is None and prod_volume is not None:
            is_different_volume = True
            
        # Si el query original no tenía concentración, cualquier concentración es diferente/variante
        if query_concentration is None and prod_concentration is not None:
            is_different_concentration = True
            
        if not (is_different_volume or is_different_concentration):
            continue
            
        # Deduplicar por combinación (volume_ml, concentración)
        # Usamos 0 si es None para consistencia
        combo = (prod_volume or 0, prod_concentration or "")
        if combo in seen_combinations:
            continue
            
        seen_combinations.add(combo)
        
        # Construir label y query
        # El label debe ser legible (ej: "Polo Blue EDT 100 ml")
        # El query es un string listo para buscar
        # Para construir un label legible e idealmente uniforme, usamos la marca + tokens core + concentración + volumen
        # Vamos a ver qué marca y título limpio tiene el producto.
        # Podemos usar parse_product_details del título del producto para formatearlo bien.
        prod_brand, prod_clean, _, _, _ = parse_product_details(title)
        
        label_parts = []
        if prod_brand != "Genérico":
            label_parts.append(prod_brand)
        else:
            # Si no se detectó marca, usamos la marca del query original si es que la tenía
            if brand != "Genérico":
                label_parts.append(brand)
                
        # Añadir título limpio (sin la marca)
        if prod_clean:
            label_parts.append(prod_clean)
            
        # Añadir concentración si se detectó
        if prod_concentration:
            label_parts.append(prod_concentration.upper())
            
        # Añadir volumen si se detectó
        if prod_volume:
            label_parts.append(f"{prod_volume} ml")
            
        label = " ".join(label_parts)
        
        # El query listo para buscar
        # Podemos usar la misma cadena del label
        suggestions.append({
            "label": label,
            "query": label
        })
        
        if len(suggestions) >= 6:
            break
            
    print(f"Sugerencias generadas: {len(suggestions)}")
    for s in suggestions:
        print(f" - Label: '{s['label']}', Query: '{s['query']}'")
        
    return suggestions

if __name__ == "__main__":
    get_suggestions("Ralph Lauren Polo Blue EDT 100 ml")
    get_suggestions("Acqua di Gio 75ml")
    get_suggestions("Dior Sauvage EDP")
