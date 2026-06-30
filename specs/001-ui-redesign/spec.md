# Feature Specification: Rediseño UI Web — "Operacional con calidez"

**Feature Branch**: `001-ui-redesign`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Rediseño completo del UI web de Pistachio (PM + CRM + ERP interno de ReWind Media House) hacia una dirección "Operacional con calidez": claridad y densidad tipo Linear/Supabase conservando la identidad pistacho, light + dark, toggle de densidad para tablas ERP, progressive disclosure, reskin de primitivos sin tocar lógica.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Base visual unificada (tokens + temas + primitivos) (Priority: P1)

Como equipo del estudio, quiero que toda la app comparta una sola base visual (colores, tipografía, espaciado) con modo claro y oscuro, para que la herramienta se vea coherente y sea cómoda de usar todo el día sin importar la pantalla.

**Why this priority**: Es el cimiento. Sin tokens y primitivos unificados, cada pantalla diverge y el resto del rediseño no se puede construir de forma consistente. Entrega valor por sí sola: coherencia visual inmediata.

**Independent Test**: Cambiar entre tema claro y oscuro afecta toda la app de forma consistente; cada primitivo (botón, input, select, modal, tarjeta/superficie, badge, encabezado de página, sidebar, topbar, tabla) se ve con la nueva identidad y mantiene exactamente el mismo comportamiento que antes.

**Acceptance Scenarios**:

1. **Given** un usuario en cualquier pantalla, **When** alterna el tema (claro/oscuro), **Then** todos los colores, contrastes y superficies cambian de forma coherente y legible, y su preferencia persiste entre sesiones.
2. **Given** la app rediseñada, **When** se recorre cada pantalla, **Then** ningún componente conserva el estilo anterior y ninguna funcionalidad existente deja de operar.

---

### User Story 2 - Dashboard con progressive disclosure (Priority: P2)

Como miembro del estudio, quiero que el dashboard me diga primero "¿está todo bien?" (qué necesita mi atención hoy) y recién después me deje profundizar, para no enfrentarme a un muro de datos cada vez que entro.

**Why this priority**: Es la pantalla de entrada y la que más define la sensación de "herramienta operativa". Alto impacto percibido, depende de la base (P1).

**Independent Test**: Al entrar al dashboard, lo primero visible es un resumen de estado/atención (tareas urgentes, pagos por vencer, proyectos en riesgo); el detalle completo (todas las tareas, todos los proyectos) está accesible con una acción de drill-down.

**Acceptance Scenarios**:

1. **Given** un usuario con tareas urgentes y pagos por vencer, **When** abre el dashboard, **Then** ve esos puntos de atención destacados arriba antes que cualquier listado extenso.
2. **Given** el dashboard, **When** hace clic en "ver todo", **Then** llega al detalle correspondiente (mis tareas, proyectos, pagos) sin perder contexto.

---

### User Story 3 - Migración pantalla por pantalla con paridad funcional (Priority: P2)

Como usuaria, quiero que cada sección (Proyectos lista/tablero, detalle de proyecto, Mis tareas lista/calendario, Operaciones/ERP, Clientes + Portal, Reportes, Campañas, Settings, Admin) adopte la nueva identidad sin perder ninguna función que ya uso.

**Why this priority**: Es el grueso del trabajo; se entrega incrementalmente, una pantalla a la vez, cada una verificable sola.

**Independent Test**: Para cada pantalla migrada, todas las acciones previas siguen funcionando (crear/editar/borrar, filtros, tablero, etc.) y la pantalla usa solo los primitivos nuevos.

**Acceptance Scenarios**:

1. **Given** una pantalla migrada, **When** el usuario realiza cualquier acción que hacía antes, **Then** el resultado es idéntico al comportamiento previo.
2. **Given** el portal de clientes, **When** un cliente externo lo abre, **Then** se ve siempre en tema claro y legible, sin depender de la preferencia interna del estudio.

---

### User Story 4 - Densidad ajustable en tablas del ERP (Priority: P3)

Como usuario intensivo del ERP (ventas, gastos, catálogo, cotizador), quiero poder cambiar entre vista compacta y cómoda, para ver más filas cuando trabajo con volumen.

**Why this priority**: Mejora real para power-users del ERP, pero no bloquea el resto; se monta sobre la base de tokens.

**Independent Test**: En las vistas de tablas del ERP, un control alterna entre "compacto" y "cómodo"; la elección cambia la altura de fila y persiste.

**Acceptance Scenarios**:

1. **Given** la vista de ventas con muchas filas, **When** el usuario elige "compacto", **Then** se muestran más filas por pantalla manteniendo la legibilidad, y la preferencia se recuerda.

---

### User Story 5 - Microinteracciones sobrias (Priority: P3)

Como usuaria, quiero transiciones y feedback sutiles (apertura de modales/paneles, cambios de estado, reordenar en tablero) que hagan la herramienta sentirse viva sin distraer.

**Why this priority**: Pulido final; agrega percepción de calidad. Debe respetar la accesibilidad.

**Independent Test**: Las animaciones aparecen en transiciones clave; si el sistema operativo pide "menos movimiento", se desactivan automáticamente.

**Acceptance Scenarios**:

1. **Given** un usuario con "prefers-reduced-motion" activo, **When** abre un modal o cambia una tarea de columna, **Then** no hay animación de movimiento (o es mínima), sin perder funcionalidad.

---

### Edge Cases

- **Tema oscuro en datos densos**: las tablas del ERP y los badges deben mantener contraste suficiente en oscuro (no perder el accent ni los estados semánticos).
- **Color por proyecto**: el accent dinámico por proyecto debe convivir con el accent de marca sin romper contraste en claro ni oscuro.
- **Portal externo**: nunca debe heredar el tema oscuro del usuario interno.
- **Pantallas vacías / estados de carga / error**: deben quedar definidas con la nueva identidad (no quedar con el estilo viejo).
- **Densidad + responsive**: el modo compacto no debe romper el layout en pantallas angostas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La app DEBE definir una única fuente de verdad de identidad visual (paleta, tipografía, escala de espaciado) consumida por toda la UI.
- **FR-002**: La app DEBE soportar tema claro y oscuro, con la preferencia del usuario persistida entre sesiones.
- **FR-003**: Todos los componentes base (botón, input, select, modal, superficie/tarjeta, badge/pill, encabezado de página, sidebar, topbar, tabla, stat strip) DEBEN reskinearse a la nueva identidad sin cambiar su comportamiento ni su API observable por el usuario.
- **FR-004**: Cada pantalla DEBE migrarse reusando los primitivos nuevos, conservando el 100% de las funcionalidades actuales.
- **FR-005**: El dashboard DEBE liderar con un resumen de atención (urgencias/pendientes/riesgos) y ofrecer drill-down al detalle.
- **FR-006**: Las vistas de tablas del ERP DEBEN ofrecer un control de densidad (compacto/cómodo) con la elección persistida.
- **FR-007**: Las microinteracciones DEBEN respetar la preferencia de "menos movimiento" del sistema.
- **FR-008**: El accent de marca DEBE ser el verde pistacho (no un azul SaaS genérico) y convivir con los colores semánticos (éxito/aviso/urgente/info) y con el color dinámico por proyecto.
- **FR-009**: La UI DEBE mantener accesibilidad: contraste suficiente (objetivo WCAG AA), foco visible en todos los controles interactivos, y nombres accesibles (aria-label) en botones de solo ícono.
- **FR-010**: El portal de clientes DEBE renderizarse siempre en tema claro, independientemente de la preferencia interna.
- **FR-011**: El rediseño NO DEBE alterar lógica de negocio, datos, endpoints ni esquema (solo capa de presentación).
- **FR-012**: La app mobile (Expo) queda FUERA del alcance de este rediseño.

### Key Entities *(include if feature involves data)*

- **Token de diseño**: unidad nombrada de identidad (color, tipografía, espaciado, radio) que la UI consume; tiene valor en claro y en oscuro.
- **Preferencia de tema**: elección del usuario (claro/oscuro/sistema), persistida.
- **Preferencia de densidad**: elección del usuario para tablas ERP (compacto/cómodo), persistida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Paridad funcional total: el 100% de las acciones disponibles antes del rediseño siguen disponibles y producen el mismo resultado.
- **SC-002**: Toda la app (todas las pantallas en alcance) usa exclusivamente los primitivos/tokens nuevos; cero pantallas con el estilo anterior.
- **SC-003**: El cambio de tema claro/oscuro afecta el 100% de las pantallas en alcance de forma coherente y persiste entre sesiones.
- **SC-004**: En el dashboard, un usuario identifica "qué necesita atención hoy" sin hacer scroll por debajo del primer bloque.
- **SC-005**: Contraste WCAG AA en texto y controles en ambos temas; foco visible en el 100% de los controles interactivos.
- **SC-006**: En las tablas del ERP, el modo compacto muestra al menos ~40% más filas que el modo cómodo en la misma altura de pantalla.
- **SC-007**: El portal de clientes se ve en claro el 100% de las veces, sin importar la preferencia interna.
- **SC-008**: Build de producción verde y sin regresiones funcionales detectables tras cada pantalla migrada.

## Assumptions

- El alcance es la app web (`src/`); la app mobile Expo queda fuera.
- Solo cambia la capa visual/presentación: no se modifican lógica, datos, endpoints ni esquema de DB.
- Se reutiliza la arquitectura actual (sidebar + topbar + command palette ⌘K) y los flujos existentes; el rediseño reskinea, no rehace features.
- La identidad mantiene el verde pistacho como accent de marca y el sistema de color dinámico por proyecto ya existente.
- La librería de animación ya está disponible en el proyecto y respeta "prefers-reduced-motion".
- La migración es incremental (pantalla por pantalla), cada paso verificable y desplegable de forma independiente, priorizando no romper funcionalidad.
