<!--
SYNC IMPACT REPORT
==================
Versión: (sin ratificar — template) → 1.0.0
Tipo de cambio: primera ratificación. Se pasa de un template con 14 placeholders
a cuatro principios vinculantes.

Principios definidos (4, según pedido explícito; el template traía 5 slots):
  [PRINCIPLE_1_NAME] → I. Paridad funcional (NO NEGOCIABLE)
  [PRINCIPLE_2_NAME] → II. Dependencias mínimas
  [PRINCIPLE_3_NAME] → III. Accesibilidad AA
  [PRINCIPLE_4_NAME] → IV. Entrega incremental y reversible
  [PRINCIPLE_5_NAME] → slot eliminado, no se usó

Secciones renombradas:
  [SECTION_2_NAME] → Restricciones técnicas
  [SECTION_3_NAME] → Flujo de trabajo y gates de calidad

Origen: los cuatro principios ya estaban redactados como "de-facto" en
specs/001-ui-redesign/plan.md §Constitution Check y se aplicaban como gates sin
respaldo formal. Esta ratificación los vuelve vinculantes.

Plantillas revisadas:
  ✅ .specify/templates/plan-template.md — §Constitution Check delega en este
     archivo con un marcador genérico; no requiere cambios.
  ✅ .specify/templates/spec-template.md — sin secciones dependientes de principios.
  ✅ .specify/templates/tasks-template.md — sin categorías dependientes de principios.

Sin seguimiento pendiente.

---
1.0.0 → 1.0.1 (PATCH — aclaración, sin cambio de intención)
Fecha: 2026-08-01

Cambio: §Restricciones técnicas, regla de literales de color. La redacción
original ("los componentes NO DEBEN contener valores de color literales") era
demasiado amplia y condenaba código correcto por diseño.

Lo detectó /speckit-analyze: reportó 73 literales como violación. Al revisarlos en
contexto, 59 eran correctos — el portal de clientes (43) usa literales
precisamente para NO heredar el tema interno, como exige FR-010; y 16 más viven
fuera del árbol de React/Tailwind (fondo de PDF, HTML de route handler, SVG).
Violaciones reales: 14.

La regla ahora nombra esas dos excepciones y aclara que una paleta de datos no es
excepción: se importa de src/lib/constants/, no se reescribe.

Sin impacto en plantillas.

---
1.0.1 → 1.1.0 (MINOR — expande materialmente una guía existente)
Fecha: 2026-08-01

Cambio: §Flujo de trabajo y gates de calidad gana una subsección "Ramas".

El README declaraba desde siempre que se trabaja en `preview` y se mergea a
`main` tras validar. La práctica había derivado: `preview` llevaba dos meses sin
tocarse y 60 commits de atraso, incluidos los de seguridad y todo el rediseño de
hoy, que fueron directo a producción.

/speckit-analyze lo marcó como inconsistencia (I7) y v1.0.0 dejó la política sin
codificar a propósito, hasta saber cuál era la práctica real. El equipo confirmó
que la regla del README es la correcta y que fue el uso el que derivó.

Se puso `preview` al día con `main` por fast-forward (4d439a9 → ff48941, cero
commits en riesgo) y a partir de acá el trabajo va ahí.
-->

# Constitución de Pistachio

Pistachio es la herramienta interna de gestión de proyectos + ERP por negocio de
Rewind Media House. La usa un equipo chico, muchas horas por día, y es el único
lugar donde vive la información operativa del estudio. Eso define el tono de esta
constitución: **romper algo que funcionaba cuesta más que no haber entregado la
mejora**.

## Core Principles

### I. Paridad funcional (NO NEGOCIABLE)

Un cambio declarado como visual, de refactor o de deduplicación **NO DEBE**
alterar el comportamiento observable por el usuario: mismas acciones disponibles,
mismos resultados, mismos datos.

- Antes de dar por terminado cualquier trabajo de este tipo, `npm run verify`
  (type-check + lint + tests) **DEBE** estar en verde.
- Si un cambio visual obliga a tocar lógica, deja de ser visual: **DEBE**
  declararse como cambio funcional y justificarse por separado.
- Un cambio de comportamiento no solicitado **DEBE** reportarse explícitamente al
  usuario, aunque se considere una mejora. Silenciarlo no es una opción.

**Razón**: la app es la fuente de verdad operativa del estudio. Un rediseño que
rompe el cotizador no es un rediseño, es una caída. La paridad es lo que permite
refactorizar agresivamente sin negociar cada cambio.

### II. Dependencias mínimas

Toda dependencia de runtime nueva **DEBE** justificarse frente a lo que el repo
ya tiene.

- Antes de agregar una librería **DEBE** verificarse que el problema no esté ya
  resuelto adentro. Ejemplo real: `SwatchPicker` existía y dos formularios lo
  habían reescrito peor.
- Si existe un primitivo en `src/components/ui/`, **DEBE** usarse. Escribir a mano
  las clases de un componente que ya existe crea una variante sin nombre que
  alguien va a tener que reconciliar después.
- Un helper de treinta líneas en `src/lib/utils/` **DEBERÍA** preferirse a una
  dependencia nueva cuando cubre el caso de uso real.

**Razón**: cada dependencia es superficie de mantenimiento, de seguridad y de
build. Un equipo chico no puede auditar un árbol grande.

### III. Accesibilidad AA

La interfaz **DEBE** cumplir WCAG 2.1 nivel AA. Cuatro reglas concretas, no una
aspiración:

- **Contraste AA** en texto y controles, en tema claro y en tema oscuro. Los dos
  temas se cuidan por igual; ninguno es el "modo secundario".
- **Foco visible** en el 100 % de los controles interactivos.
- **Nombre accesible** en todo control de solo icono. Donde se pueda, esto
  **DEBE** hacerse estructuralmente imposible de omitir: el primitivo
  `IconButton` exige `label` por tipo, y el compilador lo reclama.
- **El estado nunca depende solo del color**: color **+ icono + etiqueta**.
- Las animaciones **DEBEN** respetar `prefers-reduced-motion`.

**Razón**: es una herramienta de trabajo diario. La accesibilidad acá no es
cumplimiento normativo, es que la gente no termine la jornada agotada.

### IV. Entrega incremental y reversible

El trabajo **DEBE** partirse en pasos que se puedan desplegar y verificar solos.

- Cada paso **DEBE** dejar la app en estado desplegable. No se abren dos
  migraciones grandes a la vez.
- Un paso que no se puede verificar solo **DEBE** partirse más, o declararse
  explícitamente como bloqueante del siguiente.
- Lo irreversible (borrar datos, cambiar permisos, migrar esquema) **DEBE**
  ejecutarse por separado del trabajo cosmético, y **DEBE** confirmarse con el
  usuario antes de correr.

**Razón**: revertir un paso chico cuesta minutos; revertir un rediseño entero
cuesta un día y el ánimo del equipo.

## Restricciones técnicas

- **El compilador es la red de seguridad.** `typescript.ignoreBuildErrors`
  **DEBE** permanecer en `false` en `next.config.mjs`. Cualquier error de tipos
  rompe el build de Vercel; no se introducen nuevos ni se silencian con `any`.
- **`eslint.ignoreDuringBuilds` está en `true`** por incompatibilidad conocida
  entre ESLint 9 y Next 14. Es una excepción documentada, **no** una exención de
  correr `npm run lint` localmente.
- **camelCase es la fuente de verdad** en las firmas de las Server Actions
  (`src/lib/actions/*`). El bug sistémico histórico fue mandar claves snake_case.
- **Los tokens son la única fuente de identidad visual.** Los componentes de la
  app interna **NO DEBEN** contener valores de color literales (`#hex`,
  `oklch(...)`); todo color sale de `globals.css` vía `tailwind.config.ts`.
  Dos excepciones, porque en ellas heredar el tema sería el error, no el acierto:
  - **Superficies que no deben heredar el tema interno**: el portal de clientes
    (`src/app/(portal)/**`) se ve siempre en claro por FR-010; consumir tokens
    haría justo lo contrario.
  - **Salidas fuera del árbol de React/Tailwind**: fondo de PDF vía
    `html2canvas`, HTML devuelto por route handlers, assets SVG. Ahí no hay hoja
    de estilos que resuelva la variable.

  Una **paleta de datos** (series de gráficos, swatches) **no** es excepción:
  **DEBE** importarse de `src/lib/constants/`, no reescribirse en el componente.
- **El trabajo de presentación no toca esquema, endpoints ni lógica de negocio.**

## Flujo de trabajo y gates de calidad

- **Gate obligatorio**: `npm run verify` — `tsc --noEmit`, `next lint` y `vitest
  run`. Los tres **DEBEN** pasar antes de considerar terminado un cambio.
- **CI** (`.github/workflows/ci.yml`) corre los tres con `if: always()`, para que
  un fallo temprano no oculte los otros dos.
- **Tests de conformidad**: cuando una regla no la puede sostener el compilador,
  **DEBE** escribirse un test que la sostenga. Ya existen dos:
  `src/tests/action-guards.test.ts` (toda server action exportada pasa por un
  guard conocido) y `src/tests/button-conformance.test.ts` (nadie reescribe a
  mano una receta de botón que ya vive en un primitivo).
- **Toda excepción a un test de conformidad DEBE traer una razón escrita** al
  lado del código o en un mapa de exenciones. El objetivo no es permitir
  excepciones: es obligar a que cada una tenga un motivo legible y discutible.
- **Autorización**: toda Server Action exportada **DEBE** verificar permisos por
  sí misma. Que una función sea inalcanzable desde la UI no la protege — es un
  endpoint HTTP.

### Ramas

El trabajo **DEBE** ir a `preview`. Vercel la auto-despliega a su propia URL, y
esa URL es donde se valida.

- El merge a `main` **DEBE** hacerse sólo después de validar en preview, porque
  `main` es producción: lo que entra ahí lo usa el equipo ese mismo día.
- Nadie commitea a `main` directo. La excepción es un hotfix de producción, que
  **DEBE** volver a `preview` inmediatamente para que las dos ramas no se
  separen.
- Si `preview` queda atrás de `main`, se pone al día antes de empezar. Estar 60
  commits atrás es lo que hizo que la regla dejara de cumplirse sin que nadie lo
  decidiera.

**Razón**: el principio IV pide que cada paso quede desplegable y verificable.
Sin un escalón entre el editor y producción, ese principio se apoya sólo en que
el gate local esté verde — que es una red más fina que un deploy real mirado por
una persona.

## Governance

Esta constitución **prevalece** sobre cualquier otra práctica del repositorio.
Cuando un plan, una spec o una tarea la contradiga, se ajusta el plan, no el
principio.

**Enmiendas**: se hacen en un cambio dedicado que toca este archivo, con la
versión actualizada y el Sync Impact Report al día. No se enmienda de paso
mientras se hace otra cosa.

**Versionado semántico** de este documento:

- **MAJOR**: se elimina o redefine un principio de forma incompatible.
- **MINOR**: se agrega un principio o una sección, o se expande materialmente una
  guía existente.
- **PATCH**: aclaraciones, redacción, erratas; nada que cambie el significado.

**Cumplimiento**: la sección `## Constitution Check` de cada `plan.md` **DEBE**
citar la versión vigente de esta constitución y evaluarse contra sus principios.
Toda violación aceptada **DEBE** quedar registrada en `## Complexity Tracking`
con el motivo y la alternativa más simple que se descartó.

**Version**: 1.1.0 | **Ratified**: 2026-08-01 | **Last Amended**: 2026-08-01
