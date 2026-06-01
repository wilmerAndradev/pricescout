

**PRICESCOUT CHILE**

Software Requirements Specification

*Versión 3.0 — Plataforma SaaS Pública*

| Versión | 3.0 — Plataforma SaaS Pública |
| :---- | :---- |
| **Cambios vs v2.0** | Nuevo enfoque B2B/pymes · Dos modalidades de búsqueda · Dashboard · Freemium |
| **Fecha** | Mayo 2026 |
| **Mercado objetivo** | Chile (lanzamiento) → LATAM |
| **Cliente objetivo** | Emprendedores, pymes, e-commerce managers |
| **Confidencialidad** | Interno / Confidencial |

# **1\. Resumen de Cambios v2.0 → v3.0**

Esta versión transforma PriceScout Chile de una herramienta de scraping interno a una plataforma SaaS pública orientada a emprendedores, pymes y e-commerce managers chilenos. El cambio central es el enfoque en inteligencia competitiva de precios, accesible para usuarios no técnicos, con dos modalidades de búsqueda, un dashboard analítico y un modelo Freemium.

| Módulo / Sección | Estado | Descripción del cambio |
| :---- | :---- | :---- |
| **Modalidad A — Sé mis competidores** | 🆕 Nuevo | El usuario carga URLs de sus competidores directamente. Motor híbrido extrae precios. |
| **Modalidad B — Búscame competidores** | 🆕 Nuevo | Cuestionario guiado → la plataforma descubre competidores automáticamente vía búsqueda web. |
| **Dashboard analítico** | 🆕 Nuevo | Métricas de evolución de precios, posición competitiva, historial y alertas. |
| **Gestión de alertas** | 🆕 Nuevo | Alertas por email/push cuando un competidor cambia precio o hay nuevo mínimo de mercado. |
| **Modelo de negocio Freemium** | 🆕 Nuevo | Plan Gratis \+ Starter \+ Pro \+ Business con límites por búsquedas/alertas/exportación. |
| **Motor híbrido (v2.0)** | ✅ Heredado | Parser determinista \+ Motor LLM Universal. Sin cambios en lógica de extracción. |
| **Autenticación (v2.0)** | ✅ Heredado | Supabase Auth \+ Google OAuth. Sin cambios. |
| **Exportación (v2.0)** | ✅ Heredado | CSV/PDF. Se añade Excel en plan Pro. |
| **Pagos (v2.0)** | 🔄 Actualizado | Transbank se mantiene. Se añaden planes y billing mensual/anual. |
| **UX / Interfaz** | 🔄 Rediseñado | Flujo completo rediseñado para usuario no técnico. Onboarding guiado. |

# **2\. Modelo de Negocio — Freemium SaaS**

## **2.1 Propuesta de Valor**

PriceScout Chile permite a emprendedores, pymes y comercios saber exactamente a qué precio vende su competencia, sin ser técnicos y sin perder tiempo buscando manualmente. La plataforma convierte datos de precios dispersos en inteligencia competitiva accionable.

## **2.2 Segmentos de Clientes (ICP)**

| Segmento | Perfil | Pain principal |
| :---- | :---- | :---- |
| **Emprendedor** | Tienda online pequeña, 1-3 personas. Vende en Instagram, MercadoLibre o tienda propia. | No sabe si su precio está bien puesto vs. la competencia. |
| **Pyme e-commerce** | Empresa de 5–50 personas con canal online. Tiene jefe de marketing o dueño activo. | Pierde ventas sin saber por qué. Sospecha que la competencia bajó precios. |
| **Importador / Distribuidor** | Importa productos y los revende. Necesita saber el precio de mercado antes de fijar el suyo. | Fija precios a ciegas al lanzar un producto nuevo. |
| **Agencia / Consultor** | Gestiona varias marcas o clientes. Necesita reportes para presentar. | Le toma horas hacer comparativas manuales para sus clientes. |

## **2.3 Planes y Precios**

*Precios en CLP con IVA incluido. Facturación mensual. Descuento 20% en pago anual.*

| Característica | Gratis | Starter$4.990/mes | Pro$12.990/mes | Business$29.990/mes |
| :---- | ----- | ----- | ----- | ----- |
| **Búsquedas / mes** | 5 | 50 | 200 | Ilimitadas |
| **Productos monitoreados** | 3 | 20 | 100 | 500 |
| **Competidores por producto** | 3 | 10 | 30 | Sin límite |
| **Modalidad A (URLs propias)** | ✅ | ✅ | ✅ | ✅ |
| **Modalidad B (Auto-discover)** | ❌ | ✅ | ✅ | ✅ |
| **Alertas de precio** | ❌ | 5 alertas | Ilimitadas | Ilimitadas |
| **Historial de precios** | 7 días | 30 días | 1 año | 3 años |
| **Exportación CSV** | ❌ | ✅ | ✅ | ✅ |
| **Exportación Excel/PDF** | ❌ | ❌ | ✅ | ✅ |
| **Dashboard analítico** | Básico | Completo | Completo | Completo |
| **Usuarios en cuenta** | 1 | 1 | 3 | 10 |
| **Soporte** | Comunidad | Email | Prioritario | Dedicado |
| **API acceso** | ❌ | ❌ | ❌ | ✅ |

## **2.4 Proyección de Ingresos**

| Escenario | Usuarios Gratis | Starter | Pro | MRR estimado |
| :---- | ----- | ----- | ----- | ----- |
| **MVP (Mes 3\)** | 200 | 20 | 5 | **\~$165.000 CLP** |
| **Crecimiento (6)** | 800 | 80 | 20 | **\~$659.000 CLP** |
| **Escala (12)** | 3000 | 300 | 80 | **\~$2.540.000 CLP** |

*Break-even operativo: 4 suscriptores Starter (cubre \~$14.000 CLP/mes de infra en MVP).*

# **3\. Modalidades de Búsqueda**

PriceScout v3.0 ofrece dos caminos para que el usuario obtenga inteligencia de precios. Ambas modalidades alimentan el mismo motor híbrido de extracción y los mismos componentes de dashboard y alertas.

## **3.1 Modalidad A — «Sé quiénes son mis competidores»**

*El usuario conoce a sus competidores y tiene sus URLs. El sistema extrae y compara precios directamente.*

### **Flujo del usuario:**

* El usuario ingresa el nombre del producto que quiere monitorear (ej: «Cafetera Oster 12 tazas»).

* Carga entre 1 y N URLs de páginas de producto de sus competidores.

* El sistema identifica el dominio de cada URL y aplica el motor correspondiente (parser determinista o LLM).

* En menos de 60 segundos recibe una tabla comparativa con precios, stock, descuentos y badge de confianza.

* El usuario puede guardar la búsqueda como «proyecto» para monitoreo recurrente.

### **Requerimientos funcionales — Modalidad A:**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| **MA-01** | **Campo de producto** | Input de texto libre para nombre del producto. Placeholder: «Escribe el nombre del producto que vendes». Máx. 150 caracteres. |
| **MA-02** | **Carga de URLs** | Área de texto multi-línea, una URL por línea. Límite según plan (3 Gratis / 10 Starter / 30 Pro / sin límite Business). Validación de formato URL en tiempo real. |
| **MA-03** | **Detección de dominio** | El sistema extrae el dominio de cada URL y lo muestra al usuario con ícono de la tienda (favicon). Clasifica automáticamente como tienda conocida o desconocida. |
| **MA-04** | **Routing de extracción** | Dominios en KNOWN\_STORES → Parser determinista. Dominios fuera de lista → Motor LLM Universal (Gemini 2.5 Flash-Lite con fallback). |
| **MA-05** | **Resultado comparativo** | Tabla con: nombre del producto en la tienda, precio actual CLP, precio original (si hay oferta), % descuento, estado de stock, badge Extraído con IA (si aplica), link a la fuente. |
| **MA-06** | **Guardar como proyecto** | Botón «Guardar y monitorear». Asigna nombre al proyecto. Queda en dashboard para búsquedas recurrentes. Requiere plan Starter o superior. |
| **MA-07** | **Refresco manual** | Botón «Actualizar precios ahora» dentro del proyecto. Lanza nuevo scraping. Límite: 1 refresco/hora por proyecto. |

## **3.2 Modalidad B — «Búscame mis competidores»**

*El usuario no conoce sus competidores o quiere descubrir nuevos. La plataforma los encuentra automáticamente mediante un cuestionario guiado. Disponible desde plan Starter.*

### **Flujo del cuestionario (5 pasos):**

* **Producto:** Paso 1 — ¿Qué vendes?

     Nombre del producto \+ categoría (selector). Ej: «Aspiradora robot» → Categoría: Hogar / Electrodomésticos.

* **Canal:** Paso 2 — ¿Dónde vendes?

     Selector múltiple: Tienda propia (.cl), MercadoLibre, Instagram/redes, Local físico.

* **Precio propio:** Paso 3 — ¿A qué precio vendes tú?

     Input numérico en CLP. Opcional pero mejora la inteligencia del análisis (posición de mercado).

* **Segmento:** Paso 4 — ¿Quién es tu cliente?

     Selector: Consumidor final (B2C) / Empresas (B2B) / Ambos.

* **Objetivo:** Paso 5 — ¿Qué quieres saber?

     Opciones: «¿Estoy cobrando bien?» / «¿Quién vende más barato?» / «¿Hay oportunidad de subir precio?»

### **Requerimientos funcionales — Modalidad B:**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| **MB-01** | **Cuestionario guiado** | Wizard de 5 pasos con barra de progreso. Diseño simple, sin jerga técnica. Cada paso tiene texto explicativo y ejemplo concreto. |
| **MB-02** | **Generación de queries** | Con los datos del cuestionario el sistema genera 5–10 queries de búsqueda optimizados para DuckDuckGo. Ejemplo: «aspiradora robot precio chile site:.cl». |
| **MB-03** | **Descubrimiento de tiendas** | DuckDuckGo retorna URLs. El sistema filtra resultados: descarta redes sociales, artículos de blog, comparadores genéricos. Prioriza e-commerces con dominio .cl. |
| **MB-04** | **Ranking de competidores** | Lista de hasta 15 tiendas encontradas con: dominio, precio detectado, nivel de confianza. El usuario puede desmarcar las que no son relevantes. |
| **MB-05** | **Confirmación y extracción** | El usuario confirma los competidores a monitorear. El sistema lanza extracción completa y muestra resultados en formato idéntico a Modalidad A. |
| **MB-06** | **Score de confianza de fuente** | Cada fuente recibe un score 1–5 basado en: historial de extracción exitosa, dominio .cl, precio en rango válido, in\_stock true. Se muestra al usuario. |
| **MB-07** | **Guardar proyecto** | Igual que MA-06. El proyecto queda con los competidores descubiertos \+ posibilidad de agregar URLs manualmente después. |

# **4\. Dashboard Analítico**

El dashboard es el corazón de la experiencia de usuario recurrente. Transforma datos de precios en inteligencia accionable. Está diseñado para que un emprendedor sin conocimientos técnicos entienda su posición competitiva en segundos.

## **4.1 Estructura del Dashboard**

| Sección | Componente | Descripción |
| :---- | :---- | :---- |
| **Resumen ejecutivo** | **KPI Cards (top)** | 4 tarjetas: Precio mínimo del mercado hoy / Tu posición vs competencia / Alertas activas / Última actualización. |
| **Resumen ejecutivo** | **Indicador de posición** | Gauge visual: «Estás en el percentil X del mercado». Verde \= precio competitivo / Rojo \= precio alto vs mercado. |
| **Evolución de precios** | **Gráfico de líneas** | Histórico de precios por producto y por competidor. Selector de rango: 7d / 30d / 90d / 1 año. |
| **Evolución de precios** | **Tabla de variación** | Tabla con columnas: Competidor / Precio actual / Precio hace 7d / Variación % / Tendencia (↑↓→). |
| **Mapa de precios** | **Scatter / Barras** | Distribución de precios del mercado. Marca con línea vertical el precio propio del usuario. |
| **Alertas recientes** | **Feed de alertas** | Lista cronológica: «Falabella bajó el precio de \[producto\] de $X a $Y (↓15%)». Con link al producto. |
| **Proyectos** | **Lista de proyectos** | Cards con nombre del proyecto, nº de competidores, último precio mínimo, próxima actualización programada. |

## **4.2 Requerimientos Funcionales — Dashboard**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| **DB-01** | **Vista resumen global** | Primera pantalla post-login. Muestra todos los proyectos activos del usuario con KPIs agregados. Carga en \< 2 seg (datos cacheados en Redis). |
| **DB-02** | **Vista de proyecto** | Al hacer clic en un proyecto: tabla de precios de competidores, gráfico de evolución, alertas del proyecto. |
| **DB-03** | **Gráfico histórico interactivo** | Gráfico de líneas con tooltip al hover mostrando precio exacto, fecha y tienda. Líneas de colores distintos por competidor. |
| **DB-04** | **Filtros de competidores** | Checkbox para mostrar/ocultar competidores específicos en el gráfico. Útil cuando hay muchas fuentes. |
| **DB-05** | **Posición de mercado** | Calcula y muestra: precio mínimo, máximo, promedio del mercado. Si el usuario ingresó su precio: muestra si está por arriba/abajo del promedio con %. |
| **DB-06** | **Exportación desde dashboard** | Botón «Exportar» en cada proyecto. Formatos según plan: CSV (Starter+), Excel+PDF (Pro+). |
| **DB-07** | **Actualización de datos** | Proyectos se actualizan automáticamente: 1x/día (Starter), 4x/día (Pro), cada 2 hrs (Business). Indicador de frescura de datos. |
| **DB-08** | **Búsqueda rápida** | Barra de búsqueda en dashboard que filtra proyectos y productos monitoreados por nombre. |

# **5\. Sistema de Alertas**

Las alertas son el mecanismo que convierte PriceScout en una herramienta de monitoreo continuo, no solo de consulta puntual. El objetivo es que el usuario sea el primero en enterarse cuando algo relevante cambia en el mercado.

## **5.1 Tipos de Alerta**

| Tipo | Descripción | Ejemplo de mensaje | Plan mínimo |
| :---- | :---- | :---- | ----- |
| **Bajada de precio** | Un competidor redujo el precio de un producto monitoreado. | *Ripley bajó «Cafetera Oster» de $29.990 a $24.990 (↓17%). Ahora son los más baratos.* | **Starter** |
| **Nuevo mínimo de mercado** | El precio más bajo del mercado es ahora menor al precio del usuario. | *Hay un nuevo mínimo de mercado para «Cafetera Oster»: $21.990 en PCFactory.* | **Starter** |
| **Subida de precio** | Un competidor aumentó su precio (oportunidad de subir el propio). | *Falabella subió «Cafetera Oster» de $25.000 a $31.990. Tú estás $6.990 más barato.* | **Pro** |
| **Producto sin stock** | Un competidor se quedó sin stock (oportunidad de capturar demanda). | *Lider.cl tiene «Cafetera Oster» sin stock. Buena oportunidad para destacar.* | **Pro** |
| **Nuevo competidor** | Se detectó una tienda nueva vendiendo el producto en la Modalidad B. | *Detectamos un nuevo vendedor de «Cafetera Oster»: elitehome.cl a $23.500.* | **Pro** |
| **Precio umbral** | El precio de mercado cayó bajo un umbral definido por el usuario. | *El mercado de «Cafetera Oster» tiene precios bajo los $25.000 que definiste.* | **Starter** |

## **5.2 Requerimientos Funcionales — Alertas**

| ID | Nombre | Descripción |
| :---- | :---- | :---- |
| **AL-01** | **Crear alerta** | Desde el dashboard o desde un resultado de búsqueda, el usuario activa una alerta con 1 clic. Elige tipo de alerta y canal de notificación. |
| **AL-02** | **Canales de notificación** | Email (todos los planes). Push notification web (Starter+). Integración Slack/WhatsApp Business (Business). |
| **AL-03** | **Frecuencia de evaluación** | El sistema evalúa si se cumple condición de alerta cada vez que actualiza precios (según frecuencia del plan). No envía duplicados en 24 hrs. |
| **AL-04** | **Panel de gestión de alertas** | Vista dedicada: lista de alertas activas con estado (activa/pausada), última vez disparada, botón editar/pausar/eliminar. |
| **AL-05** | **Historial de alertas** | Log de todas las alertas disparadas con fecha, tipo, producto y el precio que lo disparó. Exportable en Pro+. |
| **AL-06** | **Límites por plan** | Gratis: 0 alertas. Starter: 5 alertas activas. Pro: ilimitadas. Business: ilimitadas \+ resumen diario por email. |
| **AL-07** | **Digest semanal** | Resumen semanal automático por email para todos los usuarios con cuenta activa: «Esta semana en tu mercado: X productos bajaron, Y subieron». |

# **6\. UX y Flujos de Usuario**

## **6.1 Principios de Diseño**

* **→** Lenguaje de negocio, no técnico.

     Nunca decir «scraping», «LLM», «parser». Decir: «buscando precios», «verificando», «actualizando».

* **→** Cero fricción en el primer uso.

     El usuario puede hacer su primera búsqueda en \< 2 minutos sin tarjeta de crédito.

* **→** El resultado siempre es accionable.

     Cada pantalla de resultados termina con una recomendación concreta basada en el análisis.

* **→** Progresivo, no abrumador.

     La complejidad se revela a medida que el usuario la necesita. Onboarding de 3 pasos máximo.

## **6.2 Flujo de Onboarding**

| Paso | Pantalla | Acción del usuario | Mensaje clave |
| ----- | :---- | :---- | :---- |
| **1** | **Registro** | Email \+ contraseña o Google OAuth. Sin formularios largos. | *«Empieza gratis, sin tarjeta»* |
| **2** | **Elección de modalidad** | Card A: «Ya sé quiénes son» / Card B: «Ayúdame a encontrarlos». | *«¿Cómo quieres empezar?»* |
| **3A** | **Modalidad A — Input** | Escribe producto \+ pega URLs de competidores. | *«En menos de 1 minuto tienes los precios»* |
| **3B** | **Modalidad B — Cuestionario** | 5 preguntas simples con ejemplos y placeholders. | *«Cuéntanos de tu negocio»* |
| **4** | **Resultados** | Tabla comparativa animada mientras carga. Resultado con insights. | *«Así están los precios hoy»* |
| **5** | **Guardar y activar alerta** | Modal: nombre del proyecto \+ activar alerta de bajada de precio. | *«Te avisamos si algo cambia»* |

## **6.3 Pantallas Principales**

| Pantalla | Contenido y componentes clave |
| :---- | :---- |
| **Home / Landing** | Propuesta de valor en 1 línea. CTA «Busca gratis». Demo animada de resultados. Testimonios de pymes. Tabla de planes. |
| **Registro / Login** | Form mínimo. Google OAuth destacado. Sin captcha en registro. Verificación email asíncrona (no bloquea el uso inmediato). |
| **Elección de modalidad** | Dos cards grandes con ícono, título y subtítulo explicativo. Card A «Ya tengo las URLs» / Card B «Ayúdame a encontrarlos». Sin texto técnico. |
| **Búsqueda Modalidad A** | Campo nombre del producto (top). Área de texto para URLs con validación en tiempo real. Preview de dominios detectados con favicon. Botón «Buscar precios». |
| **Cuestionario Modalidad B** | Wizard con progress bar (paso X de 5). Una pregunta por pantalla. Respuestas por click (no tipeo donde sea posible). Botón «Volver» siempre disponible. |
| **Resultados** | Header: nombre del producto \+ fecha. KPIs: precio mínimo / máximo / promedio. Tabla de competidores. Insight generado con IA (ej: «Estás $3.000 sobre el promedio»). CTA guardar. |
| **Dashboard Home** | Saludo personalizado. KPIs globales. Lista de proyectos activos con mini-gráficos. Feed de alertas recientes. Botón «+ Nueva búsqueda». |
| **Vista de Proyecto** | Nombre del proyecto. Gráfico histórico interactivo. Tabla de precios actualizada. Panel de alertas del proyecto. Exportar / Actualizar ahora. |
| **Gestión de Alertas** | Lista de alertas con toggle activa/pausada. Filtro por proyecto. Historial de disparos. Botón \+ Nueva alerta. |
| **Configuración de cuenta** | Plan actual \+ uso del mes (barra de progreso). Botón upgrade. Datos de facturación. Preferencias de notificación. Gestión de usuarios (Business). |

# **7\. Arquitectura Técnica v3.0**

La arquitectura de v2.0 se mantiene como base. Los nuevos componentes se suman sin reemplazar la lógica existente de scraping híbrido.

## **7.1 Nuevos Componentes**

| Componente | Tecnología | Descripción |
| :---- | :---- | :---- |
| **Cuestionario Modalidad B** | *React (frontend) \+ FastAPI (backend)* | Wizard de 5 pasos. El backend genera queries de búsqueda a partir de las respuestas usando un prompt LLM. |
| **Competitor Discovery Engine** | *duckduckgo-search \+ filtro heurístico* | Genera queries, ejecuta búsqueda, filtra resultados (descarta blogs, redes, comparadores). Retorna lista de dominios candidatos con score. |
| **Source Quality Score** | *Python — cálculo interno* | Score 1–5 por dominio basado en: historial de extracciones exitosas, dominio .cl, precios en rango válido, in\_stock rate. |
| **Price History Service** | *PostgreSQL \+ TimescaleDB (extensión)* | Almacena serie temporal de precios por (producto, dominio). Permite consultas de rango temporal eficientes. |
| **Analytics Engine** | *Python \+ Pandas (server-side)* | Calcula KPIs: mín/máx/promedio, variación %, percentil de precio del usuario, tendencia (últimos 7d vs 7d anteriores). |
| **Alert Evaluator** | *Celery Beat (tarea programada)* | Corre cada vez que se actualizan precios. Evalúa condiciones de alerta. Encola notificaciones. Registra disparos. |
| **Notification Service** | *SendGrid (email) \+ Web Push API* | Envía alertas por email y push. Respeta preferencias del usuario. Evita duplicados con Redis deduplication key (TTL 24h). |
| **Billing / Planes** | *Transbank (pagos) \+ tabla plans en Supabase* | Gestión de planes, límites por feature, upgrade/downgrade. Billing mensual automático. |

## **7.2 Nuevas Tablas en Base de Datos**

| Tabla | Campos principales |
| :---- | :---- |
| **projects** | id, user\_id, name, modality (A/B), created\_at, updated\_at, refresh\_frequency |
| **project\_competitors** | id, project\_id, domain, url, source\_quality\_score, is\_known\_store |
| **price\_history** | id, project\_competitor\_id, product\_name, price\_clp, price\_original\_clp, discount\_pct, in\_stock, confidence, extracted\_at |
| **alerts** | id, user\_id, project\_id, alert\_type, threshold\_value, channel (email/push/slack), is\_active, last\_triggered\_at |
| **alert\_log** | id, alert\_id, triggered\_at, old\_price, new\_price, competitor\_domain, notification\_sent |
| **questionnaire\_responses** | id, user\_id, product\_name, category, channels\[\], user\_price\_clp, segment, objective, created\_at |
| **source\_quality** | domain, total\_extractions, successful\_extractions, avg\_confidence, last\_success\_at, quality\_score |

## **7.3 Nuevas Variables de Entorno**

| Variable | Descripción |
| :---- | :---- |
| **SENDGRID\_API\_KEY** | API key de SendGrid para envío de emails de alerta y digest semanal. |
| **VAPID\_PUBLIC\_KEY / VAPID\_PRIVATE\_KEY** | Claves para Web Push Notifications (alertas push en browser). |
| **COMPETITOR\_DISCOVERY\_MAX\_RESULTS** | Máximo de competidores a retornar en Modalidad B (default: 15). |
| **ALERT\_DEDUP\_TTL\_HOURS** | Horas antes de re-enviar la misma alerta (default: 24). |
| **TIMESCALE\_ENABLED** | true/false. Activa extensión TimescaleDB para price\_history. |
| **PLAN\_REFRESH\_FREQ\_STARTER** | Frecuencia de refresco en horas para plan Starter (default: 24). |
| **PLAN\_REFRESH\_FREQ\_PRO** | Frecuencia de refresco en horas para plan Pro (default: 6). |
| **PLAN\_REFRESH\_FREQ\_BUSINESS** | Frecuencia de refresco en horas para plan Business (default: 2). |

# **8\. Roadmap de Desarrollo**

| Fase | Duración | Entregables |
| :---- | ----- | :---- |
| **MVP (v3.0)** | 6 semanas | Autenticación \+ Modalidad A \+ resultados básicos \+ guardar proyecto \+ plan Gratis y Starter funcionando. |
| **Fase 2** | 4 semanas | Modalidad B (cuestionario \+ discovery) \+ Dashboard completo con historial \+ gráficos. |
| **Fase 3** | 3 semanas | Sistema de alertas completo (email \+ push) \+ gestión de alertas en dashboard \+ digest semanal. |
| **Fase 4** | 2 semanas | Plan Pro y Business \+ exportación Excel/PDF \+ multi-usuario \+ API para Business. |
| **Fase 5** | Continua | Expansión LATAM (parsers para Argentina/Colombia) \+ integraciones (Slack, WhatsApp) \+ app móvil. |

*El motor híbrido (v2.0) ya está diseñado. Las Fases 1–4 son de producto/UX sobre esa base. Estimación total: \~15 semanas al primer lanzamiento completo.*

## **8.1 Métricas de Éxito del Producto**

| Métrica | Target Mes 3 | Target Mes 12 |
| :---- | ----- | ----- |
| **Usuarios registrados** | 300 | **5.000** |
| **Conversión Gratis → Pago** | 8% | **12%** |
| **MRR** | $165.000 CLP | **$2.500.000 CLP** |
| **Proyectos activos (total)** | 150 | **3.000** |
| **Tasa de retención mensual** | \>60% | **\>75%** |
| **NPS (Net Promoter Score)** | \>30 | **\>50** |
| **Alertas creadas / usuario pago** | 2 | **5** |
| **Tiempo promedio 1ra búsqueda** | \< 3 min | **\< 2 min** |

*PriceScout Chile — SRS v3.0 · Plataforma SaaS Pública · Mayo 2026 · Confidencial*