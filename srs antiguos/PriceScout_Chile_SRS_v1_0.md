**PriceScout Chile**  ·  SRS v1.0  ·  Confidencial

📊

**PRICESCOUT CHILE**

Comparador de Precios con Scraping Inteligente

**Software Requirements Specification (SRS)**

Versión 1.0  ·  Abril 2026  ·  Mercado Objetivo: Chile

| **Documento** | SRS - PriceScout Chile v1.0 |
| --- | --- |
| **Autor** | Wilmer (Product Owner) |
| **Estado** | Borrador Inicial - Listo para Desarrollo |
| **Fecha** | Abril 2026 |
| **Confidencialidad** | Interno / Confidencial |

# **1. Introducción**

## **1.1 Propósito del Documento**

Este documento constituye la Especificación de Requisitos de Software (SRS) para PriceScout Chile, una plataforma SaaS de comparación de precios mediante web scraping orientada al mercado chileno. Sigue el estándar IEEE 830 adaptado para equipos ágiles que construyen con agentes de vibe coding. El objetivo es proveer una guía técnica completa, sin ambigüedades, para que un agente de IA o desarrollador pueda implementar el sistema correctamente.

## **1.2 Alcance del Sistema**

PriceScout Chile permite a usuarios B2C y B2B monitorear precios de productos en los principales e-commerce chilenos mediante dos modalidades: scraping manual por URLs provistas y búsqueda automática por nombre de producto. La plataforma ofrece visualización comparativa, historial, alertas de precio y exportación Excel, bajo un modelo de suscripción mensual.

## **1.3 Definiciones y Acrónimos**

| **Término** | **Definición** |
| --- | --- |
| **SRS** | Software Requirements Specification - Especificación de Requisitos de Software |
| **Scraping** | Extracción automatizada de datos de páginas web mediante bots |
| **MVP** | Minimum Viable Product - Producto Mínimo Viable |
| **B2C** | Business to Consumer - Plataforma orientada al consumidor final |
| **B2B** | Business to Business - Plataforma orientada a empresas |
| **RF** | Requisito Funcional |
| **RNF** | Requisito No Funcional |
| **CU** | Caso de Uso |
| **CE** | Caso de Error |
| **JWT** | JSON Web Token - Token de autenticación stateless |
| **API** | Application Programming Interface |
| **SERP** | Search Engine Results Page - Página de resultados del buscador |
| **CLP** | Peso Chileno - Moneda local |
| **Anti-bot** | Sistemas de defensa que detectan y bloquean scrapers automáticos |
| **Proxy** | Servidor intermediario para enrutar tráfico de scraping |
| **Task Queue** | Cola de tareas asíncronas para procesar scraping en background |

## **1.4 Contexto del Mercado Chileno**

Los principales e-commerce chilenos a soportar en el MVP son:

- Falabella.com — protección anti-bot via Akamai + JS dinámico

- Ripley.cl — rendering JavaScript, protección Cloudflare

- MercadoLibre.cl — API pública parcial + HTML dinámico

- Paris.cl (Cencosud) — JS rendering

- Lider.cl (Walmart Chile) — estructura cambiante

- Pcfactory.cl, AbcDin.cl, Hites.cl — estructura semiestatica

| **⚠️  Consideración Legal** |
| --- |
| El scraping de datos públicos de precios es legal en Chile bajo la ley de libre competencia (art. 3 DL 211). |
| PriceScout debe respetar robots.txt y no sobrecargar servidores (máx. 1 req/seg por dominio). |
| No se extraerán datos personales de usuarios de terceros — solo precios, nombres y URLs de producto. |
| Se recomienda incluir cláusula de exoneración de responsabilidad en los Términos de Servicio. |
|  |

# **2. Visión General del Producto**

## **2.1 Descripción del Producto**

PriceScout Chile es una aplicación web SaaS multi-tenant que opera en dos capas: una interfaz de usuario Next.js y un motor de scraping Python/FastAPI con cola de tareas asíncrona. El usuario puede comparar precios de un producto específico en múltiples e-commerce chilenos, ver resultados históricos, exportar reportes Excel y configurar alertas de precio.

## **2.2 Perfiles de Usuario**

| **Perfil** | **Descripción** | **Necesidad Principal** | **Plan Típico** |
| --- | --- | --- | --- |
| **Consumidor Final (B2C)** | Persona que quiere comprar más barato | Encontrar el precio más bajo de un producto | Free / Pro |
| **Gestor de Tienda (B2B)** | Dueño o encargado de e-commerce chileno | Monitorear precios de competencia | Business |
| **Analista de Precios** | Analista en retail o distribuidora | Reportes comparativos periódicos, export Excel | Business |
| **Agencia / Revendedor** | Agencia de marketing digital | Acceso multi-cliente, reportes automáticos | Enterprise |

## **2.3 Restricciones del Sistema**

- El sistema solo cubre e-commerce con presencia en Chile (dominio .cl o sección chilena)

- No se realizará scraping de sitios que requieran autenticación del usuario

- El motor de scraping no actuará como proxy para el usuario final

- Las comparaciones se ejecutan bajo demanda (no scraping continuo en plan Free)

- El sistema no garantiza disponibilidad del 100% de los sitios objetivo (depende de sus anti-bots)

# **3. Requisitos Funcionales**

## **RF-01 · Módulo de Autenticación y Registro**

El sistema debe permitir el registro, inicio de sesión y gestión de cuenta de usuarios.

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-01.1** | **Registro por email** | El usuario puede registrarse con email y contraseña. Validación de formato y fortaleza mínima (8 chars, 1 número, 1 mayúscula). |
| **RF-01.2** | **OAuth Google** | Inicio de sesión con cuenta Google mediante OAuth 2.0 como alternativa al registro tradicional. |
| **RF-01.3** | **Verificación de email** | Envío de email de confirmación post-registro. Cuenta inactiva hasta verificación. |
| **RF-01.4** | **Recuperación de contraseña** | Flujo de reset por email con token de un solo uso con expiración de 1 hora. |
| **RF-01.5** | **Segmento de mercado** | Durante onboarding, el usuario selecciona su segmento: Consumidor / Tienda / Distribuidor / Agencia. Puede modificarse en perfil. |
| **RF-01.6** | **Gestión de sesión** | JWT con refresh token. Sesión activa 7 días. Opción "Recordarme" extiende a 30 días. |

## **RF-02 · Módulo de Búsqueda — Opción A (Links Manuales)**

El usuario pega URLs directas de páginas de producto de e-commerce chilenos para que el sistema extraiga y compare los precios.

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-02.1** | **Ingreso de URLs** | Campo de texto multi-línea o área de pegado que acepta hasta N URLs (N según plan). Validación de URL válida y dominio chileno reconocido. |
| **RF-02.2** | **Nombre del producto** | Campo opcional donde el usuario puede nombrar el producto que está comparando. Se usa para el historial. |
| **RF-02.3** | **Disparo de scraping** | Botón "Comparar Precios" que encola un job de scraping asíncrono. El sistema devuelve un job_id inmediato. |
| **RF-02.4** | **Estado en tiempo real** | WebSocket o polling cada 3 seg muestra progreso: Pendiente → Extrayendo → Completado / Error por cada URL. |
| **RF-02.5** | **Límite por plan** | Free: 3 URLs por comparación / Pro: 15 URLs / Business: 50 URLs / Enterprise: ilimitado. |
| **RF-02.6** | **Detección de dominio** | El sistema detecta automáticamente el e-commerce (Falabella, Ripley, etc.) por el dominio para aplicar el parser correcto. |

## **RF-03 · Módulo de Búsqueda — Opción B (Búsqueda Automática)**

El sistema busca automáticamente el producto en los principales e-commerce chilenos sin que el usuario provea links.

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-03.1** | **Campo de búsqueda** | El usuario ingresa el nombre del producto (ej: "iPhone 15 Pro 256GB") y opcionalmente código de barra o SKU. |
| **RF-03.2** | **Selección de tiendas** | Checklist de tiendas disponibles. Por defecto todas. El usuario puede desmarcar tiendas específicas. |
| **RF-03.3** | **Motor de búsqueda interno** | El backend construye queries de búsqueda para cada e-commerce seleccionado, navega la SERP interna del sitio y extrae los primeros 3 resultados más relevantes. |
| **RF-03.4** | **Normalización de resultados** | El sistema devuelve los resultados agrupados por tienda, con: nombre del producto encontrado, precio normal, precio oferta (si existe), URL del producto, imagen miniatura. |
| **RF-03.5** | **Confianza del match** | Cada resultado muestra un score de coincidencia (Alto / Medio / Bajo) basado en similitud de nombre y atributos con lo buscado. |
| **RF-03.6** | **Disponibilidad en plan Free** | La opción B está disponible en plan Free con límite de 3 búsquedas/mes. Pro: 30/mes. Business: ilimitado. |

## **RF-04 · Módulo de Resultados y Comparación**

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-04.1** | **Ficha del producto** | Encabezado con: imagen, nombre del producto, rango de precios (CLP), tienda más barata destacada, tienda más cara destacada, última actualización. |
| **RF-04.2** | **Panel comparativo** | Tabla o grilla con todos los resultados: logo tienda, nombre producto en tienda, precio normal, precio oferta, disponibilidad, enlace directo. |
| **RF-04.3** | **Indicadores visuales** | Badge verde "PRECIO MÁS BAJO" y badge rojo "PRECIO MÁS ALTO" sobre las filas correspondientes. |
| **RF-04.4** | **Filtros de resultados** | Ordenar por: precio menor a mayor, precio mayor a menor, tienda A-Z, relevancia. Filtrar por: con/sin oferta, disponible, rango de precio personalizado. |
| **RF-04.5** | **Gráfico de precios** | Gráfico de barras horizontal mostrando visualmente la distribución de precios entre tiendas. |
| **RF-04.6** | **Precio histórico** | Si el producto fue buscado antes, muestra mini-gráfico de línea con evolución de precio por tienda en los últimos 30/90 días (según plan). |
| **RF-04.7** | **Compartir resultado** | Botón para copiar URL única del resultado o compartir por WhatsApp (formato mobile-friendly). |

## **RF-05 · Módulo de Historial**

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-05.1** | **Lista de comparaciones** | Dashboard con historial cronológico de todas las comparaciones realizadas: nombre producto, fecha, nº tiendas, precio mínimo encontrado. |
| **RF-05.2** | **Rango de historial** | Free: últimos 7 días. Pro: 30 días. Business: 1 año. Enterprise: indefinido. |
| **RF-05.3** | **Re-ejecutar comparación** | Botón "Actualizar precios" sobre cualquier comparación guardada que relanza el scraping con las mismas URLs/query. |
| **RF-05.4** | **Alertas de precio** | El usuario puede configurar alerta cuando un precio baje de un umbral definido. Notificación por email. (Plan Pro y superior) |
| **RF-05.5** | **Eliminar historial** | El usuario puede eliminar comparaciones individuales o purgar todo el historial. Acción irreversible con confirmación modal. |

## **RF-06 · Módulo de Exportación Excel**

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-06.1** | **Export desde resultado** | Botón "Exportar Excel" disponible en la vista de resultados. Genera y descarga un .xlsx inmediatamente. |
| **RF-06.2** | **Contenido del Excel** | Hoja 1: Resumen (nombre producto, fecha, mejor precio, peor precio). Hoja 2: Detalle por tienda (tienda, URL, precio normal, precio oferta, disponibilidad, fecha extracción). Hoja 3: Histórico de precios (si existe). |
| **RF-06.3** | **Formato visual** | Excel con colores: fila verde para precio mínimo, fila roja para precio máximo. Logo PriceScout en encabezado. Columnas con ancho auto-ajustado. |
| **RF-06.4** | **Export desde historial** | En la lista de historial, el usuario puede seleccionar múltiples comparaciones y exportar un Excel consolidado con todas. |
| **RF-06.5** | **Disponibilidad** | Export individual: Plan Free (hasta 5 exports/mes). Export masivo desde historial: Plan Pro y superior. |

## **RF-07 · Módulo de Suscripciones y Pagos**

| **ID** | **Nombre** | **Descripción** |
| --- | --- | --- |
| **RF-07.1** | **Planes disponibles** | El sistema soporta 4 planes: Free, Pro, Business, Enterprise. Cada plan con límites específicos (ver Sección 8). |
| **RF-07.2** | **Integración de pago** | Integración con Transbank Webpay Plus para pagos en CLP (tarjetas chilenas). Opcionalmente Stripe para tarjetas internacionales. |
| **RF-07.3** | **Ciclo de facturación** | Facturación mensual recurrente. El usuario puede cancelar en cualquier momento (sin reembolso proporcional). Downgrade al plan Free al vencer. |
| **RF-07.4** | **Portal de facturación** | Historial de pagos, descarga de boletas (formato SII Chile), cambio de plan, datos de facturación. |
| **RF-07.5** | **Graceful degradation** | Al expirar plan pago, el usuario pasa a Free automáticamente. Sus datos se conservan 30 días antes de aplicar restricciones de historial. |

# **4. Requisitos No Funcionales**

## **4.1 Rendimiento**

| **ID** | **Requisito** | **Métrica** | **Prioridad** |
| --- | --- | --- | --- |
| **RNF-01** | **Tiempo de respuesta UI** | Páginas cargan < 2 seg (LCP < 2.5s). API REST < 500ms excluyendo scraping. | Alta |
| **RNF-02** | **Latencia de scraping** | Scraping de 1 URL (sitio simple) < 10 seg. Sitio con anti-bot < 30 seg. Timeout absoluto: 60 seg. | Alta |
| **RNF-03** | **Concurrencia** | El sistema debe soportar 50 jobs de scraping simultáneos sin degradación. Escalable horizontalmente vía workers. | Media |
| **RNF-04** | **Disponibilidad** | Uptime mínimo 99.5% mensual. Ventana de mantenimiento: Domingos 02:00–04:00 hrs Chile. | Alta |
| **RNF-05** | **Rate de scraping** | Máximo 1 request/seg por dominio destino para evitar bloqueos y sobrecarga del sitio objetivo. | Alta |

## **4.2 Seguridad**

- Autenticación: JWT con RS256, refresh token rotation, blacklisting en logout

- HTTPS obligatorio en todos los endpoints. HSTS habilitado.

- Passwords hasheados con bcrypt (cost factor 12)

- Rate limiting en API: 100 req/min por usuario autenticado, 20 req/min unauthenticated

- Validación y sanitización de todas las URLs recibidas (evitar SSRF)

- Datos de usuario cifrados at-rest en la base de datos

- OWASP Top 10 como checklist mínimo antes de cada release

## **4.3 Escalabilidad y Arquitectura**

- Backend stateless: los workers de scraping pueden escalar horizontalmente

- Job queue (Celery + Redis) permite agregar workers sin downtime

- Base de datos con pool de conexiones (max 20 conexiones por worker)

- Caché de resultados: mismo producto + mismas tiendas en < 30 min reutiliza resultado cacheado

- CDN para assets estáticos del frontend (Vercel Edge Network)

# **5. Stack Tecnológico Recomendado**

## **5.1 Justificación de Selección**

El stack fue seleccionado priorizando: (1) Máxima compatibilidad con vibe coding y agentes IA, (2) Ecosistema Python para scraping de primera clase, (3) Menor costo operativo en etapa inicial, (4) Escalabilidad real a medida que crezcan los usuarios.

| **Capa** | **Tecnología** | **Versión** | **Justificación** |
| --- | --- | --- | --- |
| **Frontend** | **Next.js + TypeScript** | 15.x | SSR/SSG, SEO óptimo, App Router, ideal para dashboards interactivos. Stack dominante 2026. |
| **Frontend UI** | **Tailwind CSS + shadcn/ui** | 4.x / latest | Componentes accesibles listos para usar. Reduce tiempo de desarrollo UI en 60%. |
| **Backend API** | **Python + FastAPI** | 3.12 / 0.115 | Async nativo, documentación OpenAPI automática, integración perfecta con librerías de scraping Python. |
| **Scraping Core** | **Playwright (Python)** | 1.48+ | Mejor herramienta para sitios JS-heavy (Falabella, Ripley). Microsoft lo mantiene activamente. |
| **Scraping Stealth** | **playwright-stealth + browserforge** | latest | Enmascaramiento de fingerprint para evitar detección anti-bot en Cloudflare/Akamai. |
| **HTML Parsing** | **BeautifulSoup4 + lxml** | latest | Para sitios con HTML estático. 5x más rápido que Playwright para páginas sin JS. |
| **Task Queue** | **Celery + Redis** | 5.x / 7.x | Estándar de industria para tareas asíncronas Python. Permite escalar workers horizontalmente. |
| **Base de Datos** | **PostgreSQL via Supabase** | 16.x | Hosted Postgres + Auth + Storage en uno. Reduce infraestructura y acelera desarrollo inicial. |
| **Cache** | **Redis** | 7.x | Cache de resultados de scraping y sesiones. Mismo Redis que Celery. |
| **Autenticación** | **Supabase Auth** | latest | JWT integrado, OAuth Google out-of-the-box, email templates. Gratis hasta 50k MAU. |
| **Export Excel** | **openpyxl + pandas** | latest | Generación de .xlsx con formato, colores y múltiples hojas en Python. |
| **Pagos (Chile)** | **Transbank SDK Python** | latest | Integración nativa con Webpay Plus para pagos en CLP con tarjetas chilenas. |
| **Pagos (Intl)** | **Stripe** | latest | Para usuarios con tarjetas internacionales. Complementa Transbank. |
| **Deploy Frontend** | **Vercel** | latest | CDN global, deploys automáticos desde Git, previews por PR. Gratis en plan Hobby. |
| **Deploy Backend** | **Railway** | latest | Hosting Python/Docker, soporte nativo Celery workers, pricing por uso. ~$10 USD/mes inicio. |
| **Monitoreo** | **Sentry + Uptime Robot** | latest | Tracking de errores en tiempo real + alertas de downtime. Planes gratuitos disponibles. |
| **Proxy (anti-ban)** | **ScraperAPI (opcional)** | latest | Para sitios muy protegidos. $49 USD/mes inicio. Usar solo si Playwright falla consistentemente. |

## **5.2 Arquitectura del Sistema**

| **Flujo de Datos — Búsqueda con Opción A (Links Manuales)** |
| --- |
| 1. Usuario pega URLs → Frontend Next.js envía POST /api/v1/jobs/scrape |
| 2. FastAPI valida URLs, crea registro en PostgreSQL (estado: PENDING), encola Celery task → devuelve job_id |
| 3. Celery Worker recoge tarea → lanza Playwright por cada URL → parser extrae precio/nombre/imagen |
| 4. Resultados se guardan en PostgreSQL (tabla price_results) → estado job → COMPLETED |
| 5. Frontend polling/WebSocket detecta COMPLETED → renderiza resultados en tiempo real |
| 6. Usuario descarga Excel → FastAPI genera .xlsx con openpyxl → response file download |
|  |

| **Flujo de Datos — Búsqueda con Opción B (Automática)** |
| --- |
| 1. Usuario escribe nombre del producto → POST /api/v1/jobs/auto-search |
| 2. FastAPI encola N tasks Celery (1 por tienda seleccionada) → devuelve job_id |
| 3. Cada worker navega la SERP interna del e-commerce (ej: falabella.com/?q=iphone+15) |
| 4. Extrae los top 3 resultados + calcula similarity score vs búsqueda del usuario |
| 5. Resultados normalizados se agregan en PostgreSQL → job COMPLETED |
| 6. Frontend muestra resultados agrupados por tienda con badges de coincidencia |
|  |

# **6. Casos de Uso**

## **CU-001 · Registro y Onboarding de Usuario**

| **Identificador** | CU-001 |
| --- | --- |
| **Nombre** | Registro y Onboarding de Usuario |
| **Actor Principal** | Usuario Anónimo |
| **Precondiciones** | El usuario accede a la URL raíz de PriceScout Chile sin sesión activa. |
| **Flujo Principal** | 1. Usuario hace clic en "Crear cuenta". 2. Completa formulario: email, password, nombre. 3. Sistema envía email de verificación. 4. Usuario confirma email. 5. Sistema muestra onboarding: selección de segmento de mercado. 6. Usuario selecciona segmento y hace clic en "Empezar". 7. Sistema redirige al dashboard con plan Free activo. |
| **Flujo Alternativo** | OAuth Google: El usuario hace clic en "Continuar con Google" → autoriza acceso → sistema crea cuenta automáticamente y salta verificación de email → onboarding de segmento. |
| **Postcondiciones** | Cuenta activa en plan Free. Sesión JWT iniciada. Primer tour guiado mostrado. |

## **CU-002 · Comparación con Links Manuales (Opción A)**

| **Identificador** | CU-002 |
| --- | --- |
| **Nombre** | Comparación de Precios con Links Manuales |
| **Actor Principal** | Usuario Autenticado (cualquier plan) |
| **Precondiciones** | Usuario autenticado con al menos 1 comparación disponible según su plan. |
| **Flujo Principal** | 1. Usuario navega a "Nueva Comparación". 2. Selecciona "Opción A - Pegar links". 3. Pega 1 a N URLs de productos en campo de texto. 4. Opcionalmente ingresa nombre del producto. 5. Hace clic en "Comparar Precios". 6. Sistema valida URLs y encola job. 7. UI muestra progress bar por cada URL. 8. Al completar, sistema muestra ficha de resultado con panel comparativo. |
| **Flujo Alternativo** | 1 URL falla (anti-bot): El sistema muestra el resultado parcial con las URLs exitosas y notifica la URL fallida con código de error SCR-003. |
| **Postcondiciones** | Comparación guardada en historial. Contador de comparaciones del plan decrementado en 1. |

## **CU-003 · Búsqueda Automática (Opción B)**

| **Identificador** | CU-003 |
| --- | --- |
| **Nombre** | Búsqueda Automática por Nombre de Producto |
| **Actor Principal** | Usuario Autenticado |
| **Precondiciones** | Usuario con búsquedas automáticas disponibles según plan. |
| **Flujo Principal** | 1. Usuario selecciona "Opción B - Buscar automáticamente". 2. Ingresa nombre del producto. 3. Selecciona tiendas a buscar (por defecto todas). 4. Hace clic en "Buscar". 5. Sistema lanza N jobs paralelos (1 por tienda). 6. Progress muestra estado por tienda en tiempo real. 7. Al completar, muestra resultados agrupados por tienda con score de coincidencia. 8. Usuario puede descartar resultados de baja coincidencia. |
| **Flujo Alternativo** | Ninguna tienda retorna resultados: Sistema muestra mensaje de error CE-003 con sugerencia de usar Opción A. |
| **Postcondiciones** | Resultados guardados en historial. Búsqueda contabilizada en cuota del plan. |

## **CU-004 · Exportar Comparación a Excel**

| **Identificador** | CU-004 |
| --- | --- |
| **Nombre** | Exportar Comparación a Excel (.xlsx) |
| **Actor Principal** | Usuario Autenticado |
| **Precondiciones** | Existe al menos una comparación completada (en vista de resultado o historial). |
| **Flujo Principal** | 1. Usuario hace clic en "Exportar Excel" desde resultado o historial. 2. Sistema genera archivo .xlsx en backend (FastAPI + openpyxl). 3. Archivo descargado automáticamente en el navegador. 4. El Excel incluye: Hoja Resumen, Hoja Detalle por tienda, Hoja Histórico (si aplica). 5. Fila con precio mínimo destacada en verde, precio máximo en rojo. |
| **Flujo Alternativo** | Export desde historial múltiple (Plan Pro+): usuario selecciona checkbox de varias comparaciones → "Exportar seleccionados" → descarga un Excel con una hoja por comparación. |
| **Postcondiciones** | Archivo descargado. Contador de exports decrementado (solo plan Free). |

## **CU-005 · Configurar Alerta de Precio**

| **Identificador** | CU-005 |
| --- | --- |
| **Nombre** | Configurar Alerta de Precio por Umbral |
| **Actor Principal** | Usuario Pro o Business |
| **Precondiciones** | Usuario con plan Pro o superior. Existe al menos una comparación guardada. |
| **Flujo Principal** | 1. Desde resultado o historial, usuario hace clic en "Configurar Alerta". 2. Sistema muestra modal: umbral de precio, tienda(s) a monitorear, email de notificación. 3. Usuario define precio umbral (ej: "alertar si baja de $150.000 CLP"). 4. Hace clic en "Activar Alerta". 5. Sistema programa job periódico de re-scraping (cada 24 hrs para Pro, cada 6 hrs para Business). 6. Al detectar precio menor al umbral, envía email con enlace directo al producto. |
| **Flujo Alternativo** | Si el email no llega: El usuario puede reenviar alerta manualmente desde el dashboard. Si el precio ya está bajo el umbral al crear: sistema notifica inmediatamente. |
| **Postcondiciones** | Alerta activa guardada en base de datos. Job programado activo. |

# **7. Especificación de Errores por Código**

Todos los errores del sistema siguen el formato estándar de respuesta API:

| **Formato de Error API (JSON)** |
| --- |
| { "error": { "code": "SCR-001", "name": "URL_UNREACHABLE", "message": "No fue posible acceder al sitio objetivo.", "suggestion": "Verifica que la URL sea válida y accesible.", "timestamp": "2026-04-27T15:30:00Z", "job_id": "abc123" } } |
|  |

## **AUTH-XXX · Errores de Autenticación**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **AUTH-001** | **INVALID_CREDENTIALS** | Email o contraseña incorrectos en login. | Mostrar mensaje genérico "Credenciales inválidas". No especificar cuál campo es incorrecto (seguridad). |
| **AUTH-002** | **EMAIL_NOT_VERIFIED** | Usuario intenta login sin haber verificado su email. | Mostrar banner de advertencia con botón "Reenviar email de verificación". |
| **AUTH-003** | **TOKEN_EXPIRED** | JWT de acceso expirado. | Intentar refresh automático. Si falla, redirigir a login con mensaje de sesión expirada. |
| **AUTH-004** | **REFRESH_TOKEN_INVALID** | Refresh token inválido o ya usado (rotación). | Invalidar sesión completamente. Forzar re-login. |
| **AUTH-005** | **ACCOUNT_SUSPENDED** | Cuenta suspendida por impago o violación de ToS. | Mostrar pantalla de cuenta suspendida con instrucciones de reactivación. |
| **AUTH-006** | **RATE_LIMIT_LOGIN** | Más de 5 intentos de login fallidos en 15 min. | Bloquear intentos por 15 min. Mostrar countdown. Ofrecer recuperación de contraseña. |
| **AUTH-007** | **OAUTH_FAILED** | Error en flujo OAuth Google. | Mostrar mensaje "No fue posible conectar con Google. Intenta más tarde." con fallback a registro manual. |

## **SCR-XXX · Errores de Scraping**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **SCR-001** | **URL_UNREACHABLE** | La URL provista no responde (timeout, DNS error, 404). | Marcar URL como fallida en el job. Continuar con las demás. Mostrar resultado parcial. |
| **SCR-002** | **INVALID_URL_FORMAT** | La URL no tiene formato válido o no es un dominio .cl reconocido. | Rechazar URL antes de encolar. Subrayar en rojo en el input con mensaje inline. |
| **SCR-003** | **ANTI_BOT_BLOCKED** | Sitio devuelve CAPTCHA, 403, o Cloudflare challenge no resuelto. | Reintentar 2 veces con stealth diferente. Si persiste, marcar como bloqueado y notificar usuario con sugerencia de reintentar más tarde. |
| **SCR-004** | **PRICE_NOT_FOUND** | La página se cargó pero no se encontró el precio con los selectores. | Registrar como error de parsing. Mostrar la URL como "sin resultado" con botón de reportar. |
| **SCR-005** | **PRODUCT_OUT_OF_STOCK** | El producto existe pero está agotado (sin precio visible). | Mostrar en resultados con estado "Sin stock" en lugar de precio. No contar como error. |
| **SCR-006** | **SCRAPING_TIMEOUT** | El job superó el timeout de 60 segundos. | Marcar URL como fallida. Log del timeout para análisis. Notificar usuario. |
| **SCR-007** | **UNSUPPORTED_SITE** | La URL pertenece a un sitio que no tiene parser implementado. | Informar al usuario: "Este sitio no está soportado aún". Registrar solicitud para priorizar implementación. |
| **SCR-008** | **PARSER_CHANGED** | El HTML del sitio cambió y el parser actual no extrae el precio. | Alerta interna a equipo técnico (Sentry). Mostrar al usuario "Sitio temporalmente no disponible". SLA de corrección: 48 hrs. |
| **SCR-009** | **JOB_QUEUE_FULL** | La cola de Celery está saturada (más de 500 jobs pendientes). | Encolar en posición de espera. Mostrar tiempo estimado de espera. Plan Business tiene prioridad. |

## **USR-XXX · Errores de Usuario / Negocio**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **USR-001** | **PLAN_LIMIT_REACHED** | Usuario agotó su cuota mensual de comparaciones. | Bloquear nueva búsqueda. Mostrar modal con comparativa de planes y botón de upgrade. |
| **USR-002** | **URL_LIMIT_EXCEEDED** | Número de URLs supera el límite del plan en Opción A. | Recortar URLs automáticamente a N del plan. Notificar cuáles fueron excluidas. Ofrecer upgrade. |
| **USR-003** | **EXPORT_LIMIT_REACHED** | Plan Free agotó los 5 exports mensuales. | Bloquear export. Mostrar contador "0/5 exports disponibles". Ofrecer upgrade a Pro. |
| **USR-004** | **DUPLICATE_ALERT** | Usuario intenta crear alerta de precio duplicada para el mismo producto+tienda. | Mostrar alerta existente. Ofrecer modificar umbrales en lugar de crear duplicado. |
| **USR-005** | **HISTORY_LIMIT** | Se intenta acceder a historial fuera del rango del plan. | Mostrar historial disponible con banner indicando que registros más antiguos están en plan superior. |

## **SYS-XXX · Errores del Sistema**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **SYS-001** | **DATABASE_ERROR** | Error de conexión o query fallida en PostgreSQL. | Log en Sentry. Retry automático 3 veces. Si persiste, mostrar error genérico 500 al usuario. |
| **SYS-002** | **REDIS_UNAVAILABLE** | Redis no disponible (Celery sin cola). | Fallback a modo síncrono si < 5 URLs. Si no es posible, mostrar error y notificar equipo. |
| **SYS-003** | **INTERNAL_SERVER_ERROR** | Error no controlado en el backend. | Capturar en Sentry con stack trace. Mostrar página de error 500 con ID de incidente para soporte. |
| **SYS-004** | **SERVICE_MAINTENANCE** | Sistema en ventana de mantenimiento programado. | Mostrar página de mantenimiento con tiempo estimado de retorno. |

## **PAY-XXX · Errores de Pago**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **PAY-001** | **PAYMENT_DECLINED** | Transacción rechazada por Transbank o Stripe. | Mostrar mensaje genérico "Pago no procesado". No revelar razón del banco. Ofrecer reintentar o cambiar método. |
| **PAY-002** | **PAYMENT_TIMEOUT** | Timeout en el flujo de pago (usuario tardó >30 min). | Cancelar sesión de pago. Redirigir a página de planes para reiniciar. |
| **PAY-003** | **SUBSCRIPTION_EXPIRED** | Fallo en renovación automática mensual. | Enviar email de alerta 3 días antes, 1 día antes y el día. Dar 7 días de gracia antes de downgrade. |
| **PAY-004** | **REFUND_NOT_APPLICABLE** | Usuario solicita reembolso fuera de política. | Mostrar política de no reembolso (aceptada en ToS). Derivar a soporte para casos excepcionales. |

## **EXP-XXX · Errores de Exportación**

| **Código** | **Nombre** | **Descripción** | **Acción del Sistema** |
| --- | --- | --- | --- |
| **EXP-001** | **EXPORT_GENERATION_FAILED** | openpyxl falló al generar el archivo Excel. | Log del error. Retry automático. Si persiste, notificar usuario con opción de exportar en CSV como fallback. |
| **EXP-002** | **NO_DATA_TO_EXPORT** | El job de comparación no tiene resultados suficientes. | Deshabilitar botón de export. Tooltip: "No hay datos suficientes para exportar". |
| **EXP-003** | **FILE_TOO_LARGE** | El Excel generado supera 50 MB (export masivo muy grande). | Dividir export en archivos de máximo 20 MB. Comprimir en .zip para descarga. |

# **8. Modelo de Monetización**

## **8.1 Planes y Precios**

Precios en CLP (Peso Chileno). Facturación mensual recurrente.

| **FREE** | **PRO · $4.990/mes** | **BUSINESS · $19.990/mes** | **ENTERPRISE · A consultar** |
| --- | --- | --- | --- |
| **Comparaciones/mes** | 10 | 100 | Ilimitadas | Ilimitadas |
| **URLs por comparación (Op. A)** | 3 URLs | 15 URLs | 50 URLs | Ilimitadas |
| **Búsquedas automáticas (Op. B)** | 3 búsquedas | 30 búsquedas | Ilimitadas | Ilimitadas |
| **Exportar Excel** | 5 exports/mes | Ilimitado | Ilimitado | Ilimitado + API |
| **Historial de precios** | 7 días | 30 días | 1 año | Indefinido |
| **Alertas de precio** | ❌ No | ✅ 5 alertas | ✅ Ilimitadas | ✅ Ilimitadas |
| **Gráfico histórico de precios** | ❌ No | ✅ 30 días | ✅ 1 año | ✅ Ilimitado |
| **Prioridad en cola scraping** | Normal | Normal | Alta | Máxima |
| **Soporte** | Base de conocimiento | Email 48 hrs | Chat 24 hrs | Account Manager |
| **Usuarios por cuenta** | 1 | 1 | 5 | Ilimitados |
| **Acceso API REST** | ❌ No | ❌ No | ❌ No | ✅ Sí |
| **White-label / Marca Propia** | ❌ No | ❌ No | ❌ No | ✅ Opcional |

## **8.2 Análisis Financiero — Proyección 12 Meses**

Asunciones conservadoras para mercado chileno en etapa inicial. Modelo Freemium con conversión estimada del 5% de Free → Pro y 1% de Free → Business.

| **Hito** | **Usuarios Free** | **Usuarios Pro** | **Usuarios Biz** | **MRR Estimado (CLP)** |
| --- | --- | --- | --- | --- |
| **Mes 1–2 (Lanzamiento)** | 100 | 5 | 1 | **$44.940** |
| **Mes 3–4** | 350 | 17 | 3 | **$217.930** |
| **Mes 6** | 800 | 40 | 8 | **$358.920** |
| **Mes 9** | 1.500 | 75 | 15 | **$674.850** |
| **Mes 12** | 3.000 | 150 | 30 | **$1.349.700** |

## **8.3 Costos Operativos Estimados (Mes 1)**

- Vercel (Frontend): $0 — Plan Hobby gratuito (hasta 100GB bandwidth)

- Railway (Backend + Celery + Redis): ~$15 USD (~$13.500 CLP)

- Supabase (DB + Auth): $0 — Plan Free hasta 50k MAU y 500 MB DB

- Dominio .cl: ~$10.000 CLP/año → $833 CLP/mes

- Transbank (Webpay Plus): comisión por transacción ~2.9% (sin costo fijo)

- Sentry (monitoreo): $0 — Plan Developer gratuito

- ScraperAPI (opcional, solo si hay bloqueos): $49 USD desde el mes que se active

**→ Costo operativo mes 1 estimado: ~$15.000–$65.000 CLP/mes. Break-even con 4 suscriptores Pro.**

## **8.4 Estrategia de Conversión**

- Freemium agresivo: El plan Free debe sentirse "real" pero con límites dolorosos en el uso diario

- Trigger de upgrade: mostrar modal de upgrade justo cuando el usuario agota cuota mensual

- Trial Pro 14 días: al registrarse, todos los usuarios obtienen 14 días de Pro automáticamente

- Descuento anual: 2 meses gratis al pagar anual (equivale a ~16% descuento)

- Segmento B2B: landing page específica para tiendas/retail con ROI calculado ("Monitoreando 3 competidores te ahorra X hrs/mes")

# **9. Buenas Prácticas de Desarrollo**

## **9.1 Arquitectura y Código**

- Separación estricta de responsabilidades: Frontend solo UI/UX, FastAPI solo lógica de negocio/API, Celery solo jobs

- Toda configuración en variables de entorno (.env). Nunca hardcodear API keys en código.

- Versionado de API: usar prefijo /api/v1/ desde el inicio. Permite evolucionar sin breaking changes.

- Modelos Pydantic en FastAPI para toda entrada/salida. Validación automática y documentación OpenAPI.

- Tests unitarios mínimos: cubrir parsers de scraping (son los más frágiles ante cambios del sitio).

- Los parsers de cada tienda en archivos separados: /scrapers/falabella.py, /scrapers/ripley.py, etc. Facilita mantenimiento independiente.

## **9.2 Scraping Responsable**

- Respetar robots.txt de cada sitio antes de implementar su parser

- Rate limiting: máximo 1 request/seg por dominio. Implementar con asyncio.sleep() entre requests.

- Rotar User-Agent entre requests usando lista de UAs reales y actualizados

- Implementar retry con backoff exponencial: 1s → 3s → 9s antes de marcar como fallido

- Monitorear tasa de éxito por parser. Si cae < 70% en 24 hrs, disparar alerta de mantenimiento

## **9.3 Seguridad en Scraping (Anti-SSRF)**

- Validar que las URLs recibidas del usuario sean solo dominios de e-commerce conocidos (whitelist)

- Bloquear URLs que apunten a localhost, 127.x.x.x, 10.x.x.x, 192.168.x.x (prevenir SSRF interno)

- No ejecutar JavaScript arbitrario del sitio scrapeado en el contexto del servidor

## **9.4 Experiencia de Usuario**

- Optimistic UI: mostrar skeleton/placeholders inmediatamente al iniciar scraping

- Resultados parciales: no esperar a que todos completen, mostrar tiendas conforme terminan

- Mobile-first: diseñar el panel de resultados para que sea usable en smartphone

- Accesibilidad: WCAG 2.1 AA mínimo. Contrastes de color suficientes, alt text en imágenes de producto

# **10. Roadmap de Desarrollo**

| **Fase** | **Duración Est.** | **Entregables** |
| --- | --- | --- |
| **FASE 1 MVP Core** | 4–6 semanas | Auth + Registro + Onboarding / Opción A (links manuales) con parsers Falabella, MercadoLibre, Ripley / Panel de resultados con filtros / Historial básico / Plan Free operativo / Deploy en Vercel + Railway |
| **FASE 2 Búsqueda Auto** | 3–4 semanas | Opción B (búsqueda automática) en todas las tiendas Fase 1 / Score de coincidencia / Export Excel completo / Planes Pro + Transbank integrado / Alertas de precio vía email |
| **FASE 3 Expansión** | 4–5 semanas | Parsers adicionales: Paris, Lider, AbcDin, Hites, PCFactory / Plan Business / Múltiples usuarios por cuenta / Gráfico histórico de precios / Notificaciones push (PWA) |
| **FASE 4 Escala B2B** | Ongoing | API REST pública / Enterprise plan + white-label / Integración con Google Sheets / Dashboard analítico avanzado / Webhooks para integraciones externas |

| **💡 Recomendación para Vibe Coding con Agentes** |
| --- |
| Para construir esto con agentes IA (Cursor, Windsurf, Claude Code), se recomienda el siguiente orden de prompting: |
| 1. Primero: scaffolding de estructura de carpetas y entorno (Next.js + FastAPI + Supabase) |
| 2. Segundo: sistema de auth completo (el más crítico de hacer bien desde el inicio) |
| 3. Tercero: un solo parser de prueba (MercadoLibre, el más permisivo) + API del job |
| 4. Cuarto: UI de resultados con datos mockeados → luego conectar con parser real |
| 5. Quinto: Celery + Redis para hacer el scraping asíncrono |
| Este SRS es suficientemente detallado para que cualquier agente LLM construya cada módulo de forma autónoma con contexto claro. |
|  |

PriceScout Chile — SRS v1.0  ·  Documento Confidencial  ·  Abril 2026

Página