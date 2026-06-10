import re
import unicodedata

# Palabras irrelevantes a remover durante la normalización (según especificación §5)
IRRELEVANT_WORDS = {
    "de", "para", "con", "el", "la", "los", "las", "eau", "parfum", "toilette",
    "cologne", "perfume", "ml", "unisex", "hombre", "mujer", "men", "women",
    "man", "woman", "spray", "edt"
}

def normalize_product_title(title: str) -> str:
    """
    Normaliza el título de un producto para facilitar el matching.
    Siguiendo las reglas en orden:
    1. Convertir a minúsculas.
    2. Remover acentos.
    3. Remover caracteres especiales excepto letras, números y espacios.
    4. Separar la unidad 'ml' de los números si está junta (ej: '100ml' -> '100 ml').
    5. Remover palabras irrelevantes.
    6. Normalizar múltiples espacios a uno solo y realizar strip.
    """
    if not title:
        return ""
        
    # 1. Convertir a minúsculas
    text = title.lower()
    
    # 2. Remover acentos
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    
    # 3. Remover caracteres especiales excepto letras, números y espacios
    # Mantiene letras inglesas (a-z), números (0-9) y espacios
    text = re.sub(r"[^a-z0-9\s]", "", text)
    
    # 4. Separar la unidad 'ml' de los números
    # Asegura que '100ml' se convierta en '100 ml' para poder filtrar 'ml' como palabra
    text = re.sub(r"(\d+)\s*(ml)\b", r"\1 \2", text)
    
    # 5. Remover palabras irrelevantes (coincidencias completas de palabra)
    words = text.split()
    filtered_words = [w for w in words if w not in IRRELEVANT_WORDS]
    text = " ".join(filtered_words)
    
    # 6. Normalizar múltiples espacios a uno solo y strip
    text = re.sub(r"\s+", " ", text).strip()
    
    return text

def extract_volume_ml(title: str) -> int | None:
    """
    Extrae el volumen en ml de un título si existe (ej: '100ml' o '100 ml' -> 100).
    """
    if not title:
        return None
        
    # Busca patrones de números seguidos de 'ml' con o sin espacio
    match = re.search(r"\b(\d+)\s*ml\b", title, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None
