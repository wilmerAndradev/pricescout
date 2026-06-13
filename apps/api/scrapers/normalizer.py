import re
import unicodedata
from rapidfuzz.distance import Levenshtein

# Stopwords a remover (según especificación §5)
STOPWORDS = {
    # artículos y preposiciones
    "de", "para", "con", "el", "la", "los", "las", "del", "al",
    # palabras genéricas de producto
    "perfume", "fragrance", "spray", "unisex",
    "hombre", "mujer", "men", "women", "man", "woman",
    "pour", "homme", "femme",
    # palabras de retail que no forman parte del nombre
    "tester", "decant", "muestra", "sample", "travel",
    "size", "miniatura", "nuevo", "new", "original",
    "sellado", "caja", "box",
    # unidad de medida (para remover tras normalizar el volumen)
    "ml",
    # abreviaciones de género residuales (Mujer, Hombre, Unisex)
    "m", "h", "u"
}

# Indicadores de duplicados / inspiraciones / clones
DUPE_INDICATORS = [
    "inspirado en", "inspirado", "inspired by", "dupe", "tipo",
    "estilo", "similar a", "version de", "al estilo",
    "attar", "aceite arabe", "concentrado arabe", "arabian",
    "impression", "impression of", "our version of", "compare to"
]

def normalize_product_title(title: str) -> str:
    """
    Normaliza el título de un producto para facilitar el matching.
    """
    if not title:
        return ""

    # 1. Convertir a minúsculas
    text = title.lower()

    # 2. Reemplazos iniciales de caracteres especiales
    text = text.replace("&", "and")
    text = text.replace("/", " ")

    # 3. Estandarizar formato N°5, No 5, #5, n5, etc. a "5" (removiendo el prefijo de número)
    text = re.sub(r"(?:\b[nN](?:[oO]|°|º|\.|\s)*|#)\s*(\d+)\b", r"\1", text)


    # 4. Remover caracteres especiales de grado residuales
    text = text.replace("°", "").replace("º", "")

    # 5. Estandarizar tipo de fragancia
    text = re.sub(r"\beau\s+de\s+parfum\b|\be\.d\.p\b|\bedp\b", "edp", text)
    text = re.sub(r"\beau\s+de\s+toilette\b|\be\.d\.t\b|\bedt\b", "edt", text)
    text = re.sub(r"\beau\s+de\s+cologne\b|\bedc\b", "edc", text)
    text = re.sub(r"\bpure\s+parfum\b|\bpp\b", "parfum", text)

    # 6. Estandarizar volumen
    text = re.sub(r"\b(\d+)\s*(?:ml|ML|mL|Ml|Mls|mls)\b", r"\1 ml", text)

    # 7. Remover acentos
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )

    # 8. Remover caracteres especiales excepto letras, números y espacios
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    # 9. Remover stopwords
    words = text.split()
    filtered = [w for w in words if w not in STOPWORDS]
    text = " ".join(filtered)

    # 10. Normalizar múltiples espacios a uno solo y strip
    text = re.sub(r"\s+", " ", text).strip()

    return text

def extract_volume_ml(title: str) -> int | None:
    """
    Extrae el volumen en ml de un título si existe (ej: '100ml' o '100 ml' -> 100).
    """
    if not title:
        return None
    match = re.search(r"\b(\d+)\s*(?:ml|ML|mL|Ml|Mls|mls)\b", title, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None

def is_dupe_product(title: str) -> bool:
    """
    Retorna True si el título contiene algún indicador de clon/inspiración.
    """
    if not title:
        return False
    # Normalizar a minúsculas sin acentos
    text = title.lower()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    for indicator in DUPE_INDICATORS:
        if indicator in text:
            return True
    return False

def extract_dupe_reference(title: str) -> str | None:
    """
    Extrae el nombre del perfume original al que hace referencia la inspiración.
    """
    if not is_dupe_product(title):
        return None

    text_lower = title.lower()
    text_clean = "".join(
        c for c in unicodedata.normalize("NFD", text_lower)
        if unicodedata.category(c) != "Mn"
    )

    # Buscar el indicador más específico/largo primero
    sorted_indicators = sorted(DUPE_INDICATORS, key=len, reverse=True)
    found_indicator = None
    start_idx = -1

    for ind in sorted_indicators:
        idx = text_clean.find(ind)
        if idx != -1:
            found_indicator = ind
            start_idx = idx
            break

    if not found_indicator:
        return None

    ind_len = len(found_indicator)
    post_indicators = {
        "inspirado en", "inspirado", "inspired by", "similar a", "version de",
        "al estilo", "tipo", "estilo", "impression of", "our version of", "compare to", "dupe"
    }

    if found_indicator in post_indicators:
        ref_text = title[start_idx + ind_len:]
    else:
        ref_text = title[:start_idx]

    # Limpieza de caracteres de separación
    ref_text = ref_text.strip().strip("-").strip(":").strip("—").strip()

    # Normalizar el fragmento extraído
    normalized_ref = normalize_product_title(ref_text)

    # Remover tokens numéricos puros (volumen) del final para dejar la marca y modelo limpia
    if normalized_ref:
        words = [w for w in normalized_ref.split() if not w.isdigit()]
        normalized_ref = " ".join(words)

    return normalized_ref if normalized_ref else None

def fuzzy_match_tokens(a: str, b: str) -> float:
    """
    Compara dos tokens individuales. Retorna similitud 0.0–1.0.
    """
    if a == b:
        return 1.0

    # Si alguno contiene dígitos, la coincidencia debe ser exacta
    if any(c.isdigit() for c in a) or any(c.isdigit() for c in b):
        return 0.0

    # Coincidencia exacta obligatoria para tokens cortos
    if len(a) <= 3 or len(b) <= 3:
        return 0.0

    # Tolerar hasta 1 carácter de diferencia usando Levenshtein
    dist = Levenshtein.distance(a, b)
    if dist <= 1:
        return 1.0 - (dist / max(len(a), len(b)))
    return 0.0
