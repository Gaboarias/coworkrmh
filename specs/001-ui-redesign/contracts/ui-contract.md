# UI Contract — Rediseño

## Contrato de tokens (nombres estables)
La UI consume **nombres semánticos**, no valores crudos. El reskin cambia los *valores* (claro/oscuro), nunca elimina nombres en uso.

### Vocabulario canónico (decidido 2026-08-01 — T006)

**Edition 04 es el canónico.** Los primitivos de `src/components/ui/` —lo que todo
lo demás consume— ya lo hablan por 55 usos contra 11.

Diez nombres del bloque "Compat con código existente" de `tailwind.config.ts` son
**alias puros**: apuntan por `var()` al mismo token Edition 04. Se migran y el
bloque se borra (T036, opcional).

| Legacy (a retirar) | Canónico |
| --- | --- |
| `text`, `foreground` | `ink` |
| `text-muted` | `ink-soft` |
| `text-tertiary` | `ink-faint` |
| `border` | `rule` |
| `border-strong` | `rule-strong` |
| `background` | `bg` |
| `danger` | `urgent` |
| `success` | `done` |
| `warning` | `warn` |

Por qué Edition 04 y no al revés, más allá del conteo: los nombres mapean 1:1 con
las CSS vars (`--ink`, `--rule`), mientras que `border` como nombre de color choca
con la utilidad `border` de Tailwind — `border-border` no se puede leer.

**No son alias y se quedan**: `surface`, `surface-2`, `surface-el` e `info` no
tienen equivalente Edition 04; son sus propios tokens con valor literal. La capa
semántica de componente (`primary`, `secondary`, `card`, `popover`, `muted`,
`destructive`, `input`, `ring`, `sidebar.*`) también se queda: nombra rol, no color.

- Superficies: `bg`, `bg-2`, `surface`, `surface-2`, `surface-el`
- Texto: `ink`, `ink-soft`, `ink-faint`
- Líneas: `rule`, `rule-strong`
- Marca/acción: `accent`, `accent-soft` — **pistacho**
- Semánticos: `done`, `warn`, `urgent`, `info`
- Dinámico: `--project-color`

Regla: si se renombra un token, se hace un reemplazo global; no se deja la UI apuntando a nombres inexistentes (lección del audit: `.status-*`/`.priority-*` deben existir).

### ⚠ `--primary` duplica el valor de `--accent`, no lo referencia

Hallazgo del 2026-08-01, fuera del alcance de esta feature pero registrado acá
porque toca el contrato de tokens.

`--accent` y `--primary` valen lo mismo (`#3f7a34` en claro, `#8fce6e` en oscuro)
pero **cada uno lo escribe literal**: `--primary` no es `var(--accent)`. Cambiar el
verde de marca en `--accent` dejaría todos los botones sólidos —que usan
`bg-primary`— en el color viejo, sin que nada falle.

No es urgente porque hoy coinciden. Es un riesgo de deriva silenciosa, y el
arreglo es una línea: `--primary: var(--accent);` en los dos temas.

## Contrato de primitivos (API estable)
Los componentes en `src/components/ui` y `src/components/layout` **mantienen su interfaz pública** (props y comportamiento). El reskin cambia estilos internos, no la firma:

- `Button` (variant/size/loading/aria-*), `Input`/`Textarea`, `Select`, `Modal` (open/onClose/confirmDismiss…), `Card`/`Surface`, `Badge`/`Pill`, `PageHeader`, `HairlineRule`, `Sidebar`, `Topbar`, `TaskBoard`/`ProjectBoard`, tablas ERP.

Cualquier consumidor existente debe seguir funcionando sin cambios de llamada.

### Primitivos aún no implementados

FR-003 los exige pero no existían al 2026-08-01. Definición para que quien los escriba no invente la suya:

- **`Table`** — estructura de tabla del ERP: `Table` / `TableHead` / `TableBody` / `TableRow` / `TableCell`. Consume `--erp-row-py` para heredar la densidad; el caller **no** cablea altura de fila. Sustituye las tablas escritas a mano.
- **`StatStrip`** — fila horizontal de cifras (KPIs). Cada ítem es etiqueta + valor; el valor usa `.kpi-value` y numerales tabulares. **No** es la "hero metric" de dashboard SaaS: sin gradiente, sin jerarquía de una cifra gigante sobre stats de apoyo. Todas las cifras de la fila pesan igual.

## Contrato de accesibilidad
- Contraste objetivo **WCAG AA** en claro y oscuro.
- **Foco visible** en todos los controles interactivos.
- **aria-label** en botones de solo ícono.
- `prefers-reduced-motion` respetado (vía `MotionConfig reducedMotion="user"`).

## Contrato de paridad
- Toda acción disponible antes del rediseño sigue disponible y con el mismo resultado.
- `tsc --noEmit` + `next build` verdes tras cada pantalla migrada.
