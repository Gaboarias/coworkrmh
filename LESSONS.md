# LESSONS — diseño / arquitectura

## Diseño (audit)
- **Identidad de contexto multi-entorno**: un punto de color chico no
  orienta. Usar acento lateral + chip; nunca fills grandes con colores
  elegidos por el usuario (contraste impredecible) → `readableFg()` por
  luminancia y paleta acotada `ENTORNO_SWATCHES` en vez de color picker libre.
- **No repetir el contexto en cada título** ("Catálogo · Entorno"): si el
  shell ya muestra el entorno, el título solo nombra el módulo. Reducir.
- **Consistencia de estados**: si una sección tiene `loading.tsx`, todas
  deben tenerlo (skeletons compartidos en `components/shared/Skeletons`).
- **Targets táctiles** ≥ ~36–44px y `focus-visible:ring` con tokens en
  todos los botones icon-only; placeholder NUNCA sustituye label →
  `aria-label` siempre en inputs inline.
- Animaciones coherentes: reusar `animate-slide-up`/`--ease-out` de los
  primitivos, no popovers que aparecen "secos".

## Arquitectura
- La redundancia del ERP vino de acoplar multi-bucket + perfiles +
  permisos + CRM. Lección: módulos aislados por entorno, membresía simple,
  un solo patrón de acciones (throw + data), sin matriz de permisos hasta
  que el negocio lo pida.
- Migraciones DB: ruta guarded temporal idempotente, correr por HTTPS al
  alias estable (no requiere token Vercel), luego ELIMINAR la ruta.
- `tsc --noEmit` con `.next` limpio = gate real (build local hace OOM).
- Matriz de permisos (el negocio la pidió): se construyó SIN recrear la
  redundancia del ERP viejo. Reglas que lo evitaron: una sola fuente
  (`workspaces.role_permissions` jsonb, no tabla `profiles`), una lista
  canónica de claves (`lib/constants/workspacePermissions.ts`), un único
  resolver (`getWorkspacePermissions`/`workspaceCan`), owner y admin-global
  = bypass total (no se almacenan), sin acoplar a buckets/CRM. Enforcement
  en el server (cada mutación valida su `.manage`); la UI sólo oculta/
  inhabilita (no es la barrera de seguridad). Si reaparece una segunda
  fuente de permisos, es la señal de la redundancia: borrarla.
- Pages server pasan permisos a componentes cliente con un único atajo
  (`getActiveWorkspaceWithPermissions` → `can(key)`), no un endpoint nuevo
  por pantalla (evita la dispersión que costó el rediseño).
