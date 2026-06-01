**PriceScout Chile**  ·  Frontend Design Specification v1.0

🎨

**PRICESCOUT CHILE**

Frontend Design Specification

Sistema de Diseño · Reglas de UI/UX · Inventario de Pantallas

| **Documento** | FDS — PriceScout Chile v1.0 |
| --- | --- |
| **Complementa** | SRS Técnico v1.0 |
| **Audiencia** | Diseñadores, Agentes IA, Devs Frontend |
| **Stack UI** | Next.js 15 + Tailwind CSS + shadcn/ui |
| **Dispositivos** | Desktop · Tablet · Mobile (Responsive) |
| **Fecha** | Abril 2026 |

# **1. Filosofía de Diseño**

## **1.1 Principios Rectores**

Todo elemento visual de PriceScout Chile debe cumplir estos cuatro principios. Cuando exista conflicto entre principios, el orden aquí definido es la jerarquía de decisión.

| **Principio** | **Definición** | **Prioridad** |
| --- | --- | --- |
| **Claridad ante todo** | El usuario debe entender el precio y la tienda ganadora en menos de 3 segundos. Nunca sacrificar legibilidad por estética. | 1 — Crítica |
| **Confianza visual** | Aspecto profesional y limpio que inspire confianza en los datos. Similar a herramientas financieras chilenas (Fintual, CMF). | 2 — Alta |
| **Eficiencia de uso** | Las acciones más frecuentes (buscar, comparar, exportar) requieren el mínimo de clics posibles. UI sin fricciones. | 3 — Alta |
| **Escalabilidad estética** | Los componentes funcionan con 3 resultados o con 50. El sistema visual no colapsa bajo densidad de datos. | 4 — Media |

## **1.2 Personalidad de Marca**

| **PriceScout Chile es:** |
| --- |
| ✅  Preciso — Los datos son el héroe. La UI sirve a los números, no al revés. |
| ✅  Confiable — Seriedad visual sin frialdad. Como un asesor de compras inteligente. |
| ✅  Accesible — Funciona para un consumidor buscando un celular y para un analista de retail. |
| ✅  Chileno — Usa CLP, referencia marcas locales, tono cercano y directo. |
| ❌  NO es: Juguetón, excesivamente colorido, ni intenta parecer una red social. |
|  |

## **1.3 Tono Visual de Referencia**

Referentes de estilo que guían las decisiones de diseño (no copiar, sino tomar dirección):

- Fintual.com — Confianza + claridad de datos financieros en Chile

- Linear.app — Densidad de información sin ruido visual

- Vercel Dashboard — Cards limpias, tipografía bien jerarquizada

- Google Shopping Chile — Comparativa de precios familiar para el usuario objetivo

# **2. Design Tokens**

Los design tokens son las variables fundamentales del sistema. TODOS los valores de color, tipografía, espaciado y sombras deben usar estos tokens. Nunca usar valores hardcodeados en componentes.

## **2.1 Paleta de Color**

### **Colores de Marca (Brand)**

|  | **Token** | **Hex** | **Uso** |
| --- | --- | --- | --- |
|  | **--color-primary-700** | #1D4ED8 | Botones primarios, links, énfasis de marca |
|  | **--color-primary-600** | #2563EB | Hover de botón primario, iconos activos |
|  | **--color-primary-100** | #DBEAFE | Fondos de sección destacada, badges info |
|  | **--color-primary-50** | #EFF6FF | Fondo de cards activas, selected states |
|  | **--color-accent-600** | #059669 | Badge "Precio más bajo", éxito, CTA secundario |
|  | **--color-accent-100** | #D1FAE5 | Fondo badge precio mínimo, alertas positivas |
|  | **--color-danger-500** | #EF4444 | Badge "Precio más alto", errores, alertas |
|  | **--color-danger-50** | #FEF2F2 | Fondo alerta de error, fila precio máximo |
|  | **--color-warning-500** | #F59E0B | Advertencias, stock bajo, score medio |
|  | **--color-warning-50** | #FFFBEB | Fondo advertencia suave |

### **Colores Neutros (Slate)**

|  | **Token** | **Hex** | **Uso** |
| --- | --- | --- | --- |
|  | **--color-slate-900** | #0F172A | Títulos principales, texto de alta jerarquía |
|  | **--color-slate-700** | #334155 | Cuerpo de texto, subtítulos |
|  | **--color-slate-500** | #64748B | Texto secundario, labels, metadata |
|  | **--color-slate-400** | #94A3B8 | Placeholders, texto deshabilitado |
|  | **--color-slate-200** | #E2E8F0 | Bordes de componentes, divisores |
|  | **--color-slate-100** | #F1F5F9 | Fondo alterno de filas, hover de items |
|  | **--color-slate-50** | #F8FAFC | Fondo de página (background global) |
|  | **--color-white** | #FFFFFF | Fondo de cards, modales, superficies elevadas |

## **2.2 Tipografía**

| **Sistema Tipográfico** |
| --- |
| Display / Headings: "Plus Jakarta Sans" — Variable, geométrica, moderna, con personalidad sin ser rara. |
| Body / UI: "DM Sans" — Legible a tamaños pequeños, excelente para tablas y datos. |
| Monospace (precios, códigos): "JetBrains Mono" — Para números de precio y códigos de error. |
| Carga: Google Fonts. Ambas fuentes con display:swap para performance. |
|  |

| **Token** | **Fuente** | **Tamaño** | **Peso** | **Uso** |
| --- | --- | --- | --- | --- |
| **--text-display** | Plus Jakarta Sans | 36–48px / 3xl–4xl | 700 | Títulos de página, nombre de producto en ficha |
| **--text-heading-1** | Plus Jakarta Sans | 28px / 2xl | 700 | H1 de sección dentro de página |
| **--text-heading-2** | Plus Jakarta Sans | 22px / xl | 600 | H2 subsecciones, títulos de card |
| **--text-heading-3** | Plus Jakarta Sans | 18px / lg | 600 | H3, labels de grupo, títulos de tabla |
| **--text-body-lg** | DM Sans | 16px / base | 400 | Cuerpo de texto principal, descripciones |
| **--text-body** | DM Sans | 14px / sm | 400 | UI labels, contenido de cards, metadata |
| **--text-small** | DM Sans | 12px / xs | 400 | Captions, timestamps, notas de pie |
| **--text-price** | JetBrains Mono | 18–24px | 600–700 | Valores de precio en CLP (siempre monoespacio) |
| **--text-badge** | DM Sans | 11px / xs | 600 | Texto dentro de badges y chips |

## **2.3 Espaciado**

Sistema de 4px base. Todos los valores de margin, padding y gap deben ser múltiplos de 4.

| **Token** | **Valor px** | **Tailwind** | **Uso típico** |
| --- | --- | --- | --- |
| **--space-1** | 4px | p-1 | Gaps mínimos entre iconos y texto |
| **--space-2** | 8px | p-2 | Padding interno de badges y chips |
| **--space-3** | 12px | p-3 | Padding de botones compactos |
| **--space-4** | 16px | p-4 | Padding estándar de cards |
| **--space-5** | 20px | p-5 | Separación entre secciones de card |
| **--space-6** | 24px | p-6 | Padding de cards grandes, modales |
| **--space-8** | 32px | p-8 | Separación entre bloques de contenido |
| **--space-12** | 48px | p-12 | Separación entre secciones de página |
| **--space-16** | 64px | p-16 | Padding de página en desktop |
| **--space-24** | 96px | p-24 | Secciones hero, espacios generosos |

## **2.4 Radios de Borde**

| **Token** | **Valor** | **Tailwind** | **Componentes** |
| --- | --- | --- | --- |
| **--radius-sm** | 4px | rounded | Badges, chips, tooltips, inputs |
| **--radius-md** | 8px | rounded-lg | Botones, dropdowns, popovers |
| **--radius-lg** | 12px | rounded-xl | Cards principales, modales |
| **--radius-xl** | 16px | rounded-2xl | Cards de resultado destacado, panels |
| **--radius-full** | 9999px | rounded-full | Avatares, badges de estado circular, toggles |

## **2.5 Sombras**

| **Token** | **Valor CSS** | **Uso** |
| --- | --- | --- |
| **--shadow-xs** | 0 1px 2px rgba(15,23,42,0.05) | Inputs, elementos base |
| **--shadow-sm** | 0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04) | Cards en reposo |
| **--shadow-md** | 0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.04) | Cards en hover, dropdowns |
| **--shadow-lg** | 0 10px 15px rgba(15,23,42,0.08), 0 4px 6px rgba(15,23,42,0.03) | Modales, panels flotantes |
| **--shadow-focus** | 0 0 0 3px rgba(37,99,235,0.3) | Estado focus de inputs y botones (accesibilidad) |

# **3. Sistema de Componentes (Atomic Design)**

Todos los componentes están organizados según Atomic Design: Átomos → Moléculas → Organismos → Plantillas → Páginas. Esta jerarquía determina el orden de implementación.

## **3.1 Átomos**

Los átomos son la unidad mínima indivisible del sistema. No dependen de otros componentes.

### **A-01 · Botones**

| **Variante** | **Estado Normal** | **Hover** | **Disabled** | **Uso** |
| --- | --- | --- | --- | --- |
| **Primary** | bg-primary-700, texto blanco | bg-primary-600, shadow-md | opacity-40, cursor-not-allowed | CTA principal: Comparar, Buscar |
| **Secondary** | bg-white, border slate-200, texto slate-700 | bg-slate-50, border slate-300 | opacity-40 | Acciones secundarias: Cancelar, Limpiar |
| **Accent** | bg-accent-600, texto blanco | bg-emerald-700 | opacity-40 | Exportar Excel, Ver oferta |
| **Ghost** | bg-transparent, texto primary-700 | bg-primary-50 | opacity-40 | Acciones terciarias en cards |
| **Danger** | bg-danger-500, texto blanco | bg-red-600 | opacity-40 | Eliminar, Cancelar suscripción |
| **Icon-only** | bg-white, border, ícono slate-500 | bg-slate-50, ícono slate-700 | opacity-40 | Acciones compactas en tablas |

- Tamaños: sm (h-8, px-3, text-sm) · md (h-10, px-4, text-sm) · lg (h-12, px-6, text-base)

- Border radius: --radius-md (8px) para todos los botones

- Transición: transition-all duration-150 ease-in-out en hover y focus

- Focus visible: outline de --shadow-focus (anillo azul de 3px)

### **A-02 · Badges y Chips**

| **Nombre** | **Colores** | **Tamaño** | **Uso en PriceScout** |
| --- | --- | --- | --- |
| **Badge Precio Mínimo** | bg-accent-100, text-accent-700, border-accent-200 | h-5, px-2, text-xs, font-semibold | Fila del resultado con precio más bajo |
| **Badge Precio Máximo** | bg-danger-50, text-danger-600, border-danger-200 | h-5, px-2, text-xs, font-semibold | Fila del resultado con precio más alto |
| **Badge Plan** | bg-primary-100, text-primary-700 | h-5, px-2, text-xs | Plan activo del usuario en nav |
| **Badge Coincidencia Alta** | bg-accent-100, text-accent-700 | h-5, px-2, text-xs | Score de match en Opción B |
| **Badge Coincidencia Media** | bg-warning-50, text-warning-700 | h-5, px-2, text-xs | Score de match medio en Opción B |
| **Badge Coincidencia Baja** | bg-slate-100, text-slate-500 | h-5, px-2, text-xs | Score de match bajo en Opción B |
| **Badge Estado Job** | Varía: pending=slate, running=blue, done=green, error=red | h-5, px-2, text-xs | Estado de scraping en progreso |
| **Chip Filtro Activo** | bg-primary-50, text-primary-700, border-primary-200, × | h-6, px-3, text-xs | Filtros aplicados en resultados |

- Todos los badges tienen border-radius: --radius-full (píldora)

- Font: DM Sans 11px, font-weight: 600. Nunca bold pesado en badges.

### **A-03 · Inputs y Formularios**

| **Estado** | **Estilos** | **Regla** |
| --- | --- | --- |
| **Default** | border-slate-200, bg-white, text-slate-700 | Placeholder en slate-400. Label siempre arriba del input (nunca floating label). |
| **Focus** | border-primary-500, shadow-focus, ring-2 | Anillo azul visible. Accesibilidad WCAG 2.1 AA obligatoria. |
| **Error** | border-danger-500, bg-danger-50 | Mensaje de error debajo del input en text-danger-600, text-sm. Ícono de error a la derecha. |
| **Success** | border-accent-500, bg-accent-50 | Ícono check verde a la derecha. Mensaje de éxito opcional. |
| **Disabled** | bg-slate-50, text-slate-400, cursor-not-allowed | No cambiar color de borde. Reducir opacidad solo en texto. |
| **Con ícono** | pl-10 (ícono izquierda) o pr-10 (ícono derecha) | Ícono en slate-400 por defecto, slate-600 en focus. |

- Altura estándar de input: h-10 (40px). Large (barra búsqueda principal): h-12 (48px).

- Border radius: --radius-md (8px). Nunca inputs con bordes rectos.

### **A-04 · Iconografía**

- Librería: Lucide Icons (incluida en shadcn/ui). Nunca mezclar con otras librerías.

- Tamaños: 16px (inline en texto), 20px (botones e inputs), 24px (navegación), 32px (ilustraciones vacías)

- Stroke width: 1.5px para todos los iconos (consistencia visual de la librería)

- Color: heredado del texto circundante salvo excepción explícita (currentColor)

- Íconos clave de la app: Search, ArrowUpDown, TrendingDown, TrendingUp, Download, Clock, Bell, Star, ExternalLink, RefreshCw, Filter, ChevronDown

### **A-05 · Loader / Skeleton**

- Skeleton loading: bloques grises animados (animate-pulse) que replican la forma del contenido final.

- Color skeleton: bg-slate-200 con gradiente animado de bg-slate-100.

- Spinner: Solo para acciones puntuales (clic en botón). Nunca en carga de página completa.

- Progress bar lineal: Para jobs de scraping en progreso. Color primary-600, fondo primary-100.

## **3.2 Moléculas**

Combinaciones de átomos que forman unidades con propósito propio.

### **M-01 · Barra de Búsqueda Principal**

- Estructura: [Ícono Search] + [Input text lg h-12] + [Botón Primary lg "Comparar"] + [Toggle "Opción A / B"]

- Width: 100% en mobile, max-w-3xl centrado en desktop.

- El toggle Opción A/B cambia el comportamiento del input: A muestra textarea para URLs, B muestra input simple de texto.

- Placeholder Opción A: "Pega los URLs de las páginas de producto..."

- Placeholder Opción B: "Ej: iPhone 15 Pro 256GB, Samsung S24..."

- En Opción A, debajo del input: contador "0/3 URLs" (actualiza en tiempo real) en text-slate-400.

### **M-02 · Tarjeta de Resultado (Price Card)**

- Estructura: [Logo tienda 32px] + [Nombre tienda] + [Badge estado] + [Precio Principal monoespacio] + [Precio Normal tachado si hay oferta] + [Badge ahorro %] + [Botón "Ver oferta" ghost con ExternalLink]

- Fondo: bg-white, border border-slate-200, rounded-xl, shadow-sm.

- Hover: shadow-md, border-primary-200. Transición 200ms.

- Si es precio mínimo: borde izquierdo de 3px solid accent-500 + badge "PRECIO MÁS BAJO".

- Si es precio máximo: borde izquierdo de 3px solid danger-500 + badge "PRECIO MÁS ALTO".

- Si está sin stock: overlay sutil, texto "Sin stock" sobre el precio, botón deshabilitado.

### **M-03 · Fila de Historial (History Row)**

- Estructura horizontal: [Checkbox] + [Nombre producto truncado] + [Nº tiendas scrapeadas] + [Precio mínimo encontrado badge green] + [Fecha relativa "hace 2 días"] + [Botón "Actualizar" icon] + [Botón "Exportar" icon] + [Menú "..." (eliminar)]

- Altura: h-14. Borde inferior border-slate-100.

- Hover: bg-slate-50.

- Cuando checkbox está seleccionado: bg-primary-50, borde izquierdo primary.

### **M-04 · Stat Card (KPI)**

- Estructura: [Ícono 20px en bg-primary-50] + [Label text-sm slate-500] + [Valor text-2xl font-bold slate-900] + [Delta opcional: flecha + % en verde/rojo]

- Cards de resumen en la ficha del producto: "Precio más bajo", "Precio más alto", "Promedio", "Ahorro máximo".

- Grid de 4 columnas en desktop, 2x2 en tablet, 1 columna en mobile.

- Fondo blanco, border slate-200, rounded-xl, shadow-xs.

### **M-05 · Chip de Filtro**

- Átomo badge + botón × para remover.

- Cuando activo: bg-primary-50, border-primary-200, text-primary-700.

- Lista de chips de filtros activos aparece debajo de la barra de búsqueda en la vista de resultados.

- Botón "Limpiar filtros" en ghost al final de la lista de chips.

### **M-06 · Toast / Notificación**

- Aparece en esquina inferior derecha. Max-width 380px. Rounded-xl, shadow-lg.

- Variantes: Success (borde-left green), Error (borde-left red), Warning (borde-left amber), Info (borde-left blue).

- Estructura: [Ícono] + [Título bold] + [Mensaje text-sm] + [Botón cerrar ×]

- Auto-dismiss: 4 segundos (Success/Info), 8 segundos (Error). Barra de progreso de tiempo.

- Máximo 3 toasts visibles simultáneamente (cola FIFO).

## **3.3 Organismos**

Bloques complejos que componen secciones completas de la interfaz.

### **O-01 · Navegación Principal (Navbar)**

- Altura: h-16 (64px). Fondo: bg-white. Borde inferior: border-b border-slate-200. Sticky top-0.

- Sombra al hacer scroll: shadow-sm (activar con JS en scroll > 0).

- Desktop: [Logo + nombre] [Nav links: Dashboard / Historial / Alertas] [Spacer] [Badge Plan] [Avatar menú dropdown]

- Mobile: [Logo] [Spacer] [Hamburger icon]. Menú: drawer lateral desde la izquierda.

- Logo: ícono gráfico + texto "PriceScout" en Plus Jakarta Sans bold. Color primary-700.

- Nav links: text-sm font-medium. Default: text-slate-600. Active: text-primary-700 + indicador underline de 2px primary.

### **O-02 · Panel de Resultados**

- Sección principal de la app. Compuesto por: Ficha del producto (Stat Cards M-04) + Barra de filtros y ordenamiento + Grid de Price Cards (M-02).

- Barra de control: [Texto "N resultados"] + [Chips de filtros activos M-05] + [Selector "Ordenar por" dropdown] + [Botón "Exportar Excel" accent]

- Grid de Price Cards: 3 columnas en desktop (min-w 280px), 2 columnas en tablet, 1 columna en mobile.

- La Price Card del precio mínimo siempre va primera independientemente del ordenamiento.

- Si hay más de 6 resultados: mostrar los primeros 6 y botón "Ver todos los resultados" ghost.

- Estado vacío: ilustración + texto "No se encontraron resultados" + sugerencia de acción.

### **O-03 · Panel de Progreso de Scraping**

- Se muestra entre el momento del submit y la llegada de los resultados.

- Estructura: [Encabezado: "Buscando precios..."] + [Progress bar global] + [Lista de sitios con estado individual]

- Cada fila de sitio: [Logo tienda 24px] + [Nombre] + [Badge estado: Pendiente/Extrayendo/Completado/Error] + [Spinner si activo]

- Progress bar: ancho % calculado como (completados+fallidos) / total. Animación smooth.

- Al completar: transition automática a Panel de Resultados con fade-in suave (300ms).

- Si hay errores parciales: mantener resultados obtenidos + toast warning informando URLs fallidas.

### **O-04 · Historial**

- Encabezado: [Título "Mis comparaciones"] + [Barra de búsqueda inline] + [Selector rango de fechas] + [Botón "Exportar seleccionados" disabled hasta selección]

- Lista de History Rows (M-03) ordenadas por fecha desc.

- Selección múltiple: checkbox en cada fila + "Seleccionar todo". Al seleccionar, aparece barra de acciones flotante bottom.

- Barra de acciones flotante: [N seleccionados] + [Botón Exportar accent] + [Botón Eliminar danger] + [× cerrar]

- Paginación: 20 items por página. Paginación con números (no scroll infinito — los datos son accionables).

### **O-05 · Modal de Upgrade de Plan**

- Trigger: cualquier acción que supere el límite del plan actual.

- Fondo: overlay bg-slate-900/60 blur-sm.

- Card modal: max-w-lg, rounded-2xl, bg-white, shadow-lg.

- Contenido: [Ícono de candado en primary-100] + [Título "Actualiza tu plan"] + [Descripción específica del límite alcanzado] + [Tabla comparativa 2 columnas: plan actual vs plan superior] + [Botón CTA primary grande] + [Link "Ver todos los planes" ghost]

- Cerrable con × o clic fuera solo si el usuario no intentó una acción crítica.

# **4. Sistema de Layout y Grid**

## **4.1 Breakpoints**

| **Nombre** | **Breakpoint** | **Tailwind** | **Descripción** |
| --- | --- | --- | --- |
| **Mobile** | < 640px | default (sin prefijo) | Una columna. Navegación en drawer. Búsqueda full width. |
| **Tablet** | 640px – 1023px | sm: / md: | Dos columnas en grids. Navbar visible. Cards en 2 col. |
| **Desktop** | 1024px – 1279px | lg: | Layout completo. 3 cols en resultados. Sidebar si aplica. |
| **Wide** | ≥ 1280px | xl: / 2xl: | Contenido centrado max-w-7xl. Márgenes generosos. |

## **4.2 Contenedor y Márgenes**

- Contenedor global: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8

- Nunca usar width fijo en componentes que deben ser fluidos

- Gap estándar en grids: gap-4 (mobile), gap-6 (tablet+)

- Padding de página vertical: py-6 (mobile), py-8 (desktop)

## **4.3 Estructura de Página Base**

| **Anatomía de cada pantalla** |
| --- |
| [Navbar sticky — h-16] |
| [Page Header — título + breadcrumb + acción principal] |
| [Content Area — max-w-7xl, padding horizontal] |
| ├─ Sidebar opcional (solo desktop, max-w-64) |
| └─ Main Content (flex-1) |
| [Footer mínimo — links legales, versión] |
|  |

# **5. Reglas de Animación y Movimiento**

El movimiento en PriceScout debe sentirse útil y fluido, nunca decorativo ni lento. Regla de oro: si la animación demora más de 400ms, es demasiado larga.

| **Interacción** | **Duración** | **Easing** | **Descripción** |
| --- | --- | --- | --- |
| **Hover sobre card** | 150ms | ease-out | Elevación de shadow-sm → shadow-md. Leve translate-y-[-1px] |
| **Clic en botón** | 100ms | ease-in | Scale de 0.97 en active. Vuelta inmediata al soltar. |
| **Apertura de dropdown** | 150ms | ease-out | Fade-in + translate-y de -4px → 0. Sin bounce. |
| **Apertura de modal** | 250ms | ease-out | Overlay fade-in + card scale 0.95 → 1 + fade-in. |
| **Cierre de modal** | 180ms | ease-in | Más rápido que apertura. Overlay fade-out simultáneo. |
| **Toast entrada** | 300ms | spring (suave) | Slide desde la derecha + fade-in. |
| **Resultados (cards)** | 200–400ms stagger | ease-out | Cards aparecen con animation-delay escalonado de 50ms. |
| **Progress bar** | continuo | linear | Transición de width con transition-all duration-300. |
| **Skeleton → contenido** | 300ms | ease-in-out | Fade-out del skeleton, fade-in del contenido real. |
| **Número de precio** | 600ms | ease-out | Counter animation del precio (0 → valor real) al cargar. |

| **⚠️  Regla: Respetar prefers-reduced-motion** |
| --- |
| Todos los componentes con animación deben verificar prefers-reduced-motion. |
| Si está activo: eliminar transforms y transitions. Mantener solo fade-in/out suaves (opacity). |
| Implementación: @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; } } |
|  |

# **6. Inventario de Pantallas**

Catálogo completo de todas las vistas del sistema. Cada pantalla tiene ID, nombre, ruta y descripción de layout.

| **ID** | **Pantalla** | **Ruta** | **Descripción de Layout y Contenido** |
| --- | --- | --- | --- |
| **P-01** | **Landing Page** | / | Hero con headline + CTA + demo animada. Sección "Cómo funciona" (3 pasos). Sección de planes (3 columnas). Testimonios. Footer. |
| **P-02** | **Login** | /login | Card centrada max-w-sm. Logo arriba. Form email+password. OAuth Google. Link "Crear cuenta" + "Olvidé contraseña". |
| **P-03** | **Registro** | /register | Card centrada max-w-sm. Form nombre+email+password. Onboarding de segmento en paso 2 (stepper visual). |
| **P-04** | **Dashboard** | /dashboard | Navbar + Page Header con saludo personalizado. Stats globales (total comparaciones, ahorro acumulado). Acceso rápido: Nueva comparación. Últimas 5 comparaciones (History Rows). Alertas activas. |
| **P-05** | **Nueva Comparación** | /compare/new | Barra de búsqueda principal centrada y grande. Toggle Opción A/B. En A: textarea URLs. En B: input + checklist de tiendas. Botón "Comparar". |
| **P-06** | **Progreso de Scraping** | /compare/[jobId]/loading | Panel de progreso O-03. Sin navbar distractor (full-focus). Cancelar job disponible. |
| **P-07** | **Resultados** | /compare/[jobId] | Ficha producto (Stats 4 KPIs). Barra control (filtros + ordenar + exportar). Grid de Price Cards. Gráfico de barras de precios. Histórico si existe. |
| **P-08** | **Historial** | /history | Page header + buscador inline + filtro fechas. Lista History Rows con paginación. Bulk actions. |
| **P-09** | **Detalle Histórico** | /history/[compId] | Misma vista que P-07 pero en modo "solo lectura" del pasado. Banner indicando fecha de la comparación. |
| **P-10** | **Alertas** | /alerts | Lista de alertas activas (producto, umbral, tiendas, frecuencia, estado). Crear/editar/eliminar alerta. Historial de alertas disparadas. |
| **P-11** | **Perfil y Plan** | /settings/profile | Dos columnas: izquierda perfil (nombre, email, segmento, cambiar contraseña), derecha plan actual (plan, uso del mes, botón upgrade/cancelar). |
| **P-12** | **Facturación** | /settings/billing | Plan actual + próxima fecha de cobro. Tabla de historial de pagos. Descarga de boletas. Cambio de método de pago. |
| **P-13** | **Planes (Upgrade)** | /pricing | Grid de 4 planes. Tabla comparativa detallada. FAQ. Recomendación inteligente basada en uso actual del usuario. |
| **P-14** | **Onboarding** | /onboarding | Stepper de 3 pasos: (1) Segmento de mercado, (2) Primera comparación guiada, (3) Tour del dashboard. Solo se muestra una vez. |
| **P-15** | **Error 404** | /404 | Ilustración amigable + "Página no encontrada" + botón volver al dashboard. |
| **P-16** | **Error 500** | /500 | Ilustración + "Algo salió mal" + ID de incidente + botón reportar + volver. |
| **P-17** | **Mantenimiento** | /maintenance | Pantalla simple: logo + mensaje de mantenimiento + tiempo estimado de retorno. |

# **7. Accesibilidad (WCAG 2.1 AA)**

PriceScout Chile debe cumplir el estándar WCAG 2.1 nivel AA como mínimo. Estas reglas no son opcionales.

## **7.1 Contraste de Color**

| **Combinación** | **Ratio requerido** | **Ratio actual** | **Estado** |
| --- | --- | --- | --- |
| Texto normal sobre blanco (#334155 / #FFF) | 4.5:1 | 9.2:1 | **✅ Pasa** |
| Texto pequeño precio (#0F172A / #FFF) | 4.5:1 | 19.6:1 | **✅ Pasa** |
| Botón primary (blanco / #1D4ED8) | 4.5:1 | 8.1:1 | **✅ Pasa** |
| Badge mínimo (accent-700 / accent-100) | 4.5:1 | 6.3:1 | **✅ Pasa** |
| Badge máximo (danger-600 / danger-50) | 4.5:1 | 5.8:1 | **✅ Pasa** |
| Placeholder (slate-400 / #FFF) | 3:1 (no texto) | 2.9:1 | **⚠️ Revisar** |

## **7.2 Reglas de Accesibilidad**

- Navegación por teclado: todos los elementos interactivos alcanzables con Tab. Orden lógico.

- Focus visible: nunca usar outline: none sin reemplazar por --shadow-focus.

- ARIA labels: botones con solo ícono deben tener aria-label descriptivo.

- Imágenes: logos de tiendas con alt="Logo de [Tienda]". Imágenes decorativas con alt="".

- Errores de formulario: asociados al input con aria-describedby. Role="alert" en mensajes de error.

- Modales: focus trap dentro del modal. Escape para cerrar. aria-modal="true".

- Tamaño mínimo de área táctil: 44x44px en mobile (botones e iconos de acción).

- Precios: nunca expresar solo con color. Usar badge textual además del color.

# **8. Reglas de Diseño — Do****'****s ****&**** Don****'****ts**

| **✅  DO — Hacer** | **❌  DON****'****T — No hacer** |
| --- | --- |
| ✅  Usar JetBrains Mono para todos los valores de precio | ❌  Mostrar precios en la misma fuente que el cuerpo de texto |
| ✅  Mostrar siempre el precio en CLP con formato $1.234.567 | ❌  Mostrar precios sin formato de miles o en otras monedas |
| ✅  Indicar "Precio más bajo" con color Y badge textual | ❌  Usar solo color verde para indicar el precio ganador |
| ✅  Mostrar skeleton loading mientras carga el scraping | ❌  Mostrar página en blanco o spinner de pantalla completa |
| ✅  Usar sombras sutiles (shadow-sm/md) en cards | ❌  Usar drop-shadow exagerado o múltiples bordes decorativos |
| ✅  Mantener el botón "Exportar" siempre visible en resultados | ❌  Esconder exportar en menú desplegable de difícil acceso |
| ✅  Mostrar logo de cada tienda para reconocimiento inmediato | ❌  Solo texto del nombre de la tienda sin logo |
| ✅  Responsive: una columna en mobile para price cards | ❌  Tabla horizontal de resultados que obligue scroll horizontal |
| ✅  Toast de error con texto específico del problema | ❌  Toast genérico "Algo salió mal" sin información útil |
| ✅  Focus ring visible en todos los elementos interactivos | ❌  Remover outline: none sin reemplazar por alternativa visual |
| ✅  Agrupar acciones secundarias en menú "..." compacto | ❌  Mostrar 5+ botones de acción por fila en historial |
| ✅  Labels siempre visibles encima de los inputs | ❌  Floating labels que desaparecen al escribir (confunden) |

# **9. Comportamiento Responsive por Componente**

| **Componente** | **Mobile (****<**** 640px)** | **Tablet (640–1023px)** | **Desktop (≥ 1024px)** |
| --- | --- | --- | --- |
| **Navbar** | Logo + hamburger. Drawer lateral. | Logo + links principales. Avatar. | Logo + todos los links + badge plan + avatar. |
| **Barra de búsqueda** | Full width, vertical: input arriba, botón abajo. | Full width horizontal h-12. | Centrada max-w-3xl, h-12. |
| **Grid de price cards** | 1 columna, full width. | 2 columnas, gap-4. | 3 columnas, gap-6. |
| **Stat Cards (KPI)** | 2x2 grid, valores grandes. | 2x2 grid. | 4 columnas en fila. |
| **Historial (tabla)** | Cards apiladas con info resumida. Sin columnas. | Tabla con 4 columnas visible. | Tabla completa con todas las columnas. |
| **Filtros** | Drawer lateral activable con botón "Filtrar". | Barra horizontal con chips. | Barra horizontal con chips + dropdown. |
| **Planes (Pricing)** | 1 columna, cards apiladas. | 2 columnas. | 4 columnas o 3+destacada. |
| **Modal** | Full screen en mobile (bottom sheet) | Card centrada max-w-md. | Card centrada max-w-lg. |
| **Gráfico de barras** | Scroll horizontal si > 5 barras. | Full width. | Full width con labels visibles. |

# **10. Estados Vacíos y Pantallas de Error**

Todo listado o panel de datos debe tener un estado vacío definido. Nunca mostrar una tabla vacía sin guía al usuario.

| **Pantalla / Componente** | **Estado Vacío — Mensaje + Ícono** | **CTA sugerido** |
| --- | --- | --- |
| **Dashboard (sin comparaciones)** | Ícono SearchX + "Aún no has comparado ningún producto" | "Hacer mi primera comparación" → P-05 |
| **Resultados (0 encontrados)** | Ícono PackageX + "No encontramos precios para esta búsqueda" | "Intentar con Opción B" o "Modificar búsqueda" |
| **Historial vacío** | Ícono Clock + "Tu historial aparecerá aquí" | "Nueva comparación" → P-05 |
| **Alertas vacías** | Ícono Bell + "No tienes alertas activas" | "Crear mi primera alerta" (solo si plan lo permite) |
| **Error de scraping total** | Ícono AlertCircle + "No pudimos acceder a ningún sitio" | "Reintentar" + "Reportar problema" |
| **Sin conexión** | Ícono WifiOff + "Sin conexión a internet" | "Reintentar" (auto-retry cada 10 seg) |

| **Anatomía de un estado vacío** |
| --- |
| 1. Ilustración / ícono: Lucide icon 48px en bg-slate-100 redondeado, color slate-400. |
| 2. Título: "No hay [X] aún" — Plus Jakarta Sans, 18px, slate-700, font-semibold. |
| 3. Subtítulo (opcional): Explicación breve de qué falta y por qué. DM Sans, 14px, slate-500. |
| 4. CTA: Botón Primary o Secondary según la importancia de la acción sugerida. |
| Centrado vertical y horizontalmente en el espacio disponible. min-height: 240px. |
|  |

PriceScout Chile — Frontend Design Spec v1.0  ·  Confidencial  ·  Abril 2026

Pág.