# 🔍 PriceScout Chile — Comparador de Precios Inteligente SaaS

[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Scrapling](https://img.shields.io/badge/Engine-Scrapling-orange?style=flat-square)](https://github.com/D4Vinci/Scrapling)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Celery](https://img.shields.io/badge/Queue-Celery%20%2B%20Redis-cc342d?style=flat-square&logo=celery)](https://docs.celeryq.dev/)

> **PriceScout Chile** es una plataforma SaaS de inteligencia competitiva y monitoreo de precios en tiempo real para el mercado chileno. Diseñada para emprendedores, pymes e importadores, permite rastrear precios, stock e históricos en cualquier tienda de internet mediante un motor híbrido que combina scraping sigiloso anti-bloqueos e Inteligencia Artificial (Gemini).

---

## 📌 Características Clave

*   **Motor Híbrido de Extracción de Datos (MA-04):**
    *   **Motor A (Scrapling):** Extracción determinista ultra-rápida con `DynamicFetcher` y `StealthyFetcher` (curl_cffi + huellas digitales emuladas) para evadir barreras de seguridad (Cloudflare, Akamai) en los e-commerce más grandes de Chile (*Falabella, MercadoLibre, Ripley, Paris, Lider*).
    *   **Motor B (Universal LLM):** Extracción semántica con modelos de lenguaje de última generación (**Google Gemini** y **Groq**) para parsear el DOM de cualquier tienda desconocida automáticamente sin necesidad de programar un selector CSS.
*   **Modalidades de Búsqueda Centradas en el Usuario:**
    *   **Modalidad A — «Sé mis competidores»:** El usuario ingresa un listado de URLs directas de sus competidores y el sistema extrae la comparativa en menos de 60 segundos.
    *   **Modalidad B — «Búscame competidores»:** Cuestionario guiado donde la plataforma descubre competidores de forma autónoma usando búsqueda web asistida por IA.
*   **Dashboard Analítico Moderno:** Visualiza la posición competitiva en el mercado, el precio promedio, mínimos y máximos, además de la evolución histórica de precios por producto.
*   **Alertas de Precio Inteligentes:** Notificaciones instantáneas (correo/push) cuando un competidor modifica un precio, tiene stock de nuevo, o si el producto llega a su precio mínimo histórico.
*   **Monetización Local:** Integración nativa con **Transbank Webpay Plus** para cobros recurrentes y planes de suscripción localizados (Freemium, Starter, Pro y Business).

---

## 🏗️ Arquitectura del Sistema

El siguiente diagrama muestra el flujo de datos y la relación entre componentes:

```mermaid
graph TD
    subgraph Cliente (Navegador)
        FE[Frontend Next.js 16]
    end

    subgraph Capa de Datos (Supabase)
        DB[(PostgreSQL)]
        AUTH[Supabase Auth]
    end

    subgraph Procesamiento Asíncrono
        BE[Backend FastAPI]
        R[(Redis Broker)]
        W[Celery Worker]
    end

    subgraph Extracción de Datos (Scraping)
        MA[Motor A: Scrapling]
        MB[Motor B: LLM Gemini/Groq]
    end

    FE -->|Autenticación| AUTH
    FE -->|Consultas y CRUD| DB
    FE -->|Invoca Scraping| BE
    BE -->|Encola Tareas| R
    R -->|Despacha Tareas| W
    W -->|Consulta e-commerce conocidos| MA
    W -->|Consulta tiendas desconocidas| MB
    MA -->|E-commerce Chile| EC[Sitios Web Competidores]
    MB -->|E-commerce Chile| EC
    W -->|Guarda resultados| DB
```

---

## 📂 Estructura del Proyecto

```text
├── apps/
│   ├── web/          # Frontend Next.js 16 (React, Tailwind CSS, shadcn/ui)
│   └── api/          # Backend FastAPI (Python 3.12, Celery, Scrapling Scrapers)
├── packages/
│   └── shared/       # Tipos TypeScript compartidos y definiciones comunes
├── supabase/
│   └── migrations/   # Migraciones de base de datos SQL con RLS + Triggers
└── docker-compose.yml# Orquestación local para Redis, FastAPI y Celery Worker
```

---

## 🚀 Guía de Configuración Local

### 1. Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu sistema:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para la API, Redis y el Worker).
*   [Node.js v20+](https://nodejs.org/) (para levantar el Frontend localmente).

---

### 2. Configuración del Backend & Cola de Tareas (Docker)

El backend de la aplicación, el Celery Worker y Redis se gestionan mediante Docker para asegurar que los navegadores headless de Playwright (integrados en Scrapling) se instalen con todas sus dependencias del sistema operativo sin problemas.

1. Navega a la raíz del proyecto.
2. Crea el archivo de variables de entorno para el backend copiando el ejemplo:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
3. Llena las variables requeridas en `apps/api/.env` (como `GEMINI_API_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_KEY`).
4. Levanta los contenedores en modo background:
   ```bash
   docker-compose up -d --build
   ```

Esto iniciará tres servicios:
*   **FastAPI Backend** corriendo en `http://localhost:8000` (puedes ver la documentación Swagger en `http://localhost:8000/docs`).
*   **Redis** escuchando en `localhost:6379`.
*   **Celery Worker** listo para procesar los trabajos de scraping pesados de forma asíncrona.

---

### 3. Configuración del Frontend (Next.js)

1. Ve a la carpeta del frontend:
   ```bash
   cd apps/web
   ```
2. Configura las variables de entorno para Supabase y APIs locales:
   ```bash
   cp .env.local.example .env.local
   ```
3. Asegúrate de configurar las variables de Supabase con tu instancia activa (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Instala las dependencias de Node:
   ```bash
   npm install
   ```
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

El frontend estará disponible y listo en **[http://localhost:3000](http://localhost:3000)**.

---

## ⚡ Solución a Errores Comunes de Desarrollo

> [!TIP]
> **Error de Hydration (cz-shortcut-listen en el Body):**
> Si usas extensiones como *ColorZilla* o bloqueadores de anuncios, Next.js podría lanzar una alerta de hidratación en la consola por atributos inyectados en el DOM. Esto ya está solucionado en la plantilla usando `suppressHydrationWarning` en la raíz del Layout.

> [!IMPORTANT]
> **Error de Autenticación "Error sending confirmation email":**
> Si estás usando una instancia de Supabase gratuita sin SMTP de correos configurado, el flujo por defecto de registro fallará al intentar enviar un mail de confirmación. Hemos implementado un flujo de bypass seguro del lado del servidor utilizando el cliente administrativo (`createAdminClient`) para auto-confirmar cuentas al registrarse. Puedes usarlo directamente desde la web y se logueará de inmediato.

---

## 📄 Licencia

Este proyecto está bajo los términos de confidencialidad e integridad del equipo interno de desarrollo de **PriceScout Chile**.
