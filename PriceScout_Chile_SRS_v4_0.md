

**PRICESCOUT CHILE**

Software Requirements Specification

**Versión 4.0  —  Motor de Búsqueda Autónomo por Nombre de Producto**

| Versión | 4.0 — Motor de Búsqueda Autónomo |
| :---- | :---- |
| **Cambios vs v3.0** | Nueva UX sin URLs · Motor Scrapling · Configuración por empresa |
| **Fecha** | Junio 2026 |
| **Mercado objetivo** | Chile (lanzamiento) → LATAM |
| **Cliente objetivo** | Público general · Empresas · Perfumerías y pymes |
| **Confidencialidad** | Interno / Confidencial |

# **1\. Resumen de Cambios v3.0 → v4.0**

Esta versión reorienta PriceScout Chile hacia una experiencia de usuario radicalmente más simple: el usuario solo escribe el nombre del producto que desea comparar y el motor hace todo el trabajo. Se eliminan las modalidades de entrada de URLs y el cuestionario de 5 pasos. En su lugar, existe un único buscador inteligente respaldado por Scrapling como motor de extracción y un sistema de IA para sitios complejos.

| Módulo / Sección | Estado | Descripción del cambio |
| :---- | :---- | :---- |
| Buscador por nombre de producto | 🆕 Nuevo | Único input: el usuario escribe el nombre del producto. El motor descubre y extrae automáticamente. |
| Motor Scrapling | 🆕 Nuevo | Reemplaza el parser híbrido anterior. Scrapling gestiona anti-bot, Playwright, Camoufox y auto-adaptación de selectores. |
| Extracción de imagen \+ descripción | 🆕 Nuevo | Además de precio y título, se extraen imagen principal y descripción de cada resultado. |
| Vista de comparación en tarjetas | 🆕 Nuevo | Resultados presentados como tarjetas visuales comparables, no solo tabla de precios. |
| Modo autónomo (público) | 🆕 Nuevo | Motor decide qué tiendas buscar. Gratuito y sin configuración requerida. |
| Modo configurado (empresas) | 🆕 Nuevo | El cliente empresa elige qué tiendas monitorear o añade URLs de dominios propios. Requiere plan de pago. |
| Modalidad A — URLs manuales | ❌ Eliminado | Se reemplaza por el modo autónomo. Cero fricción para el usuario. |
| Modalidad B — Cuestionario guiado | ❌ Eliminado | Reemplazado por el buscador directo. El motor infiere el contexto del nombre del producto. |
| Dashboard analítico | ✅ Heredado | Sin cambios. Proyectos, historial, gráficos. |
| Sistema de alertas | ✅ Heredado | Sin cambios. Email \+ push cuando cambia precio. |
| Autenticación Supabase \+ Google OAuth | ✅ Heredado | Sin cambios. |
| Exportación CSV / Excel / PDF | ✅ Heredado | Sin cambios por plan. |
| Pagos Transbank \+ planes | ✅ Heredado | Actualización de límites según nuevo modelo de uso. |

# **2\. Modelo de Negocio — Freemium SaaS**

## **2.1 Propuesta de Valor**

PriceScout Chile permite a cualquier persona o empresa saber al instante a qué precio se vende un producto en las principales tiendas del mercado chileno. Sin necesidad de conocimientos técnicos, sin pegar URLs, sin configurar nada: solo escribe el producto y en segundos tienes una comparación visual con precios, imágenes y disponibilidad.

Para empresas (perfumerías, importadores, pymes), la plataforma ofrece la posibilidad de personalizar qué tiendas monitorear, programar búsquedas automáticas y recibir alertas cuando los precios de la competencia cambian.

## **2.2 Segmentos de Clientes (ICP)**

| Segmento | Perfil | Pain principal |
| :---- | :---- | :---- |
| Consumidor / Usuario público | Persona que quiere comprar un producto al mejor precio sin buscar manualmente en cada tienda. | Pierde tiempo revisando cada sitio. No sabe dónde está más barato. |
| Emprendedor / Pyme | Tienda online pequeña o mediana. Vende en MercadoLibre, tienda propia o Instagram. | No sabe si su precio es competitivo. Revisa manualmente de vez en cuando. |
| Empresa con rubro específico | Perfumería, importadora, distribuidora. Tiene un portafolio de productos definido. | Necesita monitorear precios en tiendas específicas de su industria de forma recurrente. |
| Agencia / Consultor | Gestiona varias marcas. Necesita reportes comparativos para presentar. | Le toma horas hacer comparativas manuales. Necesita automatización. |

## **2.3 Planes y Precios**

Precios en CLP con IVA incluido. Facturación mensual. Descuento 20% en pago anual.

| Característica | Gratis | Starter$4.990/mes | Pro$12.990/mes | Business$29.990/mes |
| :---- | :---- | :---- | :---- | :---- |
| Búsquedas / mes | 10 | 100 | Ilimitadas | Ilimitadas |
| Tiendas por búsqueda (modo autónomo) | Hasta 5 | Hasta 10 | Hasta 20 | Sin límite |
| Modo configurado (elegir tiendas) | ❌ | ❌ | ✅ | ✅ |
| Añadir tiendas personalizadas (dominios) | ❌ | ❌ | ❌ | ✅ |
| Guardar proyectos de monitoreo | ❌ | Hasta 5 | Hasta 50 | Ilimitados |
| Frecuencia de refresco | — | 1 vez/día | Cada 6h | Cada 2h |
| Alertas de precio | ❌ | 5 activas | Ilimitadas | Ilimitadas |
| Historial de precios | — | 30 días | 1 año | 3 años |
| Imagen y descripción en resultados | ✅ | ✅ | ✅ | ✅ |
| Exportación CSV | ❌ | ✅ | ✅ | ✅ |
| Exportación Excel / PDF | ❌ | ❌ | ✅ | ✅ |
| Dashboard analítico | Básico | Completo | Completo | Completo |
| Usuarios en cuenta | 1 | 1 | 3 | 10 |
| Soporte | Comunidad | Email | Prioritario | Dedicado |
| API acceso | ❌ | ❌ | ❌ | ✅ |

## **2.4 Diferenciación clave: Modo Autónomo vs. Modo Configurado**

|  | Modo Autónomo (Gratis/Starter) | Modo Configurado (Pro/Business) |
| :---- | :---- | :---- |
| ¿Quién elige las tiendas? | El motor de PriceScout | El cliente empresa |
| Tiendas disponibles | Lista curada por PriceScout (KNOWN\_STORES) | Lista curada \+ tiendas personalizadas (Business) |
| Configuración requerida | Ninguna. Solo buscar. | Panel de configuración de entorno por cuenta |
| Ideal para | Usuario público, emprendedores básicos | Perfumerías, distribuidoras, agencias |
| Ejemplo de uso | "zapatillas Nike Air Max 90" → busca en Falabella, Ripley, Paris, MercadoLibre, Linio | "Chanel N°5 EDP 100ml" → busca solo en Lolita Lempicka CL, Falabella, Paris, sitio propio del cliente |

# **3\. Comportamiento del Buscador Principal**

## **3.1 Experiencia de Usuario — Flujo Principal**

El núcleo de la aplicación es un único campo de búsqueda. El usuario no necesita conocer ni ingresar URLs. No existe cuestionario ni configuración previa para el uso básico.

| Paso | Acción del usuario | Acción del sistema | Tiempo estimado |
| :---- | :---- | :---- | :---- |
| 1 | Escribe el nombre del producto en el buscador. Ej: "perfume Valentino Donna Born in Roma 100ml" | Recibe el query. Normaliza el texto (elimina tildes, lowercase). Infiere categoría del producto. | \< 1s |
| 2 | Hace clic en "Buscar" o presiona Enter | Genera queries específicos para cada tienda target. Inicia las tareas de scraping en paralelo (Celery workers). | \< 2s |
| 3 | Ve una pantalla de carga animada con el mensaje "Buscando en \[N\] tiendas..." | Scrapling lanza requests a cada tienda. Extrae: URL del producto, título, precio actual, precio original, imagen principal, descripción breve, stock. | 5-30s |
| 4 | Ve los resultados como tarjetas visuales comparables ordenadas por precio | Ordena resultados por precio ascendente. Calcula precio mínimo, máximo y promedio. Genera insight de IA. | \< 1s |
| 5 (opcional) | Hace clic en "Guardar y monitorear" (requiere cuenta) | Crea un proyecto. Programa refrescos automáticos según el plan del usuario. | Inmediato |

## **3.2 Requerimientos Funcionales — Buscador**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| BS-01 | Campo de búsqueda único | Input de texto libre. Placeholder: "Escribe el producto que quieres comparar". Máx. 200 caracteres. Autocompletado con búsquedas recientes del usuario. |
| BS-02 | Normalización del query | El backend normaliza el texto: lowercase, elimina caracteres especiales, detecta marca/modelo si existen. No requiere formato exacto del usuario. |
| BS-03 | Inferencia de categoría | LLM clasifica el producto en una categoría (perfumería, electrónica, calzado, etc.) para priorizar las tiendas más relevantes del KNOWN\_STORES list. |
| BS-04 | Selección dinámica de tiendas | Modo autónomo: el motor selecciona las N tiendas más relevantes para la categoría inferida. Modo configurado: usa las tiendas definidas en el perfil de la empresa. |
| BS-05 | Búsqueda en tiendas (interno) | Para cada tienda target, el sistema genera la URL de búsqueda interna (ej: falabella.com/search?query=...) o usa la API de búsqueda si está disponible. Scrapling extrae la URL del producto más relevante. |
| BS-06 | Extracción de datos del producto | Por cada URL de producto encontrada, Scrapling extrae: título del producto, precio actual (CLP), precio original / precio tachado (si aplica), % de descuento calculado, imagen principal (URL), descripción breve (máx. 300 chars), estado de stock (disponible / agotado / sin info), URL fuente. |
| BS-07 | Fallback IA (LLM) | Si Scrapling no logra extraer datos con selectores deterministas, el módulo LLM Universal analiza el HTML/DOM y extrae los campos requeridos. Se marca el resultado con badge "Extraído con IA". |
| BS-08 | Timeout por tienda | Si una tienda no responde en 20s, se excluye del resultado y se muestra como "No disponible". No bloquea el resto. |
| BS-09 | Vista de resultados en tarjetas | Cada resultado se muestra como tarjeta con: imagen del producto, nombre de la tienda (logo), título extraído, precio destacado, precio original tachado (si aplica), badge de descuento, estado de stock, botón "Ver en tienda". |
| BS-10 | KPIs de comparación | Header de resultados muestra: precio mínimo encontrado, precio máximo, promedio de mercado, número de tiendas con resultado. |
| BS-11 | Insight generado por IA | Bloque de texto bajo los KPIs con una recomendación accionable. Ej: "El precio más bajo está en Falabella, $8.000 por debajo del promedio de mercado." |
| BS-12 | Ordenamiento y filtros | El usuario puede ordenar por: precio (ascendente/descendente), tienda (A-Z), relevancia. Filtros: solo con stock, solo con oferta. |
| BS-13 | Sin resultados | Si ninguna tienda devuelve un producto coincidente, se muestra mensaje claro con sugerencias de búsqueda alternativas. |

## **3.3 Configuración de Entorno por Empresa (Plan Pro y Business)**

Los clientes de plan Pro y Business acceden a un Panel de Configuración de Entorno donde personalizan el comportamiento del buscador para su cuenta. Este panel es el diferenciador clave respecto al uso público gratuito.

| ID | Nombre | Disponible en | Descripción |
| :---- | :---- | :---- | :---- |
| CE-01 | Selección de tiendas activas | Pro \+ Business | Listado de todas las tiendas del KNOWN\_STORES list con toggle activo/inactivo. El motor solo busca en las tiendas habilitadas. Ideal para perfumerías que solo quieren monitorear Paris, Falabella y Ripley. |
| CE-02 | Priorización de tiendas | Pro \+ Business | Orden de importancia de tiendas. Las tiendas de mayor prioridad aparecen primero en resultados. Útil para empresas que compiten directamente con 2-3 tiendas específicas. |
| CE-03 | Modo autónomo / manual | Pro \+ Business | Toggle: "Dejar que PriceScout elija las mejores tiendas" (autónomo) vs "Usar solo mis tiendas configuradas" (manual). Default: autónomo. |
| CE-04 | Agregar tiendas personalizadas | Business | El cliente ingresa el dominio de una tienda que NO está en el KNOWN\_STORES list (ej: una distribuidora regional). El Motor LLM Universal se activa para extraer datos. Máx. 10 dominios personalizados. |
| CE-05 | Nombre de entorno | Pro \+ Business | El cliente puede nombrar su configuración (ej: "Entorno Perfumería Premium") para identificarla si tiene varios proyectos con configuraciones distintas. |
| CE-06 | Previsualización del entorno | Pro \+ Business | Botón "Probar configuración" que ejecuta una búsqueda de ejemplo con el entorno configurado antes de guardarlo. |

# **4\. Motor de Scraping — Scrapling**

## **4.1 Por qué Scrapling**

Scrapling es la librería de scraping elegida para PriceScout v4.0. Reemplaza al motor híbrido anterior (parser determinista \+ LLM con httpx/Playwright manual). Las razones principales son:

* Anti-bot nativo: Scrapling incluye Camoufox (Firefox stealth) y soporte para httpx con fingerprinting para evadir protecciones de Cloudflare, PerimeterX y sistemas similares usados por Falabella, Ripley y Mercado Libre.

* Auto-adaptación de selectores: si el HTML de una tienda cambia su estructura, Scrapling puede recuperar el selector correcto sin intervención manual, reduciendo mantenimiento.

* Velocidad: el fetcher asíncrono (httpx) permite hacer múltiples requests en paralelo sin overhead de Playwright cuando la tienda no requiere JavaScript.

* Playwright integrado: para tiendas con contenido dinámico (SPA, lazy loading de precios), Scrapling activa Playwright automáticamente.

* API simple: selector único para múltiples estrategias de extracción, lo que simplifica el código de los parsers por tienda.

## **4.2 Arquitectura del Motor**

| Capa | Componente | Tecnología | Responsabilidad |
| :---- | :---- | :---- | :---- |
| 1 — Descubrimiento | Store Search Engine | Python \+ Scrapling (httpx fetcher) | Para cada tienda target, genera la URL de búsqueda interna y extrae la URL del producto más relevante del resultado de búsqueda. |
| 2 — Fetching | Page Fetcher | Scrapling: StealthyFetcher (Camoufox) / AsyncFetcher (httpx) | Descarga la página del producto. Selecciona el fetcher según el perfil anti-bot de la tienda (definido en STORE\_PROFILES). |
| 3 — Extracción determinista | Known Store Parser | Scrapling Adaptors \+ CSS/XPath selectors | Extrae campos (precio, título, imagen, descripción) usando selectores específicos por tienda. Primera opción para KNOWN\_STORES. |
| 4 — Extracción LLM | LLM Universal Extractor | Gemini 2.5 Flash-Lite (fallback: GPT-4o-mini via LiteLLM) | Se activa si el parser determinista falla o si la tienda no está en KNOWN\_STORES. Pasa el HTML limpiado al LLM para extracción en JSON. |
| 5 — Validación | Result Validator | Python (Pydantic) | Valida que el precio sea numérico, la imagen sea una URL válida, el título tenga sentido. Descarta resultados con baja confianza. |
| 6 — Orquestación | Scraping Orchestrator | Celery \+ Redis | Lanza tasks en paralelo, gestiona timeouts por tienda (20s), reintenta 1 vez ante fallo de red. Consolida resultados. |

## **4.3 STORE\_PROFILES — Perfiles de Tiendas Conocidas**

Cada tienda del KNOWN\_STORES list tiene un perfil que define cómo extraer datos de ella. El Store Search Engine usa el perfil para elegir el fetcher, los selectores y la lógica de búsqueda interna.

| Tienda | Dominio | Fetcher | Search URL pattern | Categorías prioritarias |
| :---- | :---- | :---- | :---- | :---- |
| Falabella | falabella.com | AsyncFetcher (httpx) | falabella.com/falabella-cl/search?Ntt={query} | Electrónica, Moda, Hogar, Perfumería |
| Ripley | ripley.cl | AsyncFetcher | simple.ripley.cl/search?query={query} | Electrónica, Moda, Perfumería |
| Paris | paris.cl | AsyncFetcher | paris.cl/search?text={query} | Moda, Perfumería, Hogar |
| MercadoLibre | mercadolibre.cl | AsyncFetcher | listado.mercadolibre.cl/search\#q={query} | Todas |
| Linio | linio.cl | StealthyFetcher (Camoufox) | linio.cl/search?q={query} | Electrónica, Hogar |
| Hites | hites.com | AsyncFetcher | hites.com/search?q={query} | Moda, Hogar |
| La Polar | lapolar.cl | AsyncFetcher | lapolar.cl/search?q={query} | Moda, Hogar, Electrónica |
| Corona | corona.cl | AsyncFetcher | corona.cl/search?query={query} | Hogar, Construcción |
| Sodimac | sodimac.cl | AsyncFetcher | sodimac.cl/sodimac-cl/search?Ntt={query} | Hogar, Construcción, Jardín |
| PCFactory | pcfactory.cl | AsyncFetcher | pcfactory.cl/?texto={query} | Tecnología, Computación |

## **4.4 Flujo de Extracción por Producto**

El siguiente flujo aplica por cada tienda target en una búsqueda:

| Paso | Acción | Condición de éxito | En caso de fallo |
| :---- | :---- | :---- | :---- |
| 1 | Store Search Engine genera la URL de búsqueda interna de la tienda con el query normalizado. | URL generada correctamente. | Skip tienda. Log de error. |
| 2 | Page Fetcher descarga la página de resultados de búsqueda usando el fetcher del STORE\_PROFILE. | HTTP 200\. HTML disponible. | Retry 1 vez. Si falla: tienda \= "No disponible". |
| 3 | Known Store Parser extrae la URL del primer resultado de producto relevante. | URL de producto válida encontrada. | Activar LLM para extraer URL de producto del HTML. |
| 4 | Page Fetcher descarga la página del producto. | HTTP 200\. HTML con datos visibles. | Retry 1 vez. StealthyFetcher si falla con AsyncFetcher. |
| 5 | Known Store Parser extrae: título, precio, precio original, imagen, descripción, stock. | Mínimo: precio y título extraídos. | Activar LLM Universal Extractor con el HTML limpiado. |
| 6 | Result Validator valida los datos extraídos. | Precio numérico \> 0\. Título \> 5 chars. | Descartar resultado. No mostrar al usuario. |
| 7 | Resultado consolidado entregado al Scraping Orchestrator. | JSON con todos los campos. | — |

## **4.5 Extracción con LLM — Motor Universal**

Cuando el parser determinista falla o cuando la tienda es un dominio personalizado (plan Business), se activa el LLM Universal Extractor. El proceso es:

* El HTML de la página del producto se limpia (se eliminan scripts, estilos, comentarios) para reducir tokens.

* Se envía al LLM (Gemini 2.5 Flash-Lite) con un prompt estructurado que solicita extraer en JSON: title, price\_clp, original\_price\_clp, discount\_pct, image\_url, description, in\_stock.

* El resultado se parsea y valida con Pydantic. Si el LLM devuelve un JSON inválido o con campos faltantes, se intenta con el modelo de fallback (GPT-4o-mini via LiteLLM).

* El resultado marcado con badge "Extraído con IA" se muestra al usuario con un tooltip explicativo.

| Variable de entorno | Descripción | Default |
| :---- | :---- | :---- |
| SCRAPLING\_DEFAULT\_FETCHER | Fetcher por defecto para tiendas sin perfil (async / stealthy) | async |
| SCRAPLING\_TIMEOUT\_SECONDS | Timeout por request de Scrapling | 20 |
| SCRAPLING\_MAX\_RETRIES | Reintentos por tienda ante fallo de red | 1 |
| LLM\_EXTRACTOR\_MODEL | Modelo principal para extracción LLM | gemini-2.5-flash-lite |
| LLM\_EXTRACTOR\_FALLBACK | Modelo de fallback vía LiteLLM | gpt-4o-mini |
| LLM\_EXTRACTOR\_MAX\_HTML\_TOKENS | Máx. tokens de HTML enviados al LLM | 8000 |
| SEARCH\_MAX\_STORES\_FREE | Máx. tiendas en modo autónomo plan Gratis | 5 |
| SEARCH\_MAX\_STORES\_STARTER | Máx. tiendas en modo autónomo plan Starter | 10 |
| SEARCH\_MAX\_STORES\_PRO | Máx. tiendas en modo Pro | 20 |
| SEARCH\_PARALLEL\_WORKERS | Workers de Celery para scraping paralelo | 8 |
| STORE\_PROFILES\_PATH | Ruta al JSON con perfiles de tiendas conocidas | /config/store\_profiles.json |

# **5\. Dashboard y Proyectos de Monitoreo**

## **5.1 Guardar Búsqueda como Proyecto**

Cualquier resultado de búsqueda puede guardarse como un Proyecto de Monitoreo (requiere cuenta, mínimo plan Starter). Un proyecto es una búsqueda guardada con refresco automático programado.

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| PR-01 | Crear proyecto desde resultado | Botón "Guardar y monitorear" en la pantalla de resultados. El usuario asigna un nombre al proyecto. El sistema guarda: query, entorno de tiendas usado, configuración de alertas. |
| PR-02 | Refresco automático | Según el plan: Starter 1/día, Pro cada 6h, Business cada 2h. El Scraping Orchestrator re-ejecuta la búsqueda con el mismo query y entorno. |
| PR-03 | Vista de proyecto | Muestra el historial de precios de cada tienda en gráficos de línea (TimescaleDB). Tabla actualizada con último precio conocido. |
| PR-04 | Refresco manual | Botón "Actualizar ahora" disponible dentro de cada proyecto. Límite: 1 refresco manual por hora por proyecto. |
| PR-05 | Archivos del proyecto | Un proyecto puede archivarse (pausa el monitoreo) o eliminarse. El historial de precios se conserva para proyectos archivados. |
| PR-06 | Límite de proyectos | Gratis: 0 proyectos. Starter: 5\. Pro: 50\. Business: ilimitados. |

## **5.2 Sistema de Alertas**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| AL-01 | Alerta de bajada de precio | El usuario define un umbral. Cuando alguna tienda baja por debajo, se dispara la alerta. |
| AL-02 | Alerta de nuevo mínimo de mercado | Se dispara cuando el precio mínimo entre todas las tiendas alcanza un nuevo mínimo histórico para ese producto. |
| AL-03 | Alerta de cambio de precio (cualquier tienda) | Se dispara cuando cualquier tienda en el proyecto cambia su precio (subida o bajada). |
| AL-04 | Alerta de stock | Se dispara cuando un producto marcado como agotado vuelve a estar disponible. |
| AL-05 | Canales de notificación | Email (todos los planes). Web Push (todos los planes). Slack webhook (Business). |
| AL-06 | Límite por plan | Gratis: 0 alertas. Starter: 5 activas. Pro: ilimitadas. Business: ilimitadas \+ resumen diario. |
| AL-07 | Digest semanal | Resumen semanal automático por email: "Esta semana en tus proyectos: X productos bajaron precio, Y están en nuevo mínimo histórico." |

# **6\. UX y Pantallas Principales**

## **6.1 Principios de Diseño**

* Cero fricción: el usuario puede hacer su primera búsqueda en menos de 60 segundos sin cuenta ni tarjeta de crédito.

* Lenguaje de negocio, no técnico: jamás exponer términos como "scraping", "LLM", "parser" o "selector". Usar: "buscando en tiendas", "verificando precio", "análisis automático".

* Visual primero: los resultados son tarjetas con imagen del producto, no solo una tabla de texto.

* Progressive disclosure: la configuración avanzada (entorno de tiendas) solo aparece cuando el usuario la necesita (plan Pro/Business).

* El resultado siempre es accionable: cada pantalla de resultados tiene un insight claro y un CTA.

## **6.2 Pantallas Principales**

| Pantalla | Contenido y componentes clave |
| :---- | :---- |
| Home / Landing | Buscador centrado en pantalla (hero). Placeholder: "¿Qué producto quieres comparar?". Subtítulo: "Encuentra el mejor precio en las principales tiendas de Chile al instante". Ejemplos de búsqueda clickeables (chips). Demo animada de resultados. Testimonios. Tabla de planes. |
| Pantalla de resultados | Header: "Resultados para \[query\]" \+ fecha/hora. KPIs: precio mínimo, máximo, promedio, N tiendas encontradas. Grid de tarjetas de producto (imagen, tienda, título, precio, oferta). Insight de IA. Filtros y ordenamiento. CTA: "Guardar y monitorear". |
| Tarjeta de producto | Imagen del producto (extraída). Badge de tienda (logo). Título del producto. Precio actual (destacado). Precio tachado \+ % descuento (si aplica). Chip de stock (Verde: disponible / Rojo: agotado). Botón "Ver en tienda" (link externo). Badge "IA" si fue extraído con LLM. |
| Panel de configuración de entorno | Solo para Pro/Business. Lista de KNOWN\_STORES con toggle. Orden de prioridad drag-and-drop. Sección "Tiendas personalizadas" (solo Business). Botón "Probar configuración". Botón "Guardar entorno". |
| Dashboard Home | Saludo personalizado. KPIs globales (proyectos activos, alertas recientes). Lista de proyectos con mini-gráfico de precio. Feed de alertas. Botón "+ Nueva búsqueda". |
| Vista de Proyecto | Nombre del proyecto \+ query. Gráfico histórico de precios (línea por tienda). Tabla con último precio por tienda. Panel de alertas del proyecto. Botones: "Actualizar ahora", "Exportar", "Configurar alertas". |
| Registro / Login | Email \+ contraseña o Google OAuth. Sin formularios largos. Verificación de email asíncrona (no bloquea el primer uso). |
| Configuración de cuenta | Plan actual \+ uso del mes. Botón upgrade. Datos de facturación (Transbank). Preferencias de notificación. Gestión de usuarios (Business). |

## **6.3 Flujo de Onboarding**

| Paso | Pantalla | Mensaje clave |
| :---- | :---- | :---- |
| 1 | Landing con buscador | "¿Qué producto quieres comparar hoy? Busca gratis, sin registro." |
| 2 | Resultados de la búsqueda | "Así están los precios ahora en \[N\] tiendas." |
| 3 (opcional) | Modal de registro | "Guarda esta búsqueda y te avisamos si el precio baja. Empieza gratis." |
| 4 (opcional) | Activar alerta | "¿A qué precio quieres que te avisemos? Te notificamos cuando alguna tienda baje de ese valor." |

# **7\. Arquitectura Técnica v4.0**

## **7.1 Stack Tecnológico**

| Capa | Tecnología | Rol |
| :---- | :---- | :---- |
| Frontend | Next.js 15 (App Router) | UI, SSR para landing/SEO, Client Components para buscador interactivo. |
| Backend API | FastAPI (Python) | Endpoints REST: /search, /projects, /alerts, /config/environment. |
| Motor de Scraping | Scrapling (Python) | Fetching \+ extracción. AsyncFetcher para tiendas simples. StealthyFetcher (Camoufox) para tiendas con anti-bot. |
| Extracción LLM | Gemini 2.5 Flash-Lite \+ GPT-4o-mini (fallback) vía LiteLLM | Extracción universal para tiendas desconocidas o cuando el parser determinista falla. |
| Cola de tareas | Celery \+ Redis | Scraping paralelo, refrescos automáticos de proyectos, evaluación de alertas. |
| Base de datos | Supabase (PostgreSQL \+ TimescaleDB) | Datos de usuarios, proyectos, alertas. Serie temporal de precios con TimescaleDB. |
| Autenticación | Supabase Auth \+ Google OAuth | Sin cambios desde v2.0. |
| Caché | Redis | Caché de resultados de búsqueda (TTL: 1h). Deduplicación de alertas (TTL: 24h). |
| Notificaciones email | SendGrid | Alertas y digest semanal. |
| Notificaciones push | Web Push API (VAPID) | Alertas en browser. |
| Pagos | Transbank Webpay Plus | Pagos de planes. Sin cambios desde v2.0. |
| Deploy Frontend | Vercel | Next.js. Dominio: pricescout.cl. |
| Deploy Backend | Railway | FastAPI \+ Celery workers \+ Redis. |

## **7.2 Nuevos Endpoints API**

| Método | Endpoint | Plan mínimo | Descripción |
| :---- | :---- | :---- | :---- |
| POST | /api/v1/search | Gratis | Lanza una búsqueda. Body: { query: string, environment\_id?: string }. Retorna search\_id. La búsqueda corre async. |
| GET | /api/v1/search/{search\_id}/results | Gratis | Retorna resultados de la búsqueda (estado: pending / partial / complete / error). |
| GET | /api/v1/stores | Gratis | Lista todas las tiendas del KNOWN\_STORES con metadata (nombre, logo, categorías). |
| GET | /api/v1/environments | Pro | Lista los entornos de tiendas configurados por el usuario. |
| POST | /api/v1/environments | Pro | Crea un nuevo entorno. Body: { name, stores: \[domain\], custom\_stores: \[domain\] }. |
| PUT | /api/v1/environments/{id} | Pro | Actualiza un entorno existente. |
| DELETE | /api/v1/environments/{id} | Pro | Elimina un entorno. |
| POST | /api/v1/environments/{id}/test | Pro | Ejecuta una búsqueda de prueba con el entorno dado. Body: { sample\_query: string }. |
| POST | /api/v1/projects | Starter | Crea un proyecto de monitoreo desde una búsqueda guardada. |
| GET | /api/v1/projects/{id}/history | Starter | Retorna historial de precios del proyecto en serie temporal. |

## **7.3 Esquema de Base de Datos — Tablas Nuevas/Modificadas**

| Tabla | Campos principales | Cambio vs v3.0 |
| :---- | :---- | :---- |
| searches | id, user\_id (nullable), query, query\_normalized, category\_inferred, environment\_id (nullable), status, created\_at | 🆕 Nueva. Reemplaza el concepto de "búsqueda por modalidad". |
| search\_results | id, search\_id, store\_domain, store\_name, product\_url, title, price\_clp, original\_price\_clp, discount\_pct, image\_url, description, in\_stock, extraction\_method (deterministic/llm), confidence\_score, extracted\_at | 🆕 Nueva. Almacena resultados por tienda con imagen y descripción. |
| environments | id, user\_id, name, mode (autonomous/manual), store\_domains\[\] (active stores), custom\_domains\[\], created\_at, updated\_at | 🆕 Nueva. Configuración de entorno por empresa. |
| projects | id, user\_id, name, search\_query, environment\_id, refresh\_frequency\_hours, last\_refreshed\_at, is\_archived, created\_at | 🔄 Modificada. Ahora referencia environment\_id en lugar de lista de URLs. |
| price\_history | id, project\_id, store\_domain, price\_clp, original\_price\_clp, in\_stock, image\_url, extracted\_at | 🔄 Modificada. Agrega image\_url. TimescaleDB hypertable en extracted\_at. |
| alerts | id, user\_id, project\_id, alert\_type, threshold\_value, channel, is\_active, last\_triggered\_at | ✅ Sin cambios. |
| source\_quality | domain, total\_extractions, successful\_extractions, llm\_fallback\_rate, avg\_confidence, last\_success\_at, quality\_score | 🔄 Modificada. Agrega llm\_fallback\_rate para auditar tiendas que requieren IA frecuentemente. |

# **8\. Roadmap de Desarrollo**

| Fase | Duración | Entregables |
| :---- | :---- | :---- |
| MVP (v4.0) | 5 semanas | Buscador por nombre · Motor Scrapling con KNOWN\_STORES (10 tiendas) · Extracción de precio, título, imagen y descripción · Vista de tarjetas comparativas · KPIs básicos (mín/máx/promedio) · Plan Gratis funcionando · Sin cuenta requerida para buscar. |
| Fase 2 | 3 semanas | Cuentas de usuario (Supabase Auth) · Guardar proyectos · Refresco automático · Sistema de alertas (email) · Plan Starter activado. |
| Fase 3 | 3 semanas | Panel de configuración de entorno (Plan Pro) · Selección de tiendas activas · Preview de entorno · Plan Pro activado · Dashboard con historial y gráficos. |
| Fase 4 | 2 semanas | Dominios personalizados (Plan Business) · Motor LLM para dominios no conocidos · Multi-usuario · API REST · Plan Business activado. |
| Fase 5 | 2 semanas | Exportación Excel/PDF · Alertas push \+ Slack webhook · Insight de IA en resultados · Digest semanal. |
| Fase 6 (continua) | — | Expansión LATAM (Colombia, Argentina) · App móvil (React Native) · Integraciones WhatsApp · Ampliación de KNOWN\_STORES list. |

## **8.1 Métricas de Éxito del Producto**

| Métrica | Target Mes 3 | Target Mes 12 |
| :---- | :---- | :---- |
| Búsquedas realizadas (total) | 5.000 | 100.000 |
| Usuarios registrados | 500 | 8.000 |
| Conversión Gratis → Pago | 6% | 12% |
| MRR | $200.000 CLP | $3.000.000 CLP |
| Proyectos activos (total) | 200 | 5.000 |
| Tasa de extracción exitosa (parser determinista) | \>85% | \>92% |
| Tasa de fallback LLM | \<20% | \<12% |
| Tiempo promedio de búsqueda (end-to-end) | \< 25s | \< 15s |
| Tasa de retención mensual | \>55% | \>75% |
| NPS | \>30 | \>50 |

# **9\. Seguridad, Ética y Consideraciones Legales**

| Área | Medida |
| :---- | :---- |
| Scraping ético | PriceScout respeta robots.txt de cada tienda. El scraping se limita a páginas de producto y resultados de búsqueda públicos. No se extraen datos de usuarios ni de áreas autenticadas. |
| Rate limiting | El Scraping Orchestrator impone un rate limit por dominio: máx. 1 request cada 2 segundos por tienda para no sobrecargar sus servidores. |
| User-Agent | Scrapling usa user-agents realistas y rotativos. No se simula ser un crawler de búsqueda (Googlebot, etc.). |
| GDPR / Ley 19.628 (Chile) | Solo se almacenan datos públicos de precios. Los datos de usuarios (email, historial) se manejan bajo consentimiento explícito. Política de privacidad clara antes del registro. |
| Seguridad de API | Endpoints autenticados con JWT (Supabase). Rate limiting de API: 60 req/min para plan Gratis, 300 para Starter, 1000 para Pro/Business. |
| Dominios personalizados (Business) | Al añadir un dominio personalizado, el usuario declara tener permiso para monitorear dicho sitio. PriceScout no es responsable del uso de esta funcionalidad sobre sitios que prohíban el scraping. |
| Caché de resultados | Las búsquedas idénticas realizadas dentro de 1 hora devuelven el resultado en caché. Reduce carga sobre tiendas y mejora velocidad de respuesta. |

*PriceScout Chile — SRS v4.0 · Motor de Búsqueda Autónomo · Junio 2026 · Confidencial*