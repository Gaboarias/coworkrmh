# Research competitivo — rediseño completo

**Fecha**: 2026-08-01 · **Rama**: `preview` · **Para**: rediseño de la capa visual completa

Investigación de los productos mejor rankeados en la categoría de Pistachio y de las
interfaces que hoy son referencia de diseño. Cierra contrastando esos números contra el
código actual, para saber qué falta de verdad y qué ya está.

---

## 1. En qué categoría cae Pistachio

Pistachio no es un producto, son dos pegados:

| Mitad | Rutas | Categoría de mercado |
|---|---|---|
| Gestión de proyectos | `/projects`, `/my-tasks`, `/calendar`, notas, documentos | Project management |
| ERP por negocio | `/operations/*` — catálogo, cotizador, ventas, gastos, cobros | Accounting / billing |

Esa unión —proyectos + finanzas del proyecto + multi-negocio— tiene nombre propio en el
mercado: **PSA** (*Professional Services Automation*), comercializada como *agency
management software*. Es exactamente la categoría. Compararse contra Linear solo, o
contra Holded solo, deja fuera la mitad del problema.

Diferencia que importa: **Pistachio es interno**. No tiene que vender, ni onboardear, ni
retener. Eso hace que la mitad del diseño de los competidores —landings dentro del
producto, tours, upsells, celebración de logros— sea ruido y no referencia.

---

## 2. El ranking real (G2, agosto 2026)

G2 puntúa sobre ocho dimensiones verificadas por usuarios (Meets Requirements, Ease of
Use, Ease of Setup, Ease of Admin, Quality of Support, Good Partner, Internationalization,
Performance & Reliability).

| # | Producto | Score | Fuerte en |
|---|---|---|---|
| 1 | **Ruddr** | 9.31 | Implementación rápida, flujos intuitivos, integración Xero/QuickBooks |
| 2 | **Rocketlane** | 9.25 | Colaboración con cliente, tracking visual. Ease of use 9.2 — la más alta de la categoría |
| 3 | Vogsy | 9.14 | Google Workspace, setup liviano |
| 4 | Screendragon | 9.03 | Escala enterprise, workflows configurables |
| 5 | **Productive** | 8.92 | Budgeting integrado, márgenes por proyecto |
| 6 | Avaza | 8.76 | Costo bajo, time tracking |
| 7 | SuperOps | 8.75 | MSP/IT, interfaz moderna |
| 8 | Projectworks | 8.70 | Forecasting de recursos |
| 9 | **COR** | 8.67 | Rentabilidad de agencia en tiempo real. Origen latinoamericano |
| 10 | BigTime | 8.66 | Time tracking, exactitud de facturación |

Fuera del top-10 por score pero definiendo la categoría: **Scoro** (proyectos + CRM +
cotización + finanzas en un lugar; mínimo 5 asientos) y **Teamwork** (retainers,
rentabilidad por cliente, desde $9.99/usuario). Productive tiene 4.7 en G2 y 4.6 en
Capterra, y su gracia declarada es la continuidad: un deal se convierte en proyecto y el
presupuesto viaja con él.

**Regionales**, relevantes por idioma y fiscalidad:

- **Alegra** — contabilidad con cumplimiento fiscal nativo en 25+ países de LATAM,
  factura electrónica, POS. Es la referencia de la región.
- **Holded** — ERP español todo-en-uno para pymes de servicios que facturan por horas.
- **COR** — el único del top-10 con ADN latinoamericano y foco explícito en agencias
  creativas.

### Lo que este ranking dice para el rediseño

Los tres nombres que ganan —Ruddr, Rocketlane, Vogsy— **no ganan por funcionalidad**.
Ganan en *ease of use*, *ease of setup* y *performance*. A Ruddr se lo describe como el
que resuelve "el problema del software feo" de la categoría; a Workamajig, con más años y
más features, se lo describe como "interfaz anticuada" y a Kantata como "lento".

En una categoría donde todos tienen las mismas tablas, **la interfaz es la ventaja
competitiva medible**. Eso valida el rediseño como trabajo con retorno, no como cosmética.

---

## 3. El set de referencia de diseño

Distinto del set comercial, y hay que tenerlo separado: los productos que mejor puntúan en
PSA **no** son los que mejor se ven. Las referencias de oficio en 2026 son otras.

### Linear — la que todos copian

Sistema concreto, con números:

| Dimensión | Valor |
|---|---|
| Acento | **Uno solo**: `#5e6ad2`. Reservado a marca, CTA primario y foco |
| Superficies | 4 escalones (`#010102` → `#191a1b`) **sin sombras** |
| Texto | 4 niveles: `#f7f8f8` / `#d0d6e0` / `#8a8f98` / `#62666d` |
| Hairlines | `#23252a` / `#34343a` |
| Grid | 4px, aplicado a padding, márgenes, tamaño de icono y de texto |
| Alto de fila | **36px** |
| Tracking | Negativo y agresivo en display (−3px a 80px) |
| Color informativo | Gris al 40–60% de opacidad |
| Color saturado | Solo estado, prioridad e interacción |
| Carga | <200ms; transición de vista <100ms |
| Estados de carga | Skeleton, nunca spinner |
| Escritura | Optimistic UI — la acción se ve antes de que responda el server |

La fila de issue lleva título, estado, prioridad, asignado, etiquetas, proyecto y ciclo
**en una sola línea**. Es la prueba de que densidad y calma no se contradicen.

### Vercel — minimalismo estratégico

Cada elemento avanza al usuario hacia su objetivo. Un CTA por pantalla. Lo notable: **los
skeletons y los empty states reciben tanto trabajo de diseño como las vistas con datos**.

### Stripe — la referencia de tablas de datos

### Attio — el dashboard como superficie operativa

El dashboard no es un reporte: es una superficie priorizada. La IA se apoya **encima** del
dato inspeccionable, nunca en su lugar.

### Números de patrón de dashboard (consenso 2026)

| Elemento | Referencia | Pistachio hoy |
|---|---|---|
| Sidebar expandido | 256px | **228px** |
| Sidebar colapsado | 64px | **56px** |
| Alto de item de nav | 36px | ~32px |
| Estado activo | 8% del acento + barra izquierda 3px | `bg-accent-soft` + barra 2px |
| Transición | 200ms ease-in-out | 200ms ease-out |
| KPIs sobre el pliegue | 4–6, máximo | Variable por vista |
| Número principal de KPI | 28–32px | `StatStrip` lg 34px / md 22px |
| Fila de tabla estándar | 48–52px | Variable por densidad |
| Fila de tabla densa | 36–40px | `--erp-row-py` |
| Alineación | texto izq · números der · badges centro | Parcial |
| Header de tabla | `sticky` | No |
| Estados por componente | 3: skeleton, vacío, error local | Skeleton ✅ · vacío ✅ · error local ❌ |

Pistachio ya está **dentro del rango** en casi todo. El rediseño no es refundar: es cerrar
diferencias de pocos píxeles y llenar tres o cuatro huecos reales.

---

## 4. Las siete tendencias de 2026, y cuáles rechazamos

| # | Tendencia | Referencia | Postura |
|---|---|---|---|
| 1 | **Calm design** — solo lo del flujo actual; el tipo carga el peso, no los iconos | Linear, Calendly | **Adoptar.** Ya es la personalidad declarada en `PRODUCT.md` |
| 2 | IA como infraestructura — sugerencias inline, nunca un panel aparte | Notion, Intercom | **Fuera de alcance.** Principio II: sin dependencias nuevas |
| 3 | **Command palette y búsqueda unificada** — ⌘K como expectativa base | Linear, Slack | **Adoptar de verdad** (ver §5) |
| 4 | Interfaces adaptativas por rol | HubSpot, Asana | **Ya está**, vía `hasFeature` + `adminOnly` en el sidebar |
| 5 | **Progressive disclosure** — el empty state enseña una acción | Miro, Stripe | **Adoptar.** El bloque "Atención" del dashboard ya es esto |
| 6 | Diseño emocional en B2B — micro-animaciones de celebración | Asana, Notion | **Rechazar explícitamente.** `PRODUCT.md`: "Nada celebra, nada urge salvo lo que de verdad es urgente" |
| 7 | **Minimalismo estratégico** — un CTA por pantalla | Vercel, Linear | **Ya es el principio 1** del sistema |

El consenso lo resume una frase: **"confianza > complejidad"**. Y una advertencia que vale
subrayar: *robar patrones, no píxeles*. La restricción de Linear ("color = solo estado") se
copia como regla; su paleta lavanda, no.

Nota sobre "dark-first": las herramientas de uso diario (Linear, Supabase, Vercel) hoy
diseñan primero el oscuro. Pistachio ya arranca en oscuro por defecto. Alineado.

---

## 5. Hallazgos verificados en el código

Contrastando lo anterior contra el repo, no contra la memoria. Todo lo de acá está
comprobado en archivo.

### 5.1 La paleta de comandos quedó en la edición anterior

`src/components/layout/CommandPalette.tsx` existe y funciona, pero su encabezado dice
*"Sunset Aurora · N3"* — es de un sistema visual anterior. Tres consecuencias concretas:

1. **Segundo acento en la shell.** Usa `--coral` (naranja) para el item seleccionado,
   mientras el resto del producto usa pistacho. Linear es explícita en lo contrario: **un
   solo acento cromático**. `--coral` también vive en `NotificationsBell` y
   `NotificationsPage`.
2. **Clase muerta.** La línea 263 usa `text-coral`, pero `coral` **no está mapeado en
   `tailwind.config.ts`** — solo existe como CSS var. La clase no emite nada. Además
   `aria-selected:` está puesto sobre el icono, cuando `aria-selected` lo lleva el
   `Command.Item` padre: la regla nunca podría activarse.
3. **Glassmorphism.** `backdrop-blur-md` en el overlay y `backdrop-blur-2xl
   backdrop-saturate-150` en el panel. `PRODUCT.md` lo lista entre las anti-referencias, y
   `Modal.tsx` ya se corrigió en la dirección opuesta ("Overlay sin backdrop-blur"). El
   `rounded-xl` tampoco coincide con el `rounded-md` del resto.

Y la más importante: **el placeholder promete lo que no hace.** Dice *"Buscar acciones,
páginas, proyectos…"* pero solo navega a rutas fijas. El propio comentario lo admite:
buscar contenido está marcado como *"(Futuro N3+)"*. Para un producto que se "aprende una
vez y se usa mil", la búsqueda de contenido es la mitad del valor de ⌘K.

### 5.2 El badge de notificaciones no cumple AA

`NotificationsBell.tsx:175` pinta `text-white` sobre `bg-[var(--coral)]`, a 11px bold:

| Tema | `--coral` | Contraste vs blanco | AA (4.5:1) |
|---|---|---|---|
| Claro | `#c96b35` | **3.7:1** | ❌ |
| Oscuro | `#e07a4a` | **3.0:1** | ❌ |

A 11px no aplica el umbral de texto grande. **Falla en los dos temas.**

Se escapó de la red por una razón entendible: `src/tests/token-contrast.test.ts` mide 30
pares de *tokens*, y acá el color de texto es la clase literal `text-white` de Tailwind
contra una CSS var — no es un par de tokens. El test de literales de color tampoco lo ve,
porque busca `#hex`, no `text-white`. **Es un hueco de cobertura, no un descuido puntual.**

### 5.3 Lo que ya está por encima de la categoría

No todo es deuda. Contra los competidores rankeados, Pistachio ya gana en:

- **Token-first real** — cero variantes `dark:` y cero literales de color en componentes,
  ambas cosas sostenidas por tests, no por disciplina.
- **Contraste medido en los dos temas** — 30 pares verificados. La mayoría de la categoría
  no lo hace, y de ahí salen las quejas de "software feo".
- **Densidad conmutable y persistida** en las seis vistas ERP.
- **Un solo acento + hairlines + sin sombras decorativas** — la receta de Linear, ya
  aplicada (con la excepción de §5.1).
- **Tests de conformidad** que sostienen reglas que el compilador no puede. Esto es raro
  incluso entre los productos de referencia.

### 5.4 Los huecos reales

Ordenados por distancia a la referencia:

1. **Búsqueda de contenido en ⌘K.** Hoy solo navega. Es el hueco más grande contra Linear.
2. **Vistas guardadas y filtros en la URL.** Lo esperado en 2026 para tablas operativas:
   filtros por columna, estado en la URL para poder compartir la vista, columnas
   configurables. Hoy no existe. Es el hueco más grande contra el resto de la categoría.
3. **Acciones masivas.** Seleccionar filas y actuar sobre todas. Para catálogo, ventas y
   cobros es trabajo diario.
4. **Atajos de teclado.** Solo existe ⌘B. La referencia es letra sola para lo frecuente
   (C = crear) más modificadores para lo compuesto.
5. **Header de tabla `sticky`.** Barato, y en tablas ERP largas cambia el uso.
6. **Velocidad percibida.** Server Components + Server Actions implican ida y vuelta
   completa. La referencia es UI optimista con transición <100ms. Es el punto más caro y
   el que hay que decidir con cuidado.
7. **Error boundaries por componente**, no de página. Ya hay `error.tsx` de ruta.

---

## 6. Dirección propuesta

**No refundar. Terminar de aplicar el sistema que ya existe y cerrar los huecos.**

El sistema visual actual —un acento, hairlines, sin sombras, dos voces tipográficas,
tokens únicos, AA medido— coincide con la referencia de la industria. Lo que falta no es
otra identidad: es coherencia en los rincones que quedaron de ediciones anteriores, y
capacidades de uso diario que la categoría ya da por sentadas.

Tres tandas, en orden de retorno sobre esfuerzo:

**A. Coherencia (barato, visible, sin riesgo)**
Reescribir `CommandPalette` en el sistema actual: acento único, sin blur, `rounded-md`,
matar la clase muerta. Resolver `--coral` —o se retira, o se declara token semántico de
notificación y entra a la prueba de contraste. Arreglar el badge que falla AA y **extender
`token-contrast.test.ts` a los pares clase-literal/var**, para que el hueco de cobertura no
vuelva. Sticky headers. Alineación numérica a la derecha en todas las tablas ERP.

**B. Capacidades de uso diario (el salto de verdad)**
Búsqueda de contenido en ⌘K. Filtros con estado en la URL + vistas guardadas. Acciones
masivas en las tablas ERP. Atajos de una letra.

**C. Velocidad percibida (decidir antes de hacer)**
UI optimista donde tenga sentido, transiciones cortas, skeletons con la forma del
contenido. Toca arquitectura, no solo presentación — hay que evaluarlo aparte contra el
principio de paridad funcional.

**Lo que explícitamente no hacemos**: IA (principio II), micro-animaciones de celebración
(contradice la personalidad declarada), y copiar la lavanda de Linear o cualquier otra
paleta ajena.

---

## Fuentes

- [Top 30 PSA Software Platforms 2026, ranked by G2 data — Ruddr](https://www.ruddr.com/post/top-professional-services-automation-psa-platforms-for-2026)
- [Best Professional Services Automation Software — G2](https://www.g2.com/categories/professional-services-automation)
- [Top 14 Agency Management Software Systems in 2026 — Productive](https://productive.io/blog/best-agency-management-software/)
- [Agency Management Software: 10 Best Tools for 2026 — Teamwork](https://www.teamwork.com/blog/agency-management-software/)
- [7 Best Productive.io Alternatives for Agencies in 2026 — Scoro](https://www.scoro.com/blog/productive-alternatives/)
- [10 Best Agency Management System Tools Reviewed for 2026 — The Digital Project Manager](https://thedigitalprojectmanager.com/tools/best-agency-management-system/)
- [Best AI-PSA Software 2026 — Rocketlane](https://www.rocketlane.com/blogs/best-psa-software)
- [COR — Project Management & Profitability Software for Agencies](https://projectcor.com/project-management/product/)
- [Mejor ERP y software de gestión empresarial en 2026 — Guía de Software](https://www.guiadesoftware.com/categorias/erp)
- [Alegra 2026: análisis, precios y veredicto — Guía de Software](https://www.guiadesoftware.com/software/alegra)
- [Linear design system spec — awesome-design-md](https://github.com/voltagent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md)
- [Linear Design Breakdown: Why Every SaaS Team Copies This UI — 925 Studios](https://www.925studios.co/blog/linear-design-breakdown-saas-ui-2026)
- [7 SaaS UI Design Trends for 2026, Shown With Real Screens — SaaS UI](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)
- [Dashboard Design Patterns for Modern Web Apps 2026 — Art of Styleframe](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)
- [35 SaaS Dashboard Design Examples, Trends and Patterns 2026 — 925 Studios](https://www.925studios.co/blog/saas-dashboard-design-examples-2026)
- [Data table UI design reference guide for 2026 — Setproduct](https://www.setproduct.com/blog/data-table-ui-design)
- [Bulk action UX: 8 design guidelines with examples for SaaS — Eleken](https://www.eleken.co/blog-posts/bulk-actions-ux)
- [10 Best shadcn/ui Data Table Templates 2026 — AdminLTE](https://adminlte.io/blog/shadcn-ui-data-table-templates/)
