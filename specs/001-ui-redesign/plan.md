# Implementation Plan: Rediseño UI Web — "Operacional con calidez"

**Branch**: `main` (migración incremental; sin branch dedicado por hook) | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-ui-redesign/spec.md`

## Summary

Rediseñar la capa visual de la web app (no la lógica) hacia "Operacional con calidez": una sola fuente de verdad de tokens (color/tipografía/spacing) con tema claro y oscuro, reskin de los primitivos existentes, dashboard con progressive disclosure, toggle de densidad en tablas ERP y microinteracciones con `motion` respetando reduced-motion. Enfoque **token-first** + **reskin de primitivos** + **migración pantalla por pantalla**, manteniendo paridad funcional total y accesibilidad AA. El backend, los datos y la app mobile quedan intactos.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Next.js 14 (App Router)

**Primary Dependencies**: Tailwind CSS 3.x, `motion` ^12 (animaciones, ya instalado), lucide-react (íconos), next/font (Satoshi/JetBrains Mono actuales)

**Storage**: Preferencias de UI (tema, densidad) → cookie + `localStorage` (sin tocar DB). Datos de negocio → Neon/Drizzle (fuera de alcance)

**Testing**: `tsc --noEmit` + `next build` como gate por fase; verificación visual/manual por pantalla; (sin suite e2e en el repo hoy)

**Target Platform**: Navegador desktop primero (la app es desktop-first; responsive ya existente se preserva)

**Project Type**: Web app (Next.js App Router, single project en `src/`)

**Performance Goals**: Sin regresión de bundle perceptible; animaciones a 60fps y desactivables por reduced-motion; First Load JS por ruta sin crecer significativamente

**Constraints**: Paridad funcional 100% (solo capa visual); contraste WCAG AA en claro y oscuro; foco visible; cero dependencias nuevas más allá de `motion`; portal de clientes siempre en claro

**Scale/Scope**: ~12 áreas de pantalla + ~11 primitivos; 1 set de tokens (claro/oscuro)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

La constitución del proyecto (`.specify/memory/constitution.md`) está **sin ratificar** (template con placeholders). Se aplican los principios de-facto vigentes del proyecto como gates:

- **No romper funcionalidad** (cambio solo visual) — PASS (enforced por paridad + build verde por fase).
- **Mínimas dependencias** (sin libs nuevas salvo `motion` ya aprobada) — PASS.
- **Accesibilidad AA** (contraste, foco, aria-labels) — PASS (requisito explícito).
- **Reversibilidad / incremental** (pantalla por pantalla, cada paso desplegable) — PASS.

Recomendación (no bloqueante): correr `/speckit-constitution` para ratificar principios formalmente antes de features futuras.

## Project Structure

### Documentation (this feature)

```text
specs/001-ui-redesign/
├── plan.md              # Este archivo
├── research.md          # Fase 0 — decisiones técnicas
├── data-model.md        # Fase 1 — tokens + preferencias
├── quickstart.md        # Fase 1 — guía de validación
├── contracts/
│   └── ui-contract.md   # Contrato de tokens + API estable de primitivos
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css               # ← tokens (CSS vars) light/dark — fuente de verdad
│   ├── (app)/…                   # pantallas internas (dashboard, projects, my-tasks,
│   │                             #   operations/*, clients, reports, marketing, settings, admin)
│   └── (portal)/[token]/…        # portal cliente (siempre light)
├── components/
│   ├── ui/                       # primitivos: Button, Input, Select, Modal, Card, Badge…
│   ├── layout/                   # Sidebar, Topbar, AppShell, ThemeToggle, Breadcrumbs
│   ├── providers/                # MotionProvider (ya), ThemeProvider/DensityProvider (nuevos)
│   ├── tasks/ projects/ operations/ clients/ reports/ notes/ settings/ …
│   └── shared/                   # PageHeader, HairlineRule, EmptyState…
└── tailwind.config.ts            # ← mapea tokens semánticos a las CSS vars
```

**Structure Decision**: Single project Next.js App Router existente. Los tokens viven en `src/app/globals.css` (CSS vars con override por `[data-theme="dark"]`) y se exponen como nombres semánticos en `tailwind.config.ts` (que ya define `text/border/background/primary/...`). El reskin se hace ajustando esos valores + los primitivos en `src/components/ui` y `src/components/layout`, sin tocar `src/lib` (lógica/datos).

## Implementation Phases (overview)

Mapea a las user stories del spec (P1→P3). Cada fase: `tsc` + `build` verde + commit.

- **Fase 1 (P1) — Foundation**: definir paleta "Operacional con calidez" (claro/oscuro) en `globals.css` + `tailwind.config`; `ThemeProvider` (persistencia tema) + `ThemeToggle` real (hoy ya existe toggle, conectarlo a data-theme + persistencia); reskin de primitivos `ui/*` y shell `layout/*`. Resultado: app coherente con tema funcional.
- **Fase 2 (P2) — Dashboard + migración por pantalla**: dashboard con bloque de atención (progressive disclosure) + drill-down; luego migrar Proyectos (lista/tablero), detalle de proyecto, Mis tareas (lista/calendario), Operaciones/ERP, Clientes + Portal (portal forzado light), Reportes, Campañas, Settings, Admin — reusando primitivos.
- **Fase 3 (P3) — Densidad + motion**: `DensityProvider` + control compacto/cómodo en tablas ERP (persistido); microinteracciones con `motion` (modales, panel de tarea, drag en tablero, cambios de estado) con `reducedMotion`.

## Complexity Tracking

> Sin violaciones de constitución que justificar. (N/A)
