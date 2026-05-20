# Pistachio

Aplicación interna de **gestión de proyectos + ERP por negocio** para Rewind Media House
(antes "Cowork RMH"). Centraliza proyectos, tareas, notas, documentos, historial
de cambios, calendario y la cartera de clientes/pagos en una sola herramienta.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router, Server Components, Server Actions) |
| Base de datos | Neon Postgres + Drizzle ORM |
| Auth | NextAuth v4 (credenciales, JWT) |
| Archivos | Vercel Blob |
| Estilos | Tailwind CSS + tokens propios + `class-variance-authority` |
| Temas | `next-themes` (claro/oscuro, default oscuro) |
| Tipografía | Clash Display + Satoshi (self-hosted vía `next/font/local`) |
| Editor de notas | TipTap + Yjs |
| Email | Resend (opcional, ver "Pendientes") |
| Deploy | Vercel |

## Funcionalidades

- **Proyectos**: categorías (buckets) con categorías por defecto y personalizadas,
  color, miembros, fechas de inicio/fin, y estados:
  `Activo`, `En pausa`, `En revisión`, `Detenido`, `Completado`, `Archivado`
  (archivar/reactivar desde la configuración del proyecto).
- **Tareas**: estados, prioridad, asignación, subtareas, drag & drop (`@dnd-kit`).
- **Calendario**: tareas por fecha de vencimiento, **barras de duración por
  proyecto** (inicio→fin) y marcadores de **notas** y **cambios** en su fecha.
- **Notas**: editor enriquecido (TipTap) por proyecto/tarea.
- **Documentos**: subida a Vercel Blob, export a PDF/DOCX.
- **Historial (changelog)**: registro de acciones por entidad.
- **Operaciones (ERP por negocio)**: dashboard por negocio + Catálogo
  (productos/categorías/costos), Cotizador (IVA), Ventas, Gastos y Clientes/
  cobros. Multi-negocio vía buckets. El CRM se consolidó aquí (las rutas
  `/crm/*` fueron eliminadas). Ver "Módulo Operaciones".
- **Administración (`/admin`)**: panel único — usuarios + rol global +
  tarjeta por persona, negocios, y por negocio perfiles/permisos/equipo/
  acuerdos. Reemplaza las antiguas `/settings/team*`.
- **Dashboard / Mis tareas**: vistas agregadas por usuario.

## Estructura del proyecto

```
src/
  app/
    (app)/        Rutas autenticadas: dashboard, projects, my-tasks,
                  calendar, crm, operations, settings
    (auth)/       login, signup, reset-password
    api/          route handlers: auth, documents, export, users,
                  operations
  components/
    ui/           Primitivos (Button, Input, Select, Card, Badge,
                  Modal, Skeleton…) — CVA + cn(), token-driven
    layout/       Sidebar, Topbar, AppShell
    shared/       PageHeader, EmptyState, LoadingSpinner, UserAvatar
    {projects,tasks,crm,calendar,notes,changelog,documents,operations}/
  lib/
    db/           schema.ts (Drizzle) + cliente Neon
    access.ts     scope de buckets por equipo (getAccessibleBuckets)
    actions/      Server Actions (clients, documents, notes,
                  projects, tasks, products, teams) — firmas = verdad
    constants/    p.ej. projectStatus.ts (labels + variantes Badge)
    utils/        cn() (clsx + tailwind-merge)
  fonts/          Clash Display + Satoshi (self-hosted)
```

### Modelo de datos (tablas Drizzle)

`users`, `accounts`, `sessions`, `verification_tokens`,
`password_reset_tokens`, `buckets`, `projects`, `project_members`, `tasks`,
`documents`, `notes`, `changelog`, `clients`, `client_accounts`, `payments`,
`client_projects`, `bucket_members`, `product_categories`, `products`,
`product_cost_history`.

Enums: `user_role`, `task_status`, `task_priority`, `project_status`,
`changelog_action`, `client_status`, `payment_status`, `product_status`,
`currency`.

## Puesta en marcha (local)

```bash
npm install
cp .env.example .env.local   # rellenar DATABASE_URL y NEXTAUTH_SECRET
npm run dev                  # http://localhost:3000
```

### Variables de entorno

Ver `.env.example`. Mínimas para arrancar: `DATABASE_URL` y `NEXTAUTH_SECRET`.
`RESEND_API_KEY` es opcional (reset por email).

### Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build |
| `npm run type-check` | `tsc --noEmit` (ver nota de gate) |
| `npm run lint` | ESLint |

## Base de datos y migraciones

El esquema vive en `src/lib/db/schema.ts` (Drizzle, `drizzle.config.ts`).
Para cambios de esquema cuando **no** se puede `vercel env pull` (la
`DATABASE_URL` es sensible) se usa un patrón puntual:

1. Crear una ruta temporal **guarded** bajo `src/app/api/auth/...` (ese prefijo
   salta el middleware) con un token en query.
2. Ejecutar las sentencias idempotentes (`ALTER TABLE ... IF NOT EXISTS`,
   `ALTER TYPE ... ADD VALUE IF NOT EXISTS`) llamando la ruta con `curl`.
3. **Eliminar la ruta temporal** y commitear.

> No commitear archivos temporales. La ruta temporal nunca debe quedar viva.

## Despliegue

- Se trabaja **siempre en la rama `preview`**; Vercel auto-despliega a la URL de
  preview. El merge a `main` (producción) se hace solo tras validar.
- El build local en Windows puede crashear por OOM (entorno, no código):
  **la fuente de verdad es el deploy de Vercel** (estado `READY`).
- Verificación por cambio: `npm run type-check` (0 errores) + deploy `READY`.

## Sistema de diseño

- **Tokens** día/noche en `globals.css` + `tailwind.config.ts`; los colores se
  consumen como `var(--x)`. Dos bases: **Navy** (default) y **Pino**
  (`[data-base="pine"]`). Escala de elevación `--elev-1..3`.
- **Primitivos** propios en `src/components/ui/` (no shadcn): CVA + `cn()`,
  estética Linear (hairline, focus-visible, estados loading/disabled).
- **Tipografía** homogénea: Clash Display (títulos) + Satoshi (cuerpo),
  self-hosted. Estado/acción = color **+ icono + label**, nunca color solo.

## Módulo Operaciones

Soporte multi-negocio sin tablas de "workspaces": **cada negocio = un `bucket`**
(top-level ya existente; ej. Azulejos & Colores, RMH). El acceso es por
**equipo**: `bucket_members` define qué usuario entra a qué negocio. Un admin
ve todos los buckets; el resto solo aquellos donde está asignado.

- **Acceso/equipos:** panel **`/admin`** (solo admin). `bucket_members` define
  qué usuario entra a qué negocio; el **perfil** asignado (tabla `profiles`,
  permisos editables) determina qué puede hacer (`bucketCan`). `users.role`
  global solo distingue super-admin. Scope en `src/lib/access.ts`
  (`getAccessibleBuckets`, `canAccessBucket`, `requireBucketAccess`,
  `getBucketPermissions`).
- **Navegación:** `/operations` (selector) → `/operations/[bucketId]`
  (**dashboard** con KPIs) → módulos: Catálogo (productos + Categorías en
  modal + costos), Cotizador, Ventas, Gastos, Clientes/cobros.
- **Tablas:** `bucket_members`, `profiles`, `product_categories`, `products`,
  `product_cost_history`, `quotes`/`quote_items`, `sales`, `expenses`,
  `clients`/`payments`. Enums `product_status` (`active`/`archived`),
  `currency` (`CRC`/`USD`), `quote_status`, `expense_kind`.
  `changelog_action` extendido con
  `product_created`/`product_updated`/`product_archived`; el changelog enlaza al
  producto vía `entityType:"product"` + `entityId` (sin columnas nuevas).
- **Convención local:** las server actions de Operaciones (`lib/actions/products.ts`)
  devuelven un envelope `{ success, data } | { success, error }` con validación
  **Zod** (esquemas `*Schema` exportados). El resto del repo mantiene su patrón
  (throw + data); `teams.ts` sigue el patrón existente del repo.
- **Dinero:** `numeric(12,2)` → `string` en DB; helper `toMoney()` en la capa de
  actions lo convierte a `number` para la app.

## Convenciones (importante)

- **camelCase es la fuente de verdad.** Los componentes deben llamar a las
  Server Actions con las firmas camelCase de `src/lib/actions/*`. El bug
  sistémico histórico fue enviar claves snake_case; ya está erradicado.
- **`typescript.ignoreBuildErrors` está en `false`** (`next.config.mjs`): el
  compilador es la red de seguridad. Cualquier error de tipos rompe el build de
  Vercel — no introducir nuevos. (`eslint.ignoreDuringBuilds` se mantiene en
  `true` por incompatibilidad ESLint 9 / Next 14, ajeno al type-safety.)
- No tocar lógica/backend salvo lo necesario para exponer datos existentes.

## Pendientes / Congelado

- **Resend (`RESEND_API_KEY`)**: el código de reset de contraseña por email está
  listo, pero la integración está **congelada** (tema de plan del proveedor, lo
  resuelve el equipo). No bloquea el resto de la app.
- Merge final `preview` → `main` (producción): manual, tras validar.
