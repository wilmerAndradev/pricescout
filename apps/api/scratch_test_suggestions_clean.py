import os
import sys
import re

# Asegurar que el path del backend está en sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scrapers.normalizer import normalize_product_title, extract_volume_ml, is_dupe_product
from tasks.jobs import parse_product_details, BRAND_SYNONYMS, supabase_writer, smart_capitalize
from auth import execute_with_retry

def clean_title_for_suggestion(title: str, brand_detected: str) -> str:
    clean = title
    
    # 1. Remover retail/ruido y géneros
    noise_words = [
        "tester", "decant", "muestra", "sample", "travel", "size", "miniatura", 
        "nuevo", "new", "original", "sellado", "caja", "box", "sin caja", "sin celofan",
        "hombre", "mujer", "unisex", "men", "women", "man", "woman", 
        "pour homme", "pour femme", "luxe", "natural spray", "spray", "vaporisateur",
        "set", "estuche", "pack", "cofre", "kit", "ml"
    ]
    # Ordenar de más largo a más corto
    noise_words = sorted(noise_words, key=len, reverse=True)
    for w in noise_words:
        clean = re.sub(r'\b' + re.escape(w) + r'\b', '', clean, flags=re.IGNORECASE)
        
    # 2. Remover concentraciones
    concentrations = ["edt", "edp", "edc", "parfum", "cologne", "extrait", "eau de parfum", "eau de toilette", "eau de cologne"]
    concentrations = sorted(concentrations, key=len, reverse=True)
    for c in concentrations:
        clean = re.sub(r'\b' + re.escape(c) + r'\b', '', clean, flags=re.IGNORECASE)
        
    # 3. Remover volumen (ej: 100ml o 100 ml)
    clean = re.sub(r'\b\d+\s*(?:ml|ML|mL|Ml|Mls|mls)?\b', '', clean, flags=re.IGNORECASE)
    
    # 4. Remover marcas del principio del título
    if brand_detected != "Genérico":
        prefixes = [brand_detected.lower()]
        if brand_detected == "Giorgio Armani":
            prefixes.append("armani")
        elif brand_detected == "Yves Saint Laurent":
            prefixes.append("ysl")
        elif brand_detected == "Carolina Herrera":
            prefixes.append("ch")
        elif brand_detected == "Calvin Klein":
            prefixes.append("ck")
        elif brand_detected == "Tom Ford":
            prefixes.append("tf")
        elif brand_detected == "Jean Paul Gaultier":
            prefixes.append("jpg")
        elif brand_detected == "Paco Rabanne":
            prefixes.append("rabanne")
        elif brand_detected == "Hugo Boss":
            prefixes.append("boss")
        elif brand_detected == "Antonio Banderas":
            prefixes.append("banderas")
        elif brand_detected in ["Christian Dior", "Dior"]:
            prefixes.extend(["christian dior", "dior"])
            
        prefixes = sorted(prefixes, key=len, reverse=True)
        for prefix in prefixes:
            pattern = r'^\s*' + re.escape(prefix) + r'\b'
            if re.search(pattern, clean, flags=re.IGNORECASE):
                clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)
                break
                
    # 5. Limpieza final de espacios, guiones y comas residuales
    clean = re.sub(r'\s+', ' ', clean)
    # Eliminar signos de puntuación iniciales o finales
    clean = clean.strip().strip("-").strip(",").strip("/").strip()
    
    # Capitalizar de forma inteligente
    if clean:
        clean = smart_capitalize(clean)
    else:
        clean = "Producto"
        
    return clean

def get_suggestions(query: str):
    print(f"\n--- Query original: '{query}' ---")
    
    query_normalized = normalize_product_title(query)
    print(f"Normalizado: '{query_normalized}'")
    
    from scrapers.matcher import BRAND_WORDS, GENERIC_WORDS
    
    query_tokens = query_normalized.split()
    core_tokens = [
        t for t in query_tokens 
        if t not in BRAND_WORDS and t not in GENERIC_WORDS and not t.isdigit()
    ]
    print(f"Tokens core: {core_tokens}")
    
    query_volume = extract_volume_ml(query)
    print(f"Volumen original: {query_volume} ml")
    
    valid_concentrations = ["edt", "edp", "edc", "parfum", "cologne", "extrait"]
    query_concentration = next((t for t in query_tokens if t in valid_concentrations), None)
    print(f"Concentración original: {query_concentration}")
    
    brand, _, _, _, _ = parse_product_details(query)
    print(f"Marca detectada: '{brand}'")
    
    q = supabase_writer.table("products").select("title, title_normalized, volume_ml, store_slug")
    q = q.not_.is_("store_slug", "null")
    
    if brand != "Genérico":
        syns = BRAND_SYNONYMS.get(brand, [])
        if syns:
            or_filter = ",".join([f"title_normalized.ilike.%{syn}%" for syn in syns])
            q = q.or_(or_filter)
            
    for token in core_tokens:
        q = q.ilike("title_normalized", f"%{token}%")
        
    q = q.order("volume_ml", desc=False, nullsfirst=False)
    q = q.limit(50)
    
    query_is_dupe = is_dupe_product(query)
    
    try:
        res = execute_with_retry(q)
        products = res.data or []
    except Exception as e:
        print(f"Error en consulta Supabase: {e}")
        return []
        
    suggestions = []
    seen_combinations = set()
    
    # Listado de marcas de clones conocidas
    CLONE_BRANDS = {
        "maison alhambra", "maison al hambra", "fragrance world", "armaf", "lattafa", 
        "afnan", "paris corner", "martin lion", "inzpira", "yodeyma", "divain", "instyle"
    }
    
    for prod in products:
        title = prod["title"]
        title_norm = prod["title_normalized"]
        
        # FILTRO CRÍTICO: Excluir clones si la búsqueda no busca un clon
        title_lower = title.lower()
        query_lower = query.lower()
        is_clone_product = any(cb in title_lower for cb in CLONE_BRANDS) or is_dupe_product(title)
        is_clone_query = any(cb in query_lower for cb in CLONE_BRANDS) or is_dupe_product(query)
        
        if is_clone_product and not is_clone_query:
            continue
            
        prod_volume = prod["volume_ml"]
        if prod_volume is None:
            prod_volume = extract_volume_ml(title)
            
        prod_tokens = title_norm.split()
        prod_concentration = next((t for t in prod_tokens if t in valid_concentrations), None)
        
        is_different_volume = (query_volume is not None and prod_volume is not None and prod_volume != query_volume)
        is_different_concentration = (query_concentration is not None and prod_concentration is not None and prod_concentration != query_concentration)
        
        if query_volume is None and prod_volume is not None:
            is_different_volume = True
            
        if query_concentration is None and prod_concentration is not None:
            is_different_concentration = True
            
        if not (is_different_volume or is_different_concentration):
            continue
            
        combo = (prod_volume or 0, prod_concentration or "")
        if combo in seen_combinations:
            continue
            
        seen_combinations.add(combo)
        
        prod_brand, _, _, _, _ = parse_product_details(title)
        
        # Limpiar el título usando la función local
        prod_clean = clean_title_for_suggestion(title, prod_brand)
        
        # Construir label legible
        label_parts = []
        # Para el label, no incluimos la marca al principio (según el ejemplo del usuario: "Polo Blue EDT 100 ml")
        # Pero sí el nombre limpio
        if prod_clean:
            label_parts.append(prod_clean)
        if prod_concentration:
            label_parts.append(prod_concentration.upper())
        if prod_volume:
            label_parts.append(f"{prod_volume} ml")
            
        label = " ".join(label_parts)
        
        # Para el query listo para buscar, agregamos la marca al principio
        query_parts = []
        brand_to_use = prod_brand if prod_brand != "Genérico" else (brand if brand != "Genérico" else "")
        if brand_to_use:
            query_parts.append(brand_to_use)
        if prod_clean:
            query_parts.append(prod_clean)
        if prod_concentration:
            query_parts.append(prod_concentration.upper())
        if prod_volume:
            query_parts.append(f"{prod_volume} ml")
            
        query_str = " ".join(query_parts)
        
        suggestions.append({
            "label": label,
            "query": query_str
        })
        
        if len(suggestions) >= 6:
            break
            
    print(f"Sugerencias generadas: {len(suggestions)}")
    for s in suggestions:
        print(f" - Label: '{s['label']}'")
        print(f"   Query: '{s['query']}'")
        
    return suggestions

if __name__ == "__main__":
    get_suggestions("Ralph Lauren Polo Blue EDT 100 ml")
    get_suggestions("Acqua di Gio 75ml")
    get_suggestions("Dior Sauvage EDP")
