# Tasks: Rediseño UI Web — "Operacional con calidez"

**Feature**: `001-ui-redesign` | **Branch**: `main` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

**Constitución**: `.specify/memory/constitution.md` **v1.0.1** (ratificada 2026-08-01)

---

## Estado de partida (auditado contra el código el 2026-08-01)

La spec es del 2026-06-29 y **la mayor parte ya está implementada**. Estas tareas
cubren únicamente lo que falta. Lo verificado como completo no genera tarea:

| FR | Estado | Evidencia en el código |
| --- | --- | --- |
| FR-002 tema claro/oscuro persistido | ✅ | `src/components/providers/ThemeProvider.tsx` (next-themes), `src/components/layout/ThemeToggle.tsx` |
| FR-005 dashboard progressive disclosure | ✅ | `src/app/(app)/dashboard/page.tsx` — `HairlineRule label="Atención"` antes del detalle |
| FR-008 accent pistacho + semánticos | ✅ | `src/app/globals.css` — `--accent`, `--urgent`, `--done`, `--warn`, `--info`, `--project-color` |
| FR-010 portal siempre claro | ✅ | `src/app/(portal)/layout.tsx` — `colorScheme: "light"` |
| FR-011 / FR-012 | — | Restricción y alcance; no generan tarea |
| FR-001 tokens única fuente | ✅ | Los **valores** tienen una sola fuente (CSS vars en `globals.css`). T006 decidió que Edition 04 es el vocabulario canónico; 10 nombres del bloque compat son alias puros y se retiran en T036 (limpieza opcional, no hueco de spec). |
| FR-003 reskin primitivos | ◐ | 10 primitivos en `src/components/ui/`. Faltan `Table` y *stat strip*, ambos listados en FR-003. |
| FR-004 pantallas con primitivos | ◐ | 6 grupos de clases duplicadas restantes (todas intra-archivo). |
| FR-006 densidad ERP | ◐ | `DensityToggle` funciona y persiste, pero solo en 3 de 6 vistas ERP. |
| FR-007 reduced-motion | ✅ | **Cerrado (T002–T003, T005).** `MotionConfig` cubría 1 componente; las otras 50 animaciones CSS ahora las cubre el bloque `@media (prefers-reduced-motion: reduce)` de `globals.css`, sostenido por `src/tests/reduced-motion.test.ts`. Falta solo la verificación manual (T004). |
| FR-009 accesibilidad AA | ◐ | Foco visible ✅ (`globals.css:192`), nombre accesible en botones de solo icono ✅ (`IconButton` lo exige por tipo). **Contraste AA sin medir** en ningún tema. |

## Format: `[ID] [P?] [Story] Description`

- `[P]` = paralelizable (archivos distintos, sin dependencias pendientes)
- `[US#]` = user story del spec

## Path Conventions

Proyecto único Next.js App Router. Código en `src/`, tests en `src/**/*.test.ts` y
`src/tests/`. Sin `tests/` separado.

---

## Phase 1: Setup

- [x] T001 Confirmar línea base verde corriendo `npm run verify` (type-check + lint + vitest) y anotar el conteo de tests como referencia de paridad para el principio I

---

## Phase 2: Foundational (bloquea todas las user stories)

**Por qué es bloqueante**: la constitución v1.0.1, principio III, exige que las
animaciones respeten `prefers-reduced-motion`. Hoy la app lo incumple para 50 de
sus 51 animaciones. Agregar más UI encima de un incumplimiento conocido lo
agranda, así que esto va antes que el resto aunque su user story sea P3.

- [x] T002 Agregar un bloque `@media (prefers-reduced-motion: reduce)` en `src/app/globals.css` que neutralice movimiento sobre `*`, `*::before` y `*::after`: `animation-duration: 0.01ms`, `animation-iteration-count: 1` y `scroll-behavior: auto`
- [x] T003 Acotar las transiciones en `src/app/globals.css` recortando `transition-property` a una allowlist sin `transform`, en vez de un `transition-duration` global — las 73 `transition-colors` y 6 `transition-opacity` son feedback de estado, no movimiento, y apagarlas empeora hover/focus sin ganar accesibilidad
- [ ] T004 ⚠️ **Requiere al usuario** — verificar con "menos movimiento" activo en el SO, siguiendo la sección "Validación de accesibilidad" de `specs/001-ui-redesign/quickstart.md`, que `animate-fade-in` (40 usos), `animate-slide-up` (5), `transition-transform` (4) y `hover:scale-110` (1) dejan de moverse y que el foco visible sigue presente. El agente no puede togglear la preferencia del sistema; T005 cubre la parte automatizable
- [x] T005 Escribir `src/tests/reduced-motion.test.ts` que falle si `src/app/globals.css` pierde el bloque `prefers-reduced-motion`, o si aparece una nueva clase `animate-*` en `tailwind.config.ts` sin cobertura en ese bloque — la constitución exige un test cuando el compilador no puede sostener la regla
- [x] T006 Decidir y registrar en `specs/001-ui-redesign/contracts/ui-contract.md` cuál es el vocabulario de token canónico (Edition 04 `ink-soft`/`rule` vs alias legacy `text-muted`/`border`), para que las migraciones siguientes sepan a qué nombres escribir

**Checkpoint**: la app respeta reduced-motion en toda su superficie y el vocabulario de token está decidido.

---

## Phase 3: User Story 1 — Base visual unificada (P1)

**Goal**: cerrar los dos primitivos que FR-003 lista y que todavía no existen.

**Independent Test**: una tabla del ERP y una fila de KPIs se renderizan desde un
primitivo compartido; cambiar el tema afecta ambas de forma coherente; ninguna
vista escribe a mano la estructura de tabla.

- [x] T007 [P] [US1] Crear el primitivo `Table` en `src/components/ui/Table.tsx` con subcomponentes `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`, consumiendo `--erp-row-py` para heredar la densidad sin que el caller la cablee
- [x] T008 [P] [US1] Crear el primitivo `StatStrip` en `src/components/ui/StatStrip.tsx` para filas de KPIs, usando la clase `.kpi-value` que ya existe en `src/app/globals.css` y numerales tabulares
- [x] T009 [US1] Migrar la tabla de permisos de `src/components/admin/AdminWorkspacesTab.tsx` (único `<table>` escrito a mano del repo) al primitivo `Table`
- [x] T010 [P] [US1] Migrar las filas de KPI de `src/app/(app)/operations/page.tsx` al primitivo `StatStrip`
- [x] T011 [P] [US1] Migrar las tarjetas de totales de `src/components/operations/SalesView.tsx` al primitivo `StatStrip`
- [x] T012 [US1] Extender `src/tests/button-conformance.test.ts` con una regla que falle si un archivo fuera de `src/components/ui/` escribe `<table>` o `<thead>` a mano

**Checkpoint**: los 12 primitivos de FR-003 existen y las vistas los consumen.

---

## Phase 4: User Story 3 — Migración pantalla por pantalla (P2)

**Goal**: eliminar los 6 grupos de clases duplicadas que quedan. Todos son
repeticiones dentro de un mismo archivo: se resuelven con subcomponentes locales,
no con primitivos compartidos.

**Independent Test**: el escaneo de duplicados reporta 0 grupos con ≥2 usos, y
cada pantalla afectada conserva exactamente el mismo comportamiento.

- [x] T013 [P] [US3] Extraer un subcomponente local `EventChip` en `src/components/calendar/CalendarView.tsx` que absorba los 2 duplicados de `flex items-center gap-1 rounded px-1 py-1 text-xs` (líneas ~331 y ~369)
- [x] T014 [P] [US3] Extraer un subcomponente local `DayOverflowButton` en `src/components/calendar/CalendarView.tsx` para los 2 duplicados de `block w-full rounded px-1 py-1 text-left text-xs font-medium text-primary` (líneas ~356 y ~391)
- [x] T015 [P] [US3] Extraer un subcomponente local `DayDetailRow` en `src/components/calendar/CalendarView.tsx` para los 2 duplicados de `flex items-center gap-2 rounded px-2 py-2 text-sm text-text` (líneas ~539 y ~618)
- [x] T016 [P] [US3] Extraer un helper local para el par duplicado `inline-flex items-center gap-1 text-xs text-text-muted` en `src/components/layout/NotificationsBell.tsx` (líneas ~182 y ~279), que hoy se escribe una vez como `<button>` y otra como `<Link>`
- [x] T017 [P] [US3] Unificar los 2 usos de `text-ink-soft hover:bg-surface-el hover:text-ink` en `src/components/tasks/TaskDetail.tsx` (líneas ~343 y ~384) y alinear el hover a `accent-soft`, que es el que usan los primitivos
- [x] T018 [US3] Confirmar con `npm run verify` que las cinco extracciones no cambiaron comportamiento (principio I)

**Checkpoint**: 0 grupos duplicados en el escaneo; paridad verificada.

---

## Phase 5: User Story 4 — Densidad ajustable en tablas del ERP (P3)

**Goal**: FR-006 pide densidad en "las vistas de tablas del ERP". Hoy la tienen
3 de 6.

**Independent Test**: en cotizador, clientes/cobros y equipo, el control alterna
compacto/cómodo, cambia el alto de fila y la preferencia persiste entre recargas.

- [x] T019 [P] [US4] Montar `<DensityToggle />` y aplicar `py-[var(--erp-row-py)]` a las filas del listado de cotizaciones en `src/app/(app)/operations/cotizador/page.tsx`
- [x] T020 [P] [US4] Montar `<DensityToggle />` y aplicar `py-[var(--erp-row-py)]` a las filas de clientes/cobros en `src/components/clients/ClientsView.tsx`
- [x] T021 [P] [US4] Montar `<DensityToggle />` y aplicar `py-[var(--erp-row-py)]` a las filas de equipo en `src/components/operations/TeamView.tsx`
- [x] T022 [US4] Verificar SC-006 siguiendo "Validación de densidad (ERP)" de `specs/001-ui-redesign/quickstart.md`: medir que el modo compacto muestra al menos ~40% más filas que el cómodo a la misma altura, en las 6 vistas ERP

**Checkpoint**: FR-006 cubre las 6 vistas ERP y SC-006 está medido, no supuesto.

---

## Phase 6: Cumplimiento constitucional — literales de color

**Por qué antes del contraste**: T029 ajusta valores en `globals.css`. No tiene
sentido corregir contraste mientras 5 archivos esquivan los tokens y conservan
colores viejos que ese ajuste no alcanzaría.

Alcance auditado el 2026-08-01: **14 violaciones reales**, no las 73 que reporta
un grep ingenuo. Las otras 59 son correctas por diseño y están exceptuadas en la
constitución v1.0.1 §Restricciones técnicas — no tocarlas.

- [x] T023 Reemplazar `PIE_COLORS` en `src/components/reports/ReportsView.tsx:39-46` por un import de `ENTORNO_SWATCHES` de `src/lib/constants/entornoColors.ts` — los 6 valores son idénticos verbatim
- [x] T024 [P] Reemplazar los 4 `oklch(...)` de `src/components/clients/ClientsView.tsx` (líneas ~179, ~314, ~316, ~329) por los tokens `urgent`, `done` y `warn`
- [x] T025 [P] Reemplazar los 2 `oklch(...)` de `src/components/reports/ClientReportsView.tsx` (líneas ~281, ~495) por los tokens `urgent` y `done`
- [x] T026 [P] Resolver `DEFAULT_COLOR = "#ff6b6b"` en `src/components/calendar/CalendarView.tsx:102` — el valor **no coincide** con `--coral` (#c96b35), así que es un token huérfano: decidir si debe ser `var(--coral)` o `DEFAULT_ENTORNO_COLOR` y documentarlo
- [x] T027 [P] Reemplazar el fallback `"#161412"` de `src/app/(app)/dashboard/page.tsx:290` por `var(--ink)`, que es exactamente ese valor en tema claro y además se adapta al oscuro
- [x] T028 Crear `src/tests/color-tokens.test.ts` que falle si aparece un literal de color en `src/components/**` o `src/app/(app)/**`, descontando comentarios, con las excepciones de la constitución v1.0.1 declaradas vía marcador `color-literal-ok:` y razón escrita. (Archivo propio en vez de extender `button-conformance`: cada test de conformidad cubre una regla.)

**Checkpoint**: cero literales de color fuera de las excepciones, sostenido por un test.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T029 Escribir `src/lib/utils/contrast.ts` con el cálculo de ratio de contraste WCAG 2.1 (luminancia relativa) — matemática pura, sin dependencias nuevas (principio II)
- [x] T030 Escribir `src/tests/token-contrast.test.ts` que parsee los tokens de `src/app/globals.css` y falle si algún par texto/fondo en uso baja de 4.5:1 (texto normal) o 3:1 (texto grande y controles), **en ambos temas** — cierra SC-005, que hoy no está medido
- [x] T031 Corregir en `src/app/globals.css` los pares que T030 reporte por debajo del umbral, ajustando solo lightness para preservar la identidad pistacho
- [x] T032 Foco visible — la parte automatizable está cubierta por `src/tests/theme-and-focus.test.ts`: nadie puede quitar `outline-none` sin poner un anillo o escribir una razón. Encontró 13 controles sin indicador; 8 se migraron al primitivo `Input`, 1 era bug real (título de nota) y 4 son legítimos con razón escrita. **Queda manual**: tabular por cada pantalla y mirar
- [x] T033 SC-003 — `theme-and-focus.test.ts` verifica el invariante: cero variantes `dark:` en todo `src`, o sea que ninguna pantalla decide su tema aparte de los tokens. **Queda manual**: togglear y confirmar que persiste sin flash
- [ ] T034 Verificar SC-004 en `src/app/(app)/dashboard/page.tsx` con viewport de referencia 1280×720: el bloque "Atención" debe quedar completo sobre el pliegue, sin scroll
- [x] T035 SC-007 — `theme-and-focus.test.ts` verifica que `(portal)/layout.tsx` fuerza `colorScheme: light` y que ninguna pantalla del portal consume un token que cambie con `.dark`. **Queda manual**: abrirlo con tema oscuro activo
- [x] T036 Reemplazar los 318 usos del vocabulario legacy (`text-text-muted`, `text-text-tertiary`, `border-border`, `bg-surface-el`) por el canónico decidido en T006, y eliminar el bloque "Compat con código existente" de `tailwind.config.ts` — **solo si T006 decidió unificar**; es limpieza, no requisito de spec
- [x] T037 Actualizar el estado de la spec en `specs/001-ui-redesign/spec.md` de `Draft` a `Implemented` con la fecha de cierre

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → sin dependencias
- **Phase 2 (Foundational)** → depende de T001. **Bloquea todo lo demás** por cumplimiento del principio III
- **Phase 3 (US1)** → depende de Phase 2 (T006 define el vocabulario que usan los primitivos nuevos)
- **Phase 4 (US3)** → depende de Phase 2. Independiente de Phase 3
- **Phase 5 (US4)** → depende de Phase 3 (T007 `Table` consume `--erp-row-py`)
- **Phase 6 (literales de color)** → independiente de Phases 3–5. **Bloquea Phase 7**: T031 ajusta valores en `globals.css` y no sirve hacerlo mientras 5 archivos esquivan los tokens
- **Phase 7 (Polish)** → T029–T035 independientes entre sí; T036 depende de T006

### User Story Dependencies

- **US1 (P1)** → independiente una vez cerrada Phase 2
- **US2 (P2)** → **ya entregada**, sin tareas
- **US3 (P2)** → independiente de US1; toca archivos distintos
- **US4 (P3)** → depende de US1 para heredar densidad desde el primitivo `Table`
- **US5 (P3)** → **absorbida en Phase 2** por ser bloqueante constitucional

### Parallel Opportunities

- **Phase 3**: T007, T008 en paralelo (primitivos nuevos, archivos distintos). Luego T010 y T011 en paralelo
- **Phase 4**: T013–T017 los cinco en paralelo — T013/T014/T015 tocan el mismo archivo, así que **corren en paralelo solo si se hacen en una sola pasada** por `CalendarView.tsx`; T016 y T017 sí son independientes
- **Phase 5**: T019, T020, T021 en paralelo (tres archivos distintos)
- **Phase 6**: T024, T025, T026 y T027 en paralelo (cuatro archivos distintos). T023 aparte porque toca el mismo archivo que ninguna otra, pero T028 va al final: el test necesita que las cinco migraciones estén hechas
- **Phase 7**: T029 y T032–T035 en paralelo. T030 depende de T029; T031 de T030

---

## Implementation Strategy

### MVP

**Phase 1 + Phase 2** es el MVP y no es negociable: cierra el único
incumplimiento constitucional vigente. Son 6 tareas, mayormente un bloque CSS y
un test. Entrega valor solo: la app deja de mover cosas para quien pidió que no
se muevan.

### Orden recomendado

1. **Phase 2** primero, aunque su user story sea P3. Un incumplimiento del
   principio III crece con cada pantalla nueva.
2. **Phase 6** segundo. Son 14 reemplazos mecánicos contra tokens que ya existen,
   y es el otro incumplimiento constitucional vigente. Barato y cierra deuda.
3. **Phase 4** después: la de menor riesgo (extracciones locales, sin API nueva),
   deja el escaneo de duplicados en cero.
4. **Phase 3** y luego **Phase 5**, en ese orden, porque `Table` es lo que hace
   que la densidad se herede en vez de cablearse vista por vista.
5. **Phase 7** al final. Dentro de ella, T029/T030 antes que T031: conviene tener
   el test de contraste midiendo antes de tocar un solo color.

### Gate por tarea

Cada tarea cierra con `npm run verify` en verde (constitución, sección "Flujo de
trabajo y gates de calidad"). Ninguna tarea de estas fases debería tocar
`src/lib/actions/`, `src/lib/db/` ni el esquema — si alguna lo necesita, deja de
ser trabajo de presentación y hay que declararlo aparte (principio I).
