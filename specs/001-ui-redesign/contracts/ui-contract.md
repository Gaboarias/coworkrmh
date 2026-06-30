# UI Contract — Rediseño

## Contrato de tokens (nombres estables)
La UI consume **nombres semánticos**, no valores crudos. El reskin cambia los *valores* (claro/oscuro), nunca elimina nombres en uso.

- Superficies: `bg`, `bg-2`/`surface`, `surface-el`
- Texto: `text` (=ink), `text-muted`, `text-tertiary` / `ink`, `ink-soft`, `ink-faint`
- Líneas: `rule`, `rule-strong` / `border`, `border-strong`
- Marca/acción: `primary`/`accent` = **pistacho**, `accent-soft`
- Semánticos: `success`/`done`, `warning`/`warn`, `danger`/`urgent`, `info`
- Dinámico: `--project-color`

Regla: si se renombra un token, se hace un reemplazo global; no se deja la UI apuntando a nombres inexistentes (lección del audit: `.status-*`/`.priority-*` deben existir).

## Contrato de primitivos (API estable)
Los componentes en `src/components/ui` y `src/components/layout` **mantienen su interfaz pública** (props y comportamiento). El reskin cambia estilos internos, no la firma:

- `Button` (variant/size/loading/aria-*), `Input`/`Textarea`, `Select`, `Modal` (open/onClose/confirmDismiss…), `Card`/`Surface`, `Badge`/`Pill`, `PageHeader`, `HairlineRule`, `Sidebar`, `Topbar`, `TaskBoard`/`ProjectBoard`, tablas ERP.

Cualquier consumidor existente debe seguir funcionando sin cambios de llamada.

## Contrato de accesibilidad
- Contraste objetivo **WCAG AA** en claro y oscuro.
- **Foco visible** en todos los controles interactivos.
- **aria-label** en botones de solo ícono.
- `prefers-reduced-motion` respetado (vía `MotionConfig reducedMotion="user"`).

## Contrato de paridad
- Toda acción disponible antes del rediseño sigue disponible y con el mismo resultado.
- `tsc --noEmit` + `next build` verdes tras cada pantalla migrada.
