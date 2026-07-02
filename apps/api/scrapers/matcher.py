import re

from scrapers.normalizer import (
    extract_volume_ml,
    fuzzy_match_tokens,
    is_dupe_product,
    normalize_product_title,
)

# Umbrales de corte
SCORE_EXACT = 0.80     # exact_results
SCORE_RELATED = 0.55   # related_results (variantes, tamaños distintos)
SCORE_DUPE = 0.25      # dupe_results (is_dupe=True)
SCORE_DISCARD = 0.25   # por debajo de esto, descartar

# Palabras de marcas comunes para excluir del núcleo de tokens core
BRAND_WORDS = {
    "dior", "chanel", "armani", "giorgio", "paco", "rabanne", "carolina", "herrera",
    "versace", "hugo", "boss", "calvin", "klein", "ck", "yves", "saint", "laurent", "ysl",
    "guerlain", "givenchy", "tom", "ford", "creed", "bvlgari", "bulgari", "dolce", "gabbana",
    "jean", "paul", "gaultier", "jpg", "montblanc", "ralph", "lauren", "polo", "hermes",
    "prada", "mugler", "thierry", "valentino", "nautica", "issey", "miyake", "kenzo", "lacoste",
    "antonio", "banderas", "diesel", "elizabeth", "arden", "estee", "lauder", "clinique",
    "shiseido", "victoria", "secret", "oster", "asus", "nike",
    "lattafa", "armaf", "afnan", "rasasi", "al", "haramain", "maison", "alhambra",
    "mancera", "montale", "xerjoff", "roja", "parfums", "marly", "byredo", "diptyque",
    "amouage", "le", "labo", "kilian", "penhaligon", "juliette", "gun", "initio",
    "cartier", "chloe", "lancome", "gucci", "burberry", "coach", "salvatore", "ferragamo",
    "moschino", "lolita", "lempicka", "juicy", "couture", "elizabeth", "taylor", "britney",
    "spears", "paris", "hilton", "shakira", "perry", "ellis", "davidoff", "jo", "malone",
    "tiffany", "boucheron", "lalique", "caron"
}

# Palabras genéricas comunes de retail y perfumería para excluir de tokens core
GENERIC_WORDS = {
    # Tipos y concentraciones
    "edp", "edt", "edc", "parfum", "cologne", "extrait",
    # Palabras comunes de retail y embalaje
    "perfume", "fragrance", "spray", "unisex", "homme", "femme", "men", "women",
    "man", "woman", "tester", "decant", "muestra", "sample", "travel", "size",
    "miniatura", "nuevo", "new", "original", "sellado", "caja", "box", "ml",
    "set", "estuche", "pack", "cofre", "kit", "deo", "desodorante", "vaporisateur",
    "natural", "luxe", "body", "splash", "mist", "roll", "on", "oil", "attar",
    "colonia", "aromas"
}

def score_match(query: str, product_title: str, return_detail: bool = False):
    """
    Compara un query de búsqueda con el título de un producto.
    Retorna un score de relevancia continuo entre 0.0 y 1.0.
    """
    if not query or not product_title:
        if return_detail:
            return 0.0, {"token_scores": {}, "penalties": ["empty_input"], "bonuses": []}
        return 0.0

    # Paso 1 — Normalizar query y producto
    query_normalized = normalize_product_title(query)
    product_normalized = normalize_product_title(product_title)

    query_tokens = query_normalized.split()
    product_tokens = product_normalized.split()

    if not query_tokens or not product_tokens:
        if return_detail:
            return 0.0, {"token_scores": {}, "penalties": ["no_tokens"], "bonuses": []}
        return 0.0

    # Paso 2 — Calcular mejores coincidencias de tokens
    token_scores = {}
    for qt in query_tokens:
        best = max((fuzzy_match_tokens(qt, pt) for pt in product_tokens), default=0.0)
        token_scores[qt] = best

    # Paso 3 — Score base (promedio de scores de tokens)
    base_score = sum(token_scores.values()) / len(query_tokens)

    # Paso 4 — Penalizaciones
    penalties_list = []
    penalties_val = 0.0
    has_extra_product_core = False

    # - Mismatch de tokens "core" del producto (nombre específico/modelo)
    core_tokens = []
    for qt in query_tokens:
        if (
            qt not in BRAND_WORDS
            and qt not in GENERIC_WORDS
            and not qt.isdigit()
        ):
            core_tokens.append(qt)

    if core_tokens:
        core_scores = []
        for qct in core_tokens:
            best_core_match = max((fuzzy_match_tokens(qct, pt) for pt in product_tokens), default=0.0)
            core_scores.append(best_core_match)

        # Si algún token core del query está completamente ausente (match == 0.0)
        # o el promedio de matches de los tokens core es muy bajo (< 0.50)
        if any(cs == 0.0 for cs in core_scores) or (sum(core_scores) / len(core_tokens) < 0.50):
            penalties_val += 0.60
            penalties_list.append("core_mismatch")

    # - Detectar si el producto tiene tokens core adicionales (flanker/variante)
    product_core_tokens = []
    for pt in product_tokens:
        if (
            pt not in BRAND_WORDS
            and pt not in GENERIC_WORDS
            and not pt.isdigit()
        ):
            product_core_tokens.append(pt)

    if product_core_tokens:
        for pct in product_core_tokens:
            best_pct_match = max((fuzzy_match_tokens(pct, qct) for qct in core_tokens), default=0.0)
            if best_pct_match < 0.50:
                has_extra_product_core = True
                break

    if has_extra_product_core:
        penalties_val += 0.30
        penalties_list.append("flanker_variant")

    # - El producto tiene más del doble de tokens que el query
    if len(product_tokens) > 2 * len(query_tokens):
        penalties_val += 0.15
        penalties_list.append("length_excess")

    # - Algún token numérico del query no coincide exactamente en el producto
    q_vol = extract_volume_ml(query)
    has_volume_mismatch = False
    has_series_mismatch = False

    for qt in query_tokens:
        if qt.isdigit():
            val = int(qt)
            is_volume = (q_vol is not None and val == q_vol)

            # Buscar si este token numérico existe en el producto
            matched_in_product = False
            for pt in product_tokens:
                if fuzzy_match_tokens(qt, pt) == 1.0:
                    matched_in_product = True
                    break

            if not matched_in_product:
                if is_volume:
                    has_volume_mismatch = True
                else:
                    has_series_mismatch = True

    if has_series_mismatch:
        penalties_val += 0.65
        penalties_list.append("series_mismatch")
    elif has_volume_mismatch:
        penalties_val += 0.15
        penalties_list.append("volume_mismatch")

    # - El producto es un clon / dupe / inspiración
    if is_dupe_product(product_title):
        penalties_val += 0.50
        penalties_list.append("is_dupe")

    # - El título del producto contiene palabras de retail
    retail_words = {"tester", "decant", "muestra", "sample"}
    product_title_lower = product_title.lower()
    product_title_words = set(re.findall(r"\b\w+\b", product_title_lower))
    if any(w in product_title_words for w in retail_words):
        penalties_val += 0.10
        penalties_list.append("retail_word")

    # Paso 5 — Bonificaciones
    bonuses_list = []
    bonuses_val = 0.0

    # - Todos los tokens del query tienen score > 0.9 (y no es un flanker/variante)
    if all(s > 0.9 for s in token_scores.values()) and not has_extra_product_core:
        bonuses_val += 0.10
        bonuses_list.append("all_tokens_high_score")

    # - El primer token del query coincide con el primer token del producto
    if query_tokens and product_tokens:
        if fuzzy_match_tokens(query_tokens[0], product_tokens[0]) > 0.8:
            bonuses_val += 0.05
            bonuses_list.append("first_token_brand_match")

    # Paso 6 — Score final
    final_score = base_score + bonuses_val - penalties_val
    final_score = max(0.0, min(1.0, final_score))

    if return_detail:
        detail = {
            "token_scores": token_scores,
            "penalties": penalties_list,
            "bonuses": bonuses_list
        }
        return final_score, detail
    return final_score
