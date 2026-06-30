# Phase 0 — Research & Decisions: Rediseño UI

## D1 — Mecanismo de theming (claro/oscuro)
- **Decisión**: CSS variables en `globals.css` como fuente de verdad, con override por `:root[data-theme="dark"]`. Tailwind ya expone nombres semánticos (`text`, `border`, `background`, `surface`, `primary`, `success`, `warning`, `danger`, etc.) mapeados a esas vars, así que el reskin = ajustar valores + agregar el bloque dark.
- **Rationale**: Flipear variables es un cambio en un solo lugar; los ~cientos de usos de clases semánticas (`text-text`, `border-border`, `bg-surface-el`) heredan dark automáticamente. Evita reescribir componentes con `dark:`.
- **Alternativas**: variante `dark:` de Tailwind (rechazada: ensucia el markup y duplica intención); librería de temas (innecesaria).

## D2 — Persistencia de tema sin FOUC
- **Decisión**: cookie (`theme`) leída en SSR para setear `data-theme` en `<html>` antes del paint; espejo en `localStorage` para el toggle client-side; valor `system` resuelve con `prefers-color-scheme`.
- **Rationale**: cookie-first evita el flash de tema incorrecto en App Router; `localStorage` da respuesta instantánea al togglear. Cero DB.
- **Alternativas**: solo localStorage (rechazada: FOUC en SSR).

## D3 — Paleta dark "Operacional con calidez"
- **Decisión**: dark de neutro cálido (no negro puro), accent **pistacho** recalibrado para contraste AA sobre superficies oscuras; colores semánticos re-tuneados para dark. Un solo accent de acción + semánticos; superficies por capas (bg < surface < surface-el).
- **Rationale**: el mercado (Supabase/Linear) valida dark denso con UN accent y disciplina de contraste; mantiene identidad pistacho.

## D4 — Densidad de tablas ERP
- **Decisión**: atributo `data-density="compact|comfortable"` en el contenedor de cada vista de tabla ERP + tokens de alto de fila/padding que reaccionan a ese atributo; preferencia en `localStorage`. Aplica SOLO a las tablas ERP (ventas/gastos/catálogo/cotizador), no global.
- **Rationale**: power-users quieren más filas sin imponer densidad al resto. Scope acotado = bajo riesgo.

## D5 — Color dinámico por proyecto
- **Decisión**: conservar `--project-color`; usarlo para barras/acentos/dots, nunca como fondo de texto sin verificar contraste. En dark, atenuar con `color-mix` cuando se use como superficie.
- **Rationale**: feature existente; debe convivir con el accent de marca en ambos temas.

## D6 — Microinteracciones (motion)
- **Decisión**: `motion/react` con `MotionConfig reducedMotion="user"` (ya cableado). Patrones: `AnimatePresence` para modales/panel de tarea, layout animation para el tablero (reordenar/mover columna), micro-feedback en cambios de estado. Curvas ease-out cortas (~150–250ms).
- **Rationale**: percepción de calidad sin distraer; accesible por defecto.
- **Alternativas**: el fork grx7 (rechazado antes: riesgo de supply-chain).

## D7 — Tokens: fuente y tipografía
- **Decisión**: autoría directa de la paleta operacional (claro/oscuro) informada por el research; el `DESIGN.md` que generó Stitch ("Pistachio Editorial") se usa solo como referencia estructural, no como paleta final (la dirección elegida NO es editorial). Reusar las tipografías actuales (Satoshi + JetBrains Mono) para no inflar el bundle.
- **Rationale**: evita churn de fuentes; la dirección operacional funciona con una grotesque limpia + mono para datos.

## Unknowns resueltos
- No quedan `NEEDS CLARIFICATION`. Defaults documentados en spec/Assumptions + estas decisiones.
