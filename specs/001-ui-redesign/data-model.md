# Phase 1 — Data Model: Rediseño UI

> No hay cambios en la base de datos. Las "entidades" son de UI/preferencias.

## Design Token
Unidad nombrada de identidad visual consumida por toda la UI.
- **name**: identificador semántico (ej. `ink`, `bg`, `surface-el`, `rule`, `primary`/pistacho, `success`, `warning`, `danger`, `info`).
- **lightValue**: valor en tema claro.
- **darkValue**: valor en tema oscuro.
- **category**: color | typography | spacing | radius | density.
- **Fuente**: CSS vars en `globals.css` (`:root` claro, `:root[data-theme="dark"]` oscuro); mapeadas a nombres Tailwind en `tailwind.config.ts`.

## ThemePreference
- **value**: `light` | `dark` | `system`.
- **default**: `system`.
- **storage**: cookie `theme` (SSR, anti-FOUC) + espejo en `localStorage`.
- **applied**: atributo `data-theme` en `<html>`.

## DensityPreference
- **value**: `compact` | `comfortable`.
- **default**: `comfortable`.
- **scope**: vistas de tablas del ERP (ventas, gastos, catálogo, cotizador).
- **storage**: `localStorage` (`erp-density`).
- **applied**: atributo `data-density` en el contenedor de la tabla.

## ProjectColor (existente, sin cambios de datos)
- `--project-color` ya provisto por el layout del proyecto; el rediseño define cómo se usa con contraste en claro/oscuro (acentos/barras/dots, no fondo de texto sin verificar).
