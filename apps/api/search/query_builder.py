"""
search/query_builder.py — Preparación de texto de búsqueda para PriceScout
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ya no hay cascada de estrategias: el SQL maneja la jerarquía internamente
usando OR para filtrar y score compuesto (AND*0.7 + OR*0.3) para ordenar.
El query_builder solo limpia y prepara el texto del usuario.
"""

import re
import unicodedata

# Stopwords irrelevantes para búsqueda de perfumes
STOPWORDS = {
    "de", "la", "el", "los", "las", "para", "con", "una", "uno",
    "un", "en", "por", "del", "al", "y", "o", "a", "e"
}


def normalize_token(token: str) -> str:
    """Quita acentos y convierte a minúsculas."""
    nfkd = unicodedata.normalize("NFKD", token)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def build_search_query(user_input: str) -> dict:
    """
    Limpia el input del usuario y extrae tokens relevantes.

    Ya no hay cascada de estrategias — el SQL maneja la jerarquía
    internamente usando OR para filtrar y score compuesto para ordenar.

    Retorna:
        {
            "query_text": str,    # texto limpio para la función SQL
            "tokens": list[str],  # palabras individuales extraídas
            "token_count": int    # cantidad de tokens (útil para el frontend)
        }
    """
    # Limpiar: quitar caracteres especiales excepto letras, números, espacios
    clean = re.sub(r"[^\w\s]", " ", user_input, flags=re.UNICODE)

    # Tokenizar: palabras de al menos 2 caracteres
    tokens = [t for t in clean.split() if len(t) >= 2]

    # Filtrar stopwords — solo si quedan al menos 2 tokens significativos
    filtered = [t for t in tokens if normalize_token(t) not in STOPWORDS]
    if len(filtered) < 2:
        filtered = tokens  # mantener todo si queda muy poco

    return {
        "query_text":  " ".join(filtered),
        "tokens":      filtered,
        "token_count": len(filtered),
    }
