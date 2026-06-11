# AGENTS.md — PriceScout Chile
# Leído automáticamente por Antigravity, Cursor y Claude Code al iniciar cada agente.
# Reglas universales del proyecto. Overrides específicos de Antigravity van en GEMINI.md.
# Última actualización: Junio 2026

---

## 🧠 Qué es este proyecto

**PriceScout Chile** es una plataforma SaaS de inteligencia competitiva y monitoreo de precios
en tiempo real para el mercado chileno (expansión futura a LATAM). El usuario escribe el nombre
de un producto y el motor descubre automáticamente en qué tiendas se vende y a qué precio,
sin necesidad de pegar URLs ni configurar nada.

**Versión activa:** SRS v4.0 — Motor de Búsqueda Autónomo por Nombre de Producto.
**Documento fuente de verdad:** PriceScout_Chile_SRS_v4_0.md (raíz del repo).
**Spec funcional:** PriceScout_Chile_FDS_v1_0.md (raíz del repo).
**Prompt scraper:** pricescout_scraper_agent_prompt.md (raíz del repo).

> ⚠️ ANTES DE ESCRIBIR CÓDIGO: lee los documentos relevantes a tu dominio.
> No asumas comportamiento del sistema. Consúltalo en el SRS/FDS.

---

## 🏗️ Arquitectura del Sistema

Monorepo: https://github.com/wilmerAndradev/pricescout.git — rama: main

    apps/
      web/               → Frontend: Next.js 16 + React + Tailwind CSS v4 + shadcn/ui
      api/               → Backend: FastAPI (Python 3.12) + Celery + Scrapling
    packages/
      shared/            → Tipos TypeScript compartidos
    supabase/
      migrations/        → SQL con RLS + Triggers (PostgreSQL via Supabase)
    .agents/
      skills/            → Skills de agentes Antigravity (slash commands)
    .github/
      workflows/         → GitHub Actions: CI, tests, lint, deploy
    docker-compose.yml   → Redis + FastAPI + Celery Worker (dev local)

Flujo de datos:

    Frontend (Next.js 16)
      ├── Supabase Auth + Google OAuth  →  autenticación
      ├── Supabase JS SDK               →  CRUD directo (con RLS)
      └── FastAPI REST                  →  invoca scraping y tareas pesadas
            └── Redis (Celery broker)
                  └── Celery Worker
                        ├── Motor A: Scrapling  →  KNOWN_STORES
                        └── Motor B: Gemini/Groq LLM  →  tiendas desconocidas
                              └── Supabase PostgreSQL  ←  guarda resultados

KNOWN_STORES: Falabella, MercadoLibre, Ripley, Paris, Lider, Linio.

---

## 🛠️ Stack Tecnológico

### Frontend — apps/web/
- Framework: Next.js 16 (App Router)
- Lenguaje: TypeScript strict mode (sin `any` sin justificación)
- Estilos: Tailwind CSS v4 + shadcn/ui
- Auth: Supabase Auth + Google OAuth
- DB Client: Supabase JS SDK
- Package manager: npm
- Dev: `npm run dev` → http://localhost:3000
- Tests: Vitest (unit) + Playwright (E2E)

### Backend — apps/api/
- Framework: FastAPI (Python 3.12)
- Cola de tareas: Celery + Redis
- Scraping Motor A: Scrapling (DynamicFetcher + StealthyFetcher, curl_cffi, Playwright, Camoufox)
- Scraping Motor B: Google Gemini + Groq (LLM parser de DOM)
- Dev: `docker-compose up -d --build` → http://localhost:8000 (Swagger en /docs)
- Tests: pytest + pytest-asyncio

### Variables de entorno requeridas
    # apps/api/.env
    GEMINI_API_KEY=
    GROQ_API_KEY=
    SUPABASE_URL=
    SUPABASE_SERVICE_KEY=

    # apps/web/.env.local
    NEXT_PUBLIC_SUPABASE_URL=
    NEXT_PUBLIC_SUPABASE_ANON_KEY=
    SUPABASE_SERVICE_ROLE_KEY=

NUNCA commitear .env ni .env.local. Solo .env.example.

---

## 📦 Módulos del Producto (SRS v4.0)

| ID    | Módulo                    | Estado       | Descripción                                              |
|-------|---------------------------|--------------|----------------------------------------------------------|
| MA-01 | Buscador por nombre       | 🔄 WIP       | Input único: nombre → motor descubre tiendas y extrae    |
| MA-02 | Motor Scrapling (A)       | 🔄 WIP       | Scraping determinista para KNOWN_STORES                  |
| MA-03 | Motor LLM (B)             | 🔄 WIP       | Extracción semántica Gemini/Groq para tiendas nuevas     |
| MA-04 | Motor Híbrido             | 🔄 WIP       | Orquestación A vs B según tipo de tienda                 |
| MA-05 | Dashboard analítico       | ⏳ Pendiente | Precios, mínimos/máximos, historial, gráficos            |
| MA-06 | Sistema de alertas        | ⏳ Pendiente | Email + push al cambio de precio                         |
| MA-07 | Autenticación             | ✅ Base      | Supabase Auth + Google OAuth + bypass email dev          |
| MA-08 | Pagos Transbank           | ⏳ Pendiente | Webpay Plus, suscripciones recurrentes                   |
| MA-09 | Modo Configurado empresas | ⏳ Pendiente | Pro/Business eligen tiendas a monitorear                 |
| MA-10 | Exportaciones             | ⏳ Pendiente | CSV (Starter+), Excel/PDF (Pro+)                         |

---

## 💰 Planes SaaS

| Plan     | Búsquedas/mes | Tiendas/búsq | Proyectos  | Refresh   | Precio CLP  |
|----------|---------------|--------------|------------|-----------|-------------|
| Gratis   | 10            | hasta 5      | 0          | —         | $0          |
| Starter  | 100           | hasta 10     | 5          | 1x/día    | $4.990/mes  |
| Pro      | Ilimitadas    | hasta 20     | 50         | cada 6h   | $12.990/mes |
| Business | Ilimitadas    | Sin límite   | Ilimitados | cada 2h   | $29.990/mes |

- Descuento 20% en pago anual. Precios en CLP con IVA incluido.
- Los límites se validan en el backend, NUNCA solo en el frontend.
- Los valores de planes viven en la tabla `plans` de la DB, nunca hardcodeados en código.

---

## ⚖️ Reglas Críticas — todos los agentes sin excepción

### Git y checkpoint
- Rama principal: main.
- Cuando el usuario escriba "checkpoint":
  1. Ejecutar `git status`
  2. Si no hay cambios: "nothing to commit — working tree clean"
  3. Si hay cambios: `git add -A` → generar commit message Conventional Commits → `git push origin main`
  4. Mostrar siempre los comandos ejecutados y el mensaje de commit final
- Formato Conventional Commits: `tipo(scope): descripción` (max 72 chars, sin punto final)
  Tipos: feat, fix, refactor, chore, docs, test, style, ci
- Nunca inventar contexto en el commit. Solo basarse en archivos cambiados reales.
- Si hay cambios no relacionados, hacer commits separados.

### Seguridad
- NUNCA commitear .env, .env.local ni archivos con credenciales
- NUNCA hardcodear API keys, tokens ni passwords
- NUNCA escribir en la DB sin confirmación explícita del usuario
- NUNCA desplegar a producción sin aprobación explícita
- Validar SIEMPRE inputs del usuario antes de procesar
- Envolver SIEMPRE llamadas externas en try/catch con error handling adecuado
- createAdminClient (service role) SOLO en server-side. Nunca exponer al cliente.

### Base de Datos
- Todo cambio de schema: migración SQL en supabase/migrations/ — sin excepciones
- RLS activado en TODA tabla nueva
- No DROP COLUMN ni RENAME sin migración explícita
- No hacer queries con service role desde el frontend

### Scraping
- Motor A para KNOWN_STORES. Motor B como fallback/universal.
- Ver pricescout_scraper_agent_prompt.md antes de modificar cualquier scraper.
- No añadir tiendas a KNOWN_STORES sin actualizar selectores CSS correspondientes.

### Frontend
- suppressHydrationWarning en root layout — NO eliminar (bug conocido con extensiones Chrome)
- Server Components por defecto. Client Components solo para estado/interactividad.
- No hacer fetch directo a localhost:8000 sin usar variables de entorno.

### Código
- Archivos máx 300 líneas. Dividir si supera ese límite.
- TypeScript strict. Python: type hints + docstrings en funciones públicas.
- Named exports preferidos sobre default exports.

---

## 🗂️ Estado Actual del Proyecto

> Actualizar al terminar cada sesión de trabajo.

### Completado ✅
- Arquitectura base y SRS v4.0 definidos
- Estructura de monorepo inicializada
- docker-compose (FastAPI + Redis + Celery Worker)
- Migraciones Supabase base
- Prompt del agente scraper documentado
- Auth base (Supabase + Google OAuth)

### En progreso 🔄
- Motor A Scrapling para KNOWN_STORES
- Motor B LLM Gemini/Groq
- Frontend buscador principal (MA-01)
- Configuración de roles y middleware de protección de rutas (MA-07) [@auth]

### Pendiente ⏳
- Dashboard analítico (MA-05)
- Sistema de alertas email/push (MA-06)
- Pagos Transbank Webpay Plus (MA-08)
- Modo Configurado empresas (MA-09)
- Exportaciones CSV/Excel/PDF (MA-10)
- GitHub Actions CI/CD completo
- Tests unitarios y E2E
- Documentación de API pública (plan Business)

---

## 👥 Mapa de Agentes

| Agente    | Dominio principal                                | Skill                              |
|-----------|--------------------------------------------------|------------------------------------|
| @scraper  | Motor A (Scrapling) + Motor B (LLM)              | .agents/skills/scraper/SKILL.md    |
| @backend  | FastAPI endpoints, Celery, lógica de negocio     | .agents/skills/backend/SKILL.md    |
| @frontend | Next.js, UI/UX, componentes, páginas             | .agents/skills/frontend/SKILL.md   |
| @database | Migraciones SQL, RLS policies, schema Supabase   | .agents/skills/database/SKILL.md   |
| @payments | Transbank Webpay Plus, planes, billing           | .agents/skills/payments/SKILL.md   |
| @auth     | Supabase Auth, Google OAuth, roles, permisos     | .agents/skills/auth/SKILL.md       |
| @devops   | GitHub Actions, CI/CD, Docker, deploys           | .agents/skills/devops/SKILL.md     |
| @qa       | Tests unitarios, integración, E2E, cobertura     | .agents/skills/qa/SKILL.md         |
| @docs     | SRS, FDS, README, documentación técnica y de API | .agents/skills/docs/SKILL.md       |

### Protocolo entre agentes
- Cada agente trabaja SOLO en su dominio. No modifica archivos de otro dominio.
- Para solicitar trabajo a otro agente: deja un comentario en el código:
  `# AGENT_HANDOFF: @nombre-agente — descripción de lo que necesita`
- Al terminar una sesión: actualiza la sección "Estado Actual del Proyecto".
- Al encontrar un bug fuera de tu dominio: documenta como:
  `# BUG: descripción | reproducción | impacto | agente: @nombre`

