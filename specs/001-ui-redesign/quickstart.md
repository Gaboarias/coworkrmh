# Quickstart — Validación del Rediseño UI

Guía para validar que cada fase del rediseño cumple paridad + identidad + accesibilidad. No incluye implementación; ver `tasks.md`.

## Prerrequisitos
- `npm install` al día (incluye `motion`).
- Build base verde antes de empezar.

## Gate por fase (correr siempre)

Un solo comando. Es el gate que fija la constitución v1.0.1 §Flujo de trabajo y
gates de calidad; no hay una segunda versión del gate en ningún otro documento.

```bash
npm run verify          # tsc --noEmit + next lint + vitest run
```

## Validación funcional (paridad)
Por cada pantalla migrada, repetir las acciones clave y confirmar mismo resultado que antes:
- Dashboard: ver atención (urgencias/pagos), drill-down a "ver todo".
- Proyectos: lista ↔ tablero, drag de tarjetas, crear/editar.
- Detalle proyecto: tareas (crear/editar/asignar múltiples/título inline), contenido, reportes.
- Mis tareas: lista ↔ calendario.
- Operaciones/ERP: crear/borrar ventas/gastos/productos/cotizaciones; **totales correctos**.
- Clientes + Portal: generar/compartir portal; abrir portal externo.
- Reportes, Campañas, Settings, Admin: acciones existentes.

## Validación de tema (claro/oscuro)
- Togglear tema en varias pantallas → todo cambia coherente y legible.
- Recargar → la preferencia persiste (sin flash de tema incorrecto).
- Abrir el **portal de cliente** → siempre claro, sin importar la preferencia interna.

## Validación de densidad (ERP)
- En ventas/gastos/catálogo/cotizador, alternar compacto/cómodo → cambia alto de fila y persiste; compacto muestra ~40%+ filas.

## Validación de accesibilidad
- Contraste AA (texto y controles) en claro y oscuro.
- Tab por la pantalla → foco visible en todos los controles.
- Botones de solo ícono con nombre accesible.
- Con "menos movimiento" del SO activo → sin animaciones de movimiento.

## Criterio de aceptación
Todas las casillas anteriores OK + `npm run verify` verde ⇒ la fase está lista para commit/deploy.
