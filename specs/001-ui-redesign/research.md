# Phase 0 — Research & Decisions: Rediseño UI

## D1 — Mecanismo de theming (claro/oscuro)
- **Decisión**: CSS variables en `globals.css` como fuente de verdad, con override por `:root[data-theme="dark"]`. Tailwind ya expone nombres semánticos (`text`, `border`, `background`, `surface`, `primary`, `success`, `warning`, `danger`, etc.) mapeados a esas vars, así que el reskin = ajustar valores + agregar el bloque dark.
- **Rationale**: Flipear variables es un cambio en un solo lugar; los ~cientos de usos de clases semánticas (`text-text`, `border-border`, `bg-surface-el`) heredan dark automáticamente. Evita reescribir componentes con `dark:`.
- **Alternativas**: variante `dark:` de Tailwind (rechazada: ensucia el markup y duplica intención); librería de temas (innecesaria).
- **Implementado como** (verificado 2026-08-01): la decisión se cumplió en lo esencial — CSS vars en `globals.css` como fuente de verdad, sin `dark:` en el markup — pero **el selector es `.dark`, no `:root[data-theme="dark"]`** (`darkMode: "class"` en `tailwind.config.ts`, bloque `.dark {}` en `globals.css:94`). Cambio de mecanismo equivalente, adoptado por compatibilidad con `next-themes` (ver D2). Sin impacto en el rationale.

## D2 — Persistencia de tema sin FOUC
- **Decisión**: cookie (`theme`) leída en SSR para setear `data-theme` en `<html>` antes del paint; espejo en `localStorage` para el toggle client-side; valor `system` resuelve con `prefers-color-scheme`.
- **Rationale**: cookie-first evita el flash de tema incorrecto en App Router; `localStorage` da respuesta instantánea al togglear. Cero DB.
- **Alternativas**: solo localStorage (rechazada: FOUC en SSR).
- **Implementado como** (verificado 2026-08-01): **la decisión no se siguió.** Se usa `next-themes` con `storageKey="pistachio-theme"` en `localStorage` — la alternativa que D2 había rechazado. El FOUC se resuelve igual, pero con otro mecanismo: un script inline bloqueante en `layout.tsx:53` que aplica la clase `.dark` antes del paint. No hay cookie ni lectura en SSR. El valor `system` tampoco existe: `enableSystem={false}` (ver D2b).

## D2b — Sin opción "sistema" (decisión posterior, registrada 2026-08-01)

- **Decisión**: el tema tiene dos valores, `light` y `dark`. No hay `system`.
- **Rationale**: Edition 04 optó por dos modos explícitos, cuidados por igual, en vez de un tercer estado que hereda un diseño que nadie revisó. Está escrito en `ThemeToggle.tsx` y cableado como `enableSystem={false}`.
- **Deja sin efecto**: la parte de D2 que decía "valor `system` resuelve con `prefers-color-scheme`", y el `default: system` que figuraba en `data-model.md`.

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
- **Implementado como** (verificado 2026-08-01): **el rationale "accesible por defecto" era falso, y esta línea fue la causa del punto ciego.** `MotionConfig reducedMotion="user"` sí está cableado, pero gobierna únicamente componentes `motion.*`, y en todo el repo hay **uno**: `src/components/ui/Modal.tsx`. Las otras 50 animaciones de movimiento se implementaron con clases de Tailwind (`animate-fade-in` ×40, `animate-slide-up` ×5, `transition-transform` ×4, `hover:scale-110` ×1) y **`MotionConfig` no las alcanza**. `globals.css` no tenía bloque `@media (prefers-reduced-motion: reduce)`.
- **Lección**: una decisión que delega accesibilidad en una librería solo vale si la librería queda en el camino de todo lo que cubre. Acá la implementación eligió otra herramienta para el 98 % de los casos y la decisión nunca se revisó. Se corrige en `tasks.md` Phase 2 (T002–T005), que agrega el bloque CSS y un test que impide que vuelva a perderse.

## D7 — Tokens: fuente y tipografía
- **Decisión**: autoría directa de la paleta operacional (claro/oscuro) informada por el research; el `DESIGN.md` que generó Stitch ("Pistachio Editorial") se usa solo como referencia estructural, no como paleta final (la dirección elegida NO es editorial). Reusar las tipografías actuales (Satoshi + JetBrains Mono) para no inflar el bundle.
- **Rationale**: evita churn de fuentes; la dirección operacional funciona con una grotesque limpia + mono para datos.

## Unknowns resueltos
- No quedan `NEEDS CLARIFICATION`. Defaults documentados en spec/Assumptions + estas decisiones.
