# 📊 PriceScout Chile — SRS v2.0
## Software Requirements Specification
### Arquitectura Híbrida de Scraping + Gemini 2.5 Flash-Lite

---

| Campo | Detalle |
|---|---|
| **Documento** | SRS PriceScout Chile v2.0 |
| **Cambios vs v1.0** | Arquitectura híbrida + Motor LLM Universal |
| **LLM Principal** | Gemini 2.5 Flash-Lite (Google AI) |
| **Fallback LLM** | Groq Llama 3.3 → GPT-4o-mini |
| **Fecha** | Abril 2026 |
| **Confidencialidad** | Interno / Confidencial |

---

## 1. Resumen de Cambios v1.0 → v2.0

Esta versión introduce la **Arquitectura Híbrida de Scraping**. Los módulos de autenticación, historial, exportación, pagos y diseño visual **NO cambian**. Solo se modifican los módulos de extracción de datos.

| Sección | Estado | Descripción del cambio |
|---|---|---|
| RF-02 — Opción A (Links) | 🔄 Modificado | Se añade routing: dominio conocido → parser manual / dominio desconocido → Motor LLM |
| RF-03 — Opción B (Auto) | 🔄 Modificado | Se añade routing idéntico al RF-02 para búsqueda automática |
| RF-08 — Motor LLM Universal | 🆕 Nuevo | Módulo completo para extracción con Gemini 2.5 Flash-Lite + fallback chain |
| Stack tecnológico | 🔄 Modificado | Se añaden: google-generativeai SDK, LiteLLM, Groq SDK, trafilatura |
| Variables de entorno | 🔄 Modificado | Se añaden: GEMINI_API_KEY, GROQ_API_KEY, LLM_PROVIDER, KNOWN_STORES |
| Códigos de error SCR-XXX | 🔄 Modificado | Se añaden SCR-010, SCR-011, SCR-012, SCR-013 |
| Costos operativos | 🔄 Modificado | Se actualiza con costo LLM Gemini Flash-Lite ($0 en MVP) |
| RF-01, RF-04–07 | ✅ Sin cambios | Auth, resultados, historial, exportación y pagos sin modificaciones |
| FDS (diseño visual) | 🔄 Leve ajuste | Se añade badge "Extraído con IA" para tiendas no conocidas |

---

## 2. Arquitectura Híbrida de Scraping

### 2.1 Principio de Diseño

PriceScout Chile utiliza **dos motores de extracción complementarios**. El sistema selecciona automáticamente el motor más adecuado según el dominio recibido, maximizando velocidad, precisión y costo operativo.

> **🔀 Regla de Routing Central**
>
> - `SI` el dominio está en la whitelist de tiendas conocidas → **Parser Determinista** (gratis, rápido, 100% preciso)
> - `SI` el dominio **NO** está en la whitelist → **Motor LLM Universal** (Gemini 2.5 Flash-Lite)
> - Esta decisión se toma en el Celery Worker **ANTES** de lanzar Playwright.
> - La whitelist es configurable via variable de entorno `KNOWN_STORES`.

---

### 2.2 Motor A — Parser Determinista (Tiendas Conocidas)

| Propiedad | Detalle |
|---|---|
| **Tiendas cubiertas** | Falabella.com · Ripley.cl · MercadoLibre.cl · Paris.cl · Lider.cl · PCFactory.cl · AbcDin.cl · Hites.cl |
| **Tecnología** | Playwright + BeautifulSoup4 + selectores CSS específicos por tienda |
| **Velocidad** | < 10 seg por URL (sin anti-bot) / < 30 seg (con Cloudflare/Akamai) |
| **Costo por extracción** | $0 — Sin llamadas LLM |
| **Confiabilidad** | Alta (determinista). Alerta si tasa de éxito baja < 70% en 24 hrs. |
| **Cobertura estimada** | ~75–80% de todas las búsquedas de usuarios chilenos |
| **Mantenimiento** | Si el HTML cambia, se actualiza el selector (SLA 48 hrs) |

---

### 2.3 Motor B — Extracción Universal con LLM (Tiendas Desconocidas)

| Propiedad | Detalle |
|---|---|
| **LLM Principal** | Gemini 2.5 Flash-Lite — Structured Output nativo (`response_mime_type: application/json`) |
| **LLM Fallback 1** | Groq Llama 3.3 — JSON Mode. Activa si Gemini retorna 429 o falla 2 veces |
| **LLM Fallback 2** | GPT-4o-mini (OpenAI) — Solo último recurso, requiere `OPENAI_API_KEY` |
| **Orquestador** | LiteLLM — Unifica los 3 proveedores bajo una misma interfaz Python |
| **Velocidad** | < 30 seg por URL (Playwright + llamada LLM) |
| **Costo por extracción** | $0 en free tier Gemini (hasta 1.000/día). Luego ~$0.0003 USD |
| **Cobertura** | Cualquier e-commerce chileno con HTML público accesible |
| **Badge en UI** | Price card muestra badge **"Extraído con IA"** (ver FDS v1.1) |

---

### 2.4 Flujo Completo del Pipeline Híbrido

```
Worker recibe → URL + product_name
        │
        ▼
Extrae dominio de la URL
        │
        ▼
¿Dominio en KNOWN_STORES?
        │
    ✅ SÍ ──────────────────────────────────────────────┐
        │                                               │
    ❌ NO                                               │
        │                                   Parser determinista
        ▼                                   (BeautifulSoup / Playwright selectores)
Playwright carga URL (stealth mode)                    │
        │                                              │
        ▼                                              │
Extrae texto visible con trafilatura                   │
(limpia scripts/CSS/nav, max 6.000 tokens)             │
        │                                              │
        ▼                                              │
Llama a Gemini 2.5 Flash-Lite                         │
con structured output Pydantic                         │
        │                                              │
    ✅ OK                                              │
        │                                              │
        ▼                                              │
Valida: 100 ≤ price_clp ≤ 100.000.000 ◄──────────────┘
        │
    ✅ Válido → guarda resultado + confidence_score
    ❌ Inválido → SCR-011 → reintento con prompt mejorado
                          → si falla de nuevo: SCR-010
```

**Si Gemini falla (429 / error):**
```
Gemini 2.5 Flash-Lite → FALLA
        │
        ▼
Groq Llama 3.3 (JSON mode) → FALLA
        │
        ▼
GPT-4o-mini (si OPENAI_API_KEY configurado)
        │
        ▼
Si todos fallan → SCR-010 (marca URL como fallida, continúa con las demás)
```

---

### 2.5 Schema Pydantic de Extracción LLM

```python
from pydantic import BaseModel
from typing import Optional, Literal

class ProductExtraction(BaseModel):
    product_name: str                              # Nombre exacto del producto en la tienda
    price_clp: int                                 # Precio en CLP sin puntos ni símbolos
    price_original_clp: Optional[int] = None      # Precio antes de oferta (None si no hay)
    discount_percent: Optional[int] = None         # % de descuento (None si no hay)
    image_url: Optional[str] = None               # URL de imagen principal del producto
    in_stock: bool                                 # True si hay stock disponible
    confidence: Literal["high", "medium", "low"]  # Auto-evaluación del LLM
    extraction_notes: Optional[str] = None        # Comentario si hubo ambigüedad
```

> **⚠️ Reglas de validación post-extracción**
>
> - Si `confidence == "low"` → mostrar badge de advertencia en UI, no ocultar el resultado
> - Si `price_clp < 100` o `price_clp > 100_000_000` → descartar, registrar SCR-011
> - Si `in_stock == False` → mostrar con estado "Sin stock" (no es un error)
> - Si 2 reintentos al LLM fallan → marcar URL como SCR-010, continuar con las demás

---

## 3. RF-02 Actualizado — Opción A (Links Manuales)

> Versión 2.0: Se mantiene toda la funcionalidad de v1.0 y se añade el routing híbrido por dominio.

| ID | Nombre | Descripción |
|---|---|---|
| RF-02.1 | Ingreso de URLs | Sin cambios vs v1.0. Campo multi-línea, validación de formato y límite por plan. |
| RF-02.2 | Nombre del producto | Sin cambios vs v1.0. Campo opcional para el historial. |
| RF-02.3 | **Routing híbrido automático** | **NUEVO:** Antes de encolar, el backend clasifica cada URL como "conocida" o "desconocida". Invisible para el usuario. |
| RF-02.4 | Disparo de scraping | Sin cambios. Job asíncrono Celery, retorna `job_id` inmediato. |
| RF-02.5 | **Estado en tiempo real** | **ACTUALIZADO:** Progress bar indica por URL: `"Extrayendo..."` o `"Analizando con IA..."` (si es dominio desconocido). |
| RF-02.6 | **Badge "Extraído con IA"** | **NUEVO:** Price Cards de tiendas desconocidas muestran badge índigo para transparencia. |
| RF-02.7 | Límite por plan | Sin cambios. Free: 3 URLs / Pro: 15 / Business: 50 / Enterprise: ilimitado. |
| RF-02.8 | **Whitelist configurable** | **NUEVO:** `KNOWN_STORES` en `.env` define qué dominios usan parser manual. |

---

## 4. RF-03 Actualizado — Opción B (Búsqueda Automática)

> Versión 2.0: El motor de búsqueda automática ahora también puede trabajar con tiendas no conocidas.

| ID | Nombre | Descripción |
|---|---|---|
| RF-03.1 | Campo de búsqueda | Sin cambios. Nombre del producto + SKU opcional. |
| RF-03.2 | **Selección de tiendas** | **ACTUALIZADO:** Además de la lista conocida, el usuario puede escribir dominios adicionales en campo "Otras tiendas" (ej: `eliteperfumes.cl`). Estos usarán el Motor LLM. |
| RF-03.3 | Búsqueda en tiendas conocidas | Sin cambios: navega SERP interna + extrae con parser determinista. |
| RF-03.4 | **Búsqueda en tiendas desconocidas** | **NUEVO:** Para dominios adicionales, el worker ejecuta query via DuckDuckGo → obtiene URL del producto → extrae con Motor LLM. |
| RF-03.5 | **Normalización de resultados** | **ACTUALIZADO:** Resultados de parser y LLM se normalizan al mismo formato. LLM incluye `confidence_score`, parser incluye `verified_parser: true`. |
| RF-03.6 | Disponibilidad por plan | Sin cambios vs v1.0. |

---

## 5. RF-08 NUEVO — Motor LLM Universal

| ID | Nombre | Descripción |
|---|---|---|
| RF-08.1 | **Proveedor principal** | Gemini 2.5 Flash-Lite via `google-generativeai` SDK. Structured Output nativo con `response_mime_type: "application/json"` + `response_schema`. |
| RF-08.2 | **Fallback automático** | Si Gemini retorna 429 o falla 2 veces → cambia a Groq Llama 3.3. Transparente para el usuario. |
| RF-08.3 | **Fallback secundario** | Si Groq falla → intenta GPT-4o-mini. Solo si `OPENAI_API_KEY` configurado. Si no, marca SCR-010. |
| RF-08.4 | **Orquestación LiteLLM** | Los 3 proveedores unificados con LiteLLM. `LLM_PROVIDER` en `.env` permite cambiar sin modificar código. |
| RF-08.5 | **Limpieza del HTML** | Antes de enviar al LLM: extraer texto con `trafilatura`, limpiar scripts/CSS/nav, truncar a max 6.000 tokens. |
| RF-08.6 | **Gestión de quota diaria** | Contador interno de llamadas Gemini. Al superar 900/día (buffer antes del límite de 1.000): alerta interna + cambio automático a Groq. |
| RF-08.7 | **Caching de extracciones** | Mismo producto + mismo dominio en < 30 min: reutiliza resultado cacheado en Redis. Reduce costos y latencia. |
| RF-08.8 | **Logging y monitoreo** | Cada llamada LLM registrada en tabla `llm_calls`: proveedor, modelo, tokens, latencia, costo estimado USD. |
| RF-08.9 | **Prompt versionado** | El prompt de extracción se versiona en tabla `llm_prompts`. Permite A/B testing y rollback. |
| RF-08.10 | **Modo degradado** | Si los 3 LLM fallan: URLs desconocidas → SCR-010. URLs de tiendas conocidas (parsers) se procesan igualmente. Nunca se bloquea una comparación completa. |

---

## 6. Stack Tecnológico — Componentes Nuevos

> Solo se listan los componentes nuevos vs v1.0. El resto del stack permanece igual.

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| **LLM Principal** | `google-generativeai` (SDK oficial) | 0.8+ | SDK oficial Google. Structured output nativo con Pydantic. Más estable que wrappers de terceros. |
| **LLM Orquestador** | `LiteLLM` | 1.x | Unifica Gemini, Groq y OpenAI. Manejo automático de fallbacks y reintentos. |
| **LLM Fallback 1** | `groq` SDK Python | 0.x | Free tier sin límite diario fijo. Llama 3.3 con JSON mode. Latencia ~200ms. |
| **HTML Extractor** | `trafilatura` | 1.x | Extrae solo texto relevante, elimina nav/footer/ads. Reduce tokens enviados al LLM en ~70%. |
| **Búsqueda web** | `duckduckgo-search` (PyPI) | 6.x | Para Opción B en dominios desconocidos. Sin API key requerida. |

### `requirements.txt` — Nuevas dependencias

```txt
google-generativeai>=0.8.0        # Gemini SDK oficial
litellm>=1.0.0                    # Orquestador multi-LLM
groq>=0.9.0                       # Groq SDK para Llama 3.3
trafilatura>=1.8.0                # Extracción de texto limpio de HTML
duckduckgo-search>=6.0.0          # Búsqueda web sin API key
instructor>=1.0.0                 # Alternativa structured output
```

---

## 7. Códigos de Error Nuevos

> Los códigos `SCR-001` a `SCR-009` del SRS v1.0 permanecen sin cambios.

| Código | Nombre | Descripción | Acción del Sistema |
|---|---|---|---|
| **SCR-010** | `LLM_EXTRACTION_FAILED` | Los 3 proveedores LLM fallaron o agotaron quota. | Marcar URL como fallida. Mostrar "No disponible (IA no pudo extraer)". Registrar en Sentry. |
| **SCR-011** | `LLM_PRICE_INVALID` | El LLM retornó precio fuera del rango CLP ($100–$100.000.000). | Descartar resultado. Reintentar 1 vez con prompt explícito. Si falla → SCR-010. |
| **SCR-012** | `LLM_QUOTA_EXHAUSTED` | Se superaron las 900 llamadas diarias a Gemini (límite interno). | Cambiar automáticamente a Groq por el resto del día. Alerta interna al equipo. |
| **SCR-013** | `HTML_EXTRACTION_EMPTY` | `trafilatura` no pudo extraer texto útil (página muy dinámica). | Intentar extracción directa con Playwright. Si sigue vacío → SCR-001. |

---

## 8. Costos Operativos Actualizados

### 8.1 Costo del Motor LLM por Escenario

| Escenario | Proveedor | Costo/extracción | Costo mensual estimado |
|---|---|---|---|
| MVP (<100 users/día, <300 extracciones LLM/día) | Gemini Free | **$0** | **$0** — dentro del free tier |
| Crecimiento (500 users/día, ~1.500 LLM/día) | Gemini Paid | ~$0.0003 USD | ~$13 USD/mes |
| Escala (2.000 users/día, ~6.000 LLM/día) | Gemini Paid | ~$0.0003 USD | ~$54 USD/mes |
| Fallback Groq | Groq Free | **$0** | **$0** |
| Fallback GPT-4o-mini | OpenAI | ~$0.001 USD | Variable, solo casos excepcionales |

### 8.2 Costos Totales Mes 1 (MVP)

| Servicio | Costo |
|---|---|
| Vercel (Frontend) | $0 |
| Railway (Backend + Celery + Redis) | ~$13.500 CLP |
| Supabase (DB + Auth) | $0 |
| Dominio .cl | ~$833 CLP/mes |
| Gemini 2.5 Flash-Lite (LLM) | **$0** — free tier hasta 1.000/día |
| Groq (Fallback) | **$0** |
| duckduckgo-search | **$0** |
| **TOTAL** | **~$14.333 CLP/mes** |

> ✅ **Break-even: 3 suscriptores Pro ($4.990/mes). El Motor LLM no añade costo en el MVP.**

---

## 9. Variables de Entorno Completas

```env
# ── SUPABASE ──────────────────────────────────────────────────────
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres

# ── AUTH ──────────────────────────────────────────────────────────
JWT_SECRET=your-secret-key-minimum-32-chars
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# ── LLM CONFIGURATION (Arquitectura Híbrida) ──────────────────────
LLM_PROVIDER=gemini                    # gemini | groq | openai
GEMINI_API_KEY=AIza...                 # Obligatorio — Google AI Studio
GROQ_API_KEY=gsk_...                   # Obligatorio — groq.com/keys
OPENAI_API_KEY=sk-...                  # Opcional — último recurso
LLM_DAILY_QUOTA_LIMIT=900             # Alerta antes del límite de Gemini (1.000/día)

# ── SCRAPING ──────────────────────────────────────────────────────
KNOWN_STORES=falabella.com,ripley.cl,mercadolibre.cl,paris.cl,lider.cl,pcfactory.cl,abcdin.cl,hites.cl
SCRAPING_TIMEOUT_SEC=60
SCRAPING_RATE_LIMIT_PER_DOMAIN=1      # requests/seg máximo por dominio

# ── CELERY + REDIS ─────────────────────────────────────────────────
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# ── PAGOS ──────────────────────────────────────────────────────────
TRANSBANK_COMMERCE_CODE=597055555532
TRANSBANK_API_KEY=579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C
TRANSBANK_ENVIRONMENT=integration     # integration | production
```

---

## 10. Adición al Prompt de Antigravity

> Añadir este bloque al `PROMPT_INICIO_ANTIGRAVITY.md` dentro de la sección **PASO 3 — Backend**.

```
CAMBIO DE ARQUITECTURA v2.0: El backend usa scraping HÍBRIDO.

En tasks/scraping_router.py implementa la lógica de routing:
  1. Recibe URL + product_name
  2. Si domain in KNOWN_STORES → llama a get_parser(domain).extract(url)
  3. Si domain NOT in KNOWN_STORES → llama a llm_extractor.extract(url, product_name)

En tasks/llm_extractor.py implementa el Motor LLM:
  - Usa trafilatura para limpiar HTML antes de enviar al LLM
  - Proveedor principal: Gemini 2.5 Flash-Lite con structured output Pydantic
  - Fallback automático a Groq Llama 3.3 si Gemini falla
  - Valida que price_clp esté entre 100 y 100_000_000
  - Registra cada llamada en tabla llm_calls de Supabase

Modelo Pydantic: ProductExtraction (ver Sección 2.5 de este documento)
Variables requeridas: GEMINI_API_KEY, GROQ_API_KEY, LLM_PROVIDER
KNOWN_STORES se lee de variable de entorno como lista separada por comas.
```

---

*PriceScout Chile — SRS v2.0 (Arquitectura Híbrida + Gemini 2.5 Flash-Lite) · Abril 2026 · Confidencial*
