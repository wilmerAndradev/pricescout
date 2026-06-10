# Instrucción para Agente — Módulo de Extracción de Datos (Scraping Engine)
## Proyecto: PriceScout Chile

---

## CONTEXTO DEL PROYECTO

Estás trabajando en **PriceScout Chile**, un SaaS de inteligencia de precios para el mercado chileno. Es un monorepo con la siguiente estructura relevante:

```
pricescout/
├── apps/
│   ├── api/          ← Backend Python (FastAPI + Celery)
│   │   ├── scrapers/ ← AQUÍ vas a trabajar principalmente
│   │   └── ...
│   └── web/          ← Frontend Next.js (no tocar en esta tarea)
```

**Stack del backend:** Python 3.12, FastAPI, Celery, Redis, Supabase (PostgreSQL), `scrapling[all]` como motor de scraping, `google-generativeai` (Gemini 2.5 Flash-Lite) para extracción semántica, `trafilatura` para limpiar HTML.

---

## OBJETIVO DE ESTA TAREA

Implementar el **módulo completo de extracción de datos de tiendas** con soporte para dos estrategias de sincronización, replicando el enfoque que usa RedPerfumes.cl pero generalizado para cualquier categoría de producto.

---

## LO QUE DEBES CONSTRUIR

### Estructura de archivos a crear

```
apps/api/scrapers/
├── __init__.py
├── base.py                  ← Clase base abstracta ScraperBase
├── strategies/
│   ├── __init__.py
│   ├── shopify_json.py      ← Estrategia A: Shopify /products.json
│   ├── shopify_js.py        ← Estrategia B: Shopify endpoint JS alternativo
│   └── html_parser.py       ← Estrategia C: Scraping HTML genérico con Scrapling + Gemini
├── normalizer.py            ← Normalizador de nombres de productos
├── registry.py              ← Registro de tiendas con su estrategia asignada
└── tasks.py                 ← Tareas Celery para sync en background
```

---

## ESPECIFICACIONES DETALLADAS

### 1. `base.py` — Clase base abstracta

```python
# Cada estrategia debe retornar una lista de este modelo
class ScrapedProduct(BaseModel):
    store_slug: str           # identificador único de la tienda (ej: "cosmetic")
    store_name: str           # nombre legible (ej: "Cosmetic")
    store_url: str            # URL base de la tienda
    title: str                # nombre del producto sin normalizar
    title_normalized: str     # nombre normalizado (usar normalizer.py)
    price: float              # precio en CLP
    currency: str             # siempre "CLP"
    url: str                  # URL directa al producto
    image_url: str | None
    available: bool           # si tiene stock
    variants: list[dict]      # variantes (tallas, ml, etc.) si existen
    raw_data: dict            # JSON crudo original para debug
    scraped_at: datetime      # timestamp UTC del momento del scrape
    sync_method: str          # "shopify_json" | "shopify_js" | "html_parser"
```

La clase base abstracta `ScraperBase` debe tener:
- Método abstracto `async def fetch_products(self) -> list[ScrapedProduct]`
- Método `async def run(self) -> SyncResult` que llama fetch_products, maneja errores, y retorna estadísticas (total, nuevos, actualizados, errores)
- Rate limiting interno: esperar entre 1-3 segundos entre requests (aleatorio) para no saturar las tiendas
- Logging estructurado con el slug de la tienda en cada log

---

### 2. `strategies/shopify_json.py` — Estrategia principal

**Cómo funciona:** Shopify expone un endpoint público sin autenticación:
```
GET https://{dominio}/products.json?limit=250&page={n}
```
Retorna JSON con todos los productos. Paginar hasta que `products` venga vacío.

**Implementar:**
- Paginación automática (page=1, 2, 3... hasta respuesta vacía)
- Usar `httpx` con headers de browser real (User-Agent) para evitar bloqueos
- Parsear el JSON de Shopify: cada producto tiene `title`, `variants[].price`, `images[].src`, `handle` para construir la URL
- Construir URL del producto: `{store_url}/products/{handle}`
- Manejar el caso donde `available` viene en `variants[].available`
- Timeout de 30 segundos por request
- Reintentos: 3 intentos con backoff exponencial ante errores 5xx o timeout

**Formato JSON que devuelve Shopify:**
```json
{
  "products": [
    {
      "id": 123,
      "title": "Nombre del Producto",
      "handle": "nombre-del-producto",
      "images": [{"src": "https://..."}],
      "variants": [
        {
          "id": 456,
          "title": "100ml",
          "price": "29990.00",
          "available": true
        }
      ]
    }
  ]
}
```

---

### 3. `strategies/shopify_js.py` — Estrategia alternativa Shopify

Para tiendas Shopify que bloquean `/products.json`. Usar el endpoint alternativo:
```
GET https://{dominio}/collections/all/products.json?limit=250&page={n}
```
Si también falla, intentar extraer del objeto JavaScript `window.ShopifyAnalytics` en el HTML de la homepage usando `scrapling`.

Misma lógica de paginación y parseo que `shopify_json.py`.

---

### 4. `strategies/html_parser.py` — Estrategia para tiendas custom

Para tiendas que no son Shopify. Usar **Motor B (extracción semántica con IA)**:

**Flujo:**
1. Usar `scrapling.StealthyFetcher` para cargar la página de catálogo/listado de la tienda
2. Limpiar el HTML con `trafilatura.extract()` para reducir tokens
3. Enviar el HTML limpio a **Gemini 2.5 Flash-Lite** con el siguiente prompt:

```python
EXTRACTION_PROMPT = """
Eres un extractor de datos de e-commerce. Del siguiente HTML de una tienda online chilena,
extrae TODOS los productos visibles en la página de listado.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin backticks.
El JSON debe tener esta estructura exacta:
{
  "products": [
    {
      "title": "nombre completo del producto",
      "price": 29990,
      "currency": "CLP",
      "url": "URL absoluta del producto o ruta relativa",
      "image_url": "URL de la imagen principal o null",
      "available": true,
      "variants": []
    }
  ],
  "next_page_url": "URL de la siguiente página o null si es la última"
}

Si el precio tiene puntos de miles (29.990), conviértelo a número entero (29990).
Si no puedes extraer un campo, usa null.

HTML:
{html}
"""
```

4. Parsear el JSON de respuesta
5. Seguir `next_page_url` hasta que sea null (paginación automática)
6. Fallback: si Gemini falla, intentar con **Groq (Llama 3.3)**

**Configuración del cliente Gemini:**
```python
import google.generativeai as genai

model = genai.GenerativeModel("gemini-2.5-flash-lite-preview-06-17")
# max_tokens: 8000, temperature: 0 (determinista)
```

---

### 5. `normalizer.py` — Normalizador de nombres

Este es el componente más importante para el matching entre tiendas.

**Implementar la función `normalize_product_title(title: str) -> str`:**

Reglas de normalización en orden:
1. Convertir a minúsculas
2. Remover acentos (á→a, é→e, etc.) usando `unicodedata`
3. Remover caracteres especiales excepto letras, números y espacios
4. Remover palabras irrelevantes: `["de", "para", "con", "el", "la", "los", "las", "eau", "de", "parfum", "toilette", "cologne", "perfume", "ml", "unisex", "hombre", "mujer", "men", "women", "man", "woman", "spray"]`
5. Normalizar múltiples espacios a uno solo
6. Strip

**Ejemplos esperados:**
```
"Chanel N°5 Eau de Parfum 100ml Mujer" → "chanel n5 100"
"DIOR SAUVAGE EDP 60ML HOMBRE"         → "dior sauvage edp 60"
"Carolina Herrera 212 Men EDT 200 ml"  → "carolina herrera 212 200"
```

También implementar `extract_volume_ml(title: str) -> int | None` que extraiga el volumen en ml si existe.

---

### 6. `registry.py` — Registro de tiendas

Archivo de configuración que define todas las tiendas a scrapear y su estrategia:

```python
from dataclasses import dataclass
from enum import Enum

class SyncMethod(str, Enum):
    SHOPIFY_JSON = "shopify_json"
    SHOPIFY_JS = "shopify_js"
    HTML_PARSER = "html_parser"

@dataclass
class StoreConfig:
    slug: str
    name: str
    url: str
    sync_method: SyncMethod
    catalog_url: str | None = None   # solo para html_parser, URL de inicio del catálogo
    active: bool = True

STORES: list[StoreConfig] = [
    # Shopify JSON (método fácil)
    StoreConfig(slug="cosmetic", name="Cosmetic", url="https://cosmetic.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="comprarenchile", name="ComprarenChile", url="https://comprarenchile.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="elite-perfumes", name="Elite Perfumes", url="https://www.eliteperfumes.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="lodoro", name="Lodoro", url="https://www.lodoro.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="multimarcas", name="MultiMarcas Perfumes", url="https://multimarcasperfumes.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="mundo-aromas", name="Mundo Aromas", url="https://mundoaromas.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="perfumisimo", name="Perfumisimo", url="https://www.perfumisimo.cl", sync_method=SyncMethod.SHOPIFY_JSON),
    StoreConfig(slug="productos-de-lujo", name="Productos de Lujo", url="https://productosdelujo.cl", sync_method=SyncMethod.SHOPIFY_JSON),

    # Shopify JS (fallback)
    StoreConfig(slug="silk-perfumes", name="Silk Perfumes", url="https://silkperfumes.cl", sync_method=SyncMethod.SHOPIFY_JS),
    StoreConfig(slug="yauras", name="Yauras", url="https://yauras.cl", sync_method=SyncMethod.SHOPIFY_JS),

    # HTML Parser (tiendas custom)
    StoreConfig(slug="alarab", name="Alarab", url="https://www.alarab.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://www.alarab.cl/collections/all"),
    StoreConfig(slug="alisha", name="Alisha Perfumes", url="https://alishaperfumes.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://alishaperfumes.cl/productos"),
    StoreConfig(slug="paris-perfumes", name="ParisPerfumes", url="https://www.parisperfumes.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://www.parisperfumes.cl/tienda"),
    StoreConfig(slug="sairam", name="Sairam", url="https://sairam.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://sairam.cl/catalogo"),
    StoreConfig(slug="joy-perfumes", name="JoyPerfumes", url="https://joyperfumes.cl", sync_method=SyncMethod.HTML_PARSER, catalog_url="https://joyperfumes.cl/productos"),
]

def get_store_by_slug(slug: str) -> StoreConfig | None:
    return next((s for s in STORES if s.slug == slug), None)

def get_active_stores() -> list[StoreConfig]:
    return [s for s in STORES if s.active]
```

---

### 7. `tasks.py` — Tareas Celery

```python
# Tarea para sincronizar UNA tienda
@celery_app.task(bind=True, max_retries=3)
async def sync_store(self, store_slug: str) -> dict:
    ...

# Tarea para sincronizar TODAS las tiendas activas en paralelo
@celery_app.task
async def sync_all_stores() -> dict:
    # Lanzar sync_store.delay() para cada tienda activa
    # Retornar resumen: total tiendas, tiendas con error
    ...

# Tarea programada (usar celery beat): cada 6 horas
# Configurar en celeryconfig.py:
# beat_schedule = {
#     "sync-all-stores": {
#         "task": "scrapers.tasks.sync_all_stores",
#         "schedule": crontab(minute=0, hour="*/6"),
#     }
# }
```

**Después de cada sync exitoso, guardar en Supabase:**
- Tabla `products`: upsert por `(store_slug, title_normalized)` — actualizar precio si cambió
- Tabla `price_history`: insert siempre con el precio actual y timestamp — esto alimenta los gráficos de historial

---

### 8. Endpoint FastAPI para trigger manual

Agregar en `apps/api/routers/scraper.py`:

```python
# POST /api/v1/scraper/sync/{store_slug}  — sync de una tienda (admin only)
# POST /api/v1/scraper/sync-all           — sync de todas (admin only)
# GET  /api/v1/scraper/status             — estado del último sync por tienda
```

---

## ESQUEMA DE BASE DE DATOS (Supabase)

Crear las siguientes tablas si no existen. Generar el archivo `apps/api/db/migrations/001_scraper_tables.sql`:

```sql
-- Tiendas registradas
CREATE TABLE IF NOT EXISTS stores (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    sync_method TEXT NOT NULL,
    catalog_url TEXT,
    active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_sync_products_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos normalizados (uno por tienda)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_slug TEXT REFERENCES stores(slug),
    title TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'CLP',
    url TEXT NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    volume_ml INTEGER,
    variants JSONB DEFAULT '[]',
    raw_data JSONB,
    sync_method TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_slug, title_normalized)
);

-- Historial de precios (serie temporal)
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_slug TEXT NOT NULL,
    title_normalized TEXT NOT NULL,
    price NUMERIC NOT NULL,
    available BOOLEAN DEFAULT true,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_products_title_normalized ON products(title_normalized);
CREATE INDEX IF NOT EXISTS idx_products_store_slug ON products(store_slug);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at DESC);
```

---

## VARIABLES DE ENTORNO REQUERIDAS

Agregar al `.env` del backend:

```env
# Gemini (para html_parser)
GOOGLE_API_KEY=your_google_api_key

# Groq (fallback para html_parser)
GROQ_API_KEY=your_groq_api_key

# Supabase (ya existente en el proyecto)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Redis (ya existente, broker de Celery)
REDIS_URL=redis://localhost:6379/0

# Scraping config
SCRAPER_REQUEST_DELAY_MIN=1   # segundos mínimo entre requests
SCRAPER_REQUEST_DELAY_MAX=3   # segundos máximo entre requests
SCRAPER_MAX_RETRIES=3
SCRAPER_TIMEOUT=30
```

---

## DEPENDENCIAS A AGREGAR en `requirements.txt`

```
scrapling[all]>=0.4.0     # ya debe estar
google-generativeai>=0.8.0 # ya debe estar
groq>=0.9.0               # ya debe estar
trafilatura>=1.8.0         # ya debe estar
httpx>=0.27.0              # cliente HTTP async
tenacity>=8.0.0            # reintentos con backoff
```

---

## CRITERIOS DE ÉXITO

Al terminar esta tarea, debe ser posible ejecutar:

```bash
# Sync manual de una tienda Shopify
python -m scrapers.tasks sync_store cosmetic

# Sync manual de una tienda HTML
python -m scrapers.tasks sync_store sairam

# Sync de todas las tiendas
python -m scrapers.tasks sync_all_stores

# Ver productos en Supabase
# SELECT store_slug, COUNT(*) FROM products GROUP BY store_slug;
```

Y el resultado esperado es:
- Productos guardados en la tabla `products` con precios en CLP
- Historial registrado en `price_history`
- Logs claros indicando cuántos productos se sincronizaron por tienda
- Sin errores en tiendas Shopify (método JSON es determinista)
- Al menos 80% de productos extraídos correctamente en tiendas HTML parser

---

## NOTAS IMPORTANTES

1. **No modificar** el frontend (`apps/web/`) en esta tarea
2. **No inventar tiendas** — usar solo las del `registry.py` definido arriba
3. Para `html_parser`, si la URL del catálogo no es correcta, intentar `/catalogo`, `/productos`, `/tienda`, `/shop`, `/collections/all` en ese orden
4. El normalizer es crítico — el matching de precios entre tiendas depende de que `title_normalized` sea consistente
5. Usar `async/await` en todo el código del scraper para no bloquear el event loop de FastAPI
6. Agregar `try/except` granular: un error en una tienda no debe detener el sync de las demás
