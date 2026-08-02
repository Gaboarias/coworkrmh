# Code Review — Pistachio (cowork-rmh)

**Commit:** `9059bcd` · **Fecha:** 2026-07-31 · **Alcance:** repo completo (226 archivos, 23 787 LOC en `src/`)
**Método:** lectura de código + verificación en producción y en runtime. Cada hallazgo marcado ✅ fue comprobado, no inferido.

---

## Resumen

La base está **mejor construida que el promedio**: la capa de autorización por entorno es un diseño deliberado y bien documentado, el manejo de refresh tokens es de manual, `tsc --noEmit` pasa limpio y las queries usan Drizzle parametrizado en todo el repo — **no encontré SQL injection**.

Los problemas serios no son de estilo: son **cuatro fallos concretos** — una feature entera caída en producción, un borrado de datos silencioso, una revocación de privilegios que no revoca, y datos de clientes accesibles por cualquier usuario logueado. Ninguno se detecta con los gates actuales porque **no hay tests ni CI**.

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 1 |
| 🟠 Alto | 5 |
| 🟡 Medio | 5 |
| 🔵 Bajo | 6 |

---

## 🔴 CRÍTICO

### C1 — El portal de clientes es inalcanzable en producción ✅ verificado

**Archivos:** [middleware.ts:46](src/middleware.ts#L46) · [clients.ts:149,163](src/lib/actions/clients.ts#L149) · [(portal)/[token]/page.tsx](src/app/(portal)/[token]/page.tsx)

`(portal)` es un **route group**: los paréntesis no aportan segmento de URL. La página vive en `/<token>`, no en `/portal/<token>`. Pero dos lugares asumen lo contrario:

1. **La URL generada** es `${getAppUrl()}/portal/${token}` — y esa URL se manda por email al cliente vía [`sendPortalInviteEmail`](src/lib/email.ts#L170).
2. **El matcher del middleware** excluye `portal`, pensando en ese mismo prefijo.

Como la exclusión nunca coincide con la ruta real, el middleware de NextAuth protege `/<token>` y rebota al cliente a `/login`.

Comprobado contra `https://cowork-rmh.vercel.app`:

| URL | Resultado |
|---|---|
| `/portal/<uuid>` — la que se emailea | **404** (no existe la ruta) |
| `/<uuid>` — la ruta real | **307 → `/login?callbackUrl=…`** |
| `/portal` | 404 renderizado por `[token]` con token="portal" → confirma que `[token]` está en la raíz |

**Los dos caminos fallan.** Todo cliente externo que reciba una invitación ve un 404 o una pantalla de login que no puede pasar. La feature está muerta desde que existe.

**Fix recomendado (una sola movida):** mover la página a `src/app/(portal)/portal/[token]/page.tsx`. La URL pasa a ser `/portal/<token>`, que es lo que ya asumen la generación de links **y** el matcher del middleware — cero cambios en el resto.

La alternativa (cambiar los 4 sitios que generan el link a `/${token}` + excluir un UUID suelto en la raíz del matcher) es peor: debilita el matcher para cubrir la raíz.

---

## 🟠 ALTO

### A1 — `unlinkClientFromProject` borra el vínculo de **todos** los clientes ✅ verificado

**Archivo:** [clients.ts:262-267](src/lib/actions/clients.ts#L264-L267)

```js
.where(
  eq(clientProjects.clientId, clientId) &&      // ← && de JavaScript, no and() de Drizzle
  eq(clientProjects.projectId, projectId)
)
```

`eq()` devuelve un objeto (truthy), así que `a && b` evalúa a **`b`**. Comprobado ejecutando drizzle-orm:

```
typeof eq() result : object
eq() is truthy     : true
(a && b) === b     : true      ← el WHERE queda solo con projectId
```

El `DELETE` corre con **únicamente** `project_id = ?`. Desvincular un cliente de un proyecto **borra el vínculo de todos los demás clientes con ese proyecto**, en silencio, sin error.

Agrava: `client_projects` ([schema.ts:514-517](src/lib/db/schema.ts#L514-L517)) no tiene PK ni índice, así que nada lo frena a nivel DB.

**Fix:** `and(eq(...), eq(...))` — `and` ya está importado en otros archivos del mismo directorio.
**Barrido:** busqué el patrón en todo `src/` — **es el único caso**.

### A2 — Degradar a un admin no le quita los privilegios (hasta 30 días)

**Archivos:** [auth.ts:56-62](src/lib/auth.ts#L56-L62) · [workspace.ts:45,119-122](src/lib/workspace.ts#L119-L122)

El callback `jwt` sólo escribe `token.role` **cuando hay `user`** — o sea, únicamente en el login. Después el rol viaja congelado en el JWT y nunca se revalida contra la DB.

`getMemberWorkspaces` y `getWorkspaceRole` leen `session.user.role` de ese token. Y un `role === "admin"` global se convierte en `role: "owner"` → **bypass total de permisos en todos los entornos** ([workspace.ts:120-122](src/lib/workspace.ts#L120-L122)).

Consecuencia: si degradás a un admin, **conserva admin global hasta que expire su sesión** — 30 días por defecto en NextAuth, 24 h en el access token mobile ([auth-bearer.ts:30](src/lib/auth-bearer.ts#L30)). Simétricamente, promover a alguien no surte efecto hasta que vuelva a loguearse.

Esto anula en la práctica el guard C14 del batch 1 ("bloquea que un admin se auto-degrade"): la integridad de la lista de admins se cuida, pero la degradación no se hace efectiva.

**Fix:** releer el rol desde la DB en el callback `jwt` (con un TTL corto para no pegarle a Neon en cada request), o mantener un `sessionVersion` por usuario que invalide tokens al cambiar el rol.

### A3 — IDOR: proyectos y pagos de cualquier cliente, para cualquier usuario logueado

**Archivo:** [clients.ts:89-126](src/lib/actions/clients.ts#L89-L126)

`listClients` valida rol correctamente (admin/manager, [líneas 55-60](src/lib/actions/clients.ts#L55-L60)). Pero las dos que le siguen sólo comprueban **autenticación**:

```js
export async function listClientProjects(clientId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");   // ← y nada más
```

Igual en `listClientPayments`. Son `"use server"`, o sea **endpoints HTTP invocables directamente**: cualquier miembro de cualquier entorno puede pasar un `clientId` arbitrario y leer la lista de proyectos y **el historial de pagos completo** (monto, moneda, estado, vencimiento).

**Fix:** aplicar el mismo guard de rol que `listClients`, o mejor, scopear por entorno (ver B1).

### A4 — El login web no tiene rate limiting

**Archivos:** [auth.ts:24-52](src/lib/auth.ts#L24-L52) vs [mobile-token/route.ts:42](src/app/api/auth/mobile-token/route.ts#L42)

Existe `lib/rate-limit.ts` y está bien aplicado en `/api/auth/mobile-token`, `/refresh`, `/signup` y `/reset-password`. El `authorize()` del CredentialsProvider — **el login principal de la web** — no lo usa: hace lookup + `bcrypt.compare` sin límite de intentos.

Un atacante simplemente usa el endpoint web en vez del mobile y evita por completo el control de 5 intentos / 15 min. Lo confirmé en la corrida de QA: password incorrecta devuelve 401 limpio, sin throttling.

**Fix:** `checkRateLimit`/`registerFailure`/`clearRateLimit` dentro de `authorize()`, con key por email **y** por IP.

### A5 — Cero tests, cero CI

No hay archivos `*.test.*` / `*.spec.*`, ni `__tests__/`, ni runner en `package.json`, ni `.github/workflows/`.

Son 23 787 líneas que manejan **dinero** (payments, cotizador, ventas, gastos), **autenticación** y **envío masivo de email**. Los cuatro hallazgos de arriba son exactamente lo que atrapa un test:

- C1 → un test de ruta sobre la URL del portal
- A1 → un test de `unlink` con dos clientes en el mismo proyecto
- A2 → un test de "degrado y verifico que perdió acceso"
- A3 → un test de autorización por rol sobre cada server action

**Fix mínimo con mejor relación costo/beneficio:** Vitest + un puñado de tests de autorización sobre `lib/actions/*` y `lib/workspace.ts`, más un workflow que corra `tsc --noEmit` + tests en cada PR.

---

## 🟡 MEDIO

### M1 — Open redirect en `/api/ws/switch` ✅ verificado

**Archivo:** [ws/switch/route.ts:10](src/app/api/ws/switch/route.ts#L10)

```js
const safeNext = next.startsWith("/") ? next : "/dashboard";
```

`startsWith("/")` no filtra URLs **protocol-relative**. Verificado:

```
"//evil.com"        startsWith('/')=true  -> https://evil.com/
"//evil.com/phish"  startsWith('/')=true  -> https://evil.com/phish
"/dashboard"        startsWith('/')=true  -> https://cowork-rmh.vercel.app/dashboard
```

Mitigante: `to` debe ser un entorno al que la víctima tenga acceso, lo que limita bastante la explotación a un insider o a un ID filtrado.

**Fix:** `!next.startsWith("//") && !next.includes("\\")`, o resolver con `new URL(next, origin)` y comparar el `origin`.

### M2 — El MIME de los uploads lo elige el cliente; `image/svg+xml` pasa

**Archivos:** [uploads.ts:10,28-32](src/lib/uploads.ts#L28-L32) · [documents/upload/route.ts:51-71](src/app/api/documents/upload/route.ts#L51) · [reports/upload/route.ts:39-59](src/app/api/reports/upload/route.ts#L39)

`file.type` viene del FormData — lo controla el cliente — y se usa **para decidir el allowlist y además se pasa a `put()` como `contentType`**. El prefijo `image/` acepta `image/svg+xml`, y un SVG puede contener `<script>`. Con `access: "public"`, el blob queda servido con ese content-type.

Atenuante real: se sirve desde `*.public.blob.vercel-storage.com`, **otro origen** que el de la app, así que no llega a las cookies de sesión. Queda como XSS en el dominio de blobs + superficie de phishing — y se vuelve crítico si algún día se proxea el blob al mismo origen.

Tampoco hay validación de magic bytes: un ejecutable renombrado y declarado `image/png` entra (bajo riesgo: se sirve como png, no se ejecuta).

**Fix:** excluir `image/svg+xml` explícitamente, y para lo no previsualizable forzar `contentType: "application/octet-stream"` + `Content-Disposition: attachment`.

### M3 — `registerFailure` tiene race condition

**Archivo:** [rate-limit.ts:91-117](src/lib/rate-limit.ts#L91-L117)

Hace SELECT y después INSERT/UPDATE, sin transacción ni incremento atómico. Con `neon-http` (cada query es un round-trip independiente, sin transacción) dos fallos concurrentes leen `count = N` y ambos escriben `N+1`. Lanzando requests en paralelo se supera el umbral con bastante margen.

**Fix:** un solo `INSERT … ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1` con el lock calculado en SQL.

### M4 — ESLint está roto: no se lintea nada ✅ verificado

`npm run lint` falla de entrada:

```
Invalid Options:
- Unknown options: useEslintrc, extensions, resolvePluginsRelativeTo, rulePaths, ignorePath, reportUnusedDisableDirectives
```

Causa: `eslint@9` (flat config) + `.eslintrc.json` legacy + `eslint-config-next@16` contra `next@14`. Y [next.config.mjs](next.config.mjs) tiene `eslint: { ignoreDuringBuilds: true }`, con un comentario que reconoce el problema.

El resultado es que **el proyecto no tiene linter**, ni en local ni en build. El único gate real es `tsc --noEmit` (que sí pasa limpio). Ninguna regla habría atrapado A1, pero sí varias clases de bug que hoy pasan sin filtro.

**Fix:** bajar `eslint-config-next` a `^14` para que empareje con Next 14, o migrar a `eslint.config.mjs` flat.

### M5 — Se filtran mensajes de error internos al cliente

**Archivos:** [documents/upload/route.ts:93-96](src/app/api/documents/upload/route.ts#L93) · [reports/upload/route.ts:70-73](src/app/api/reports/upload/route.ts#L70)

```js
return NextResponse.json({ error: e.message || "Error al subir el archivo" }, { status: 400 });
```

Devuelve `e.message` tal cual, así que un error de DB o de Blob viaja al navegador. Además, los fallos de autorización de `requireProjectAccess` salen como **400**, no 403.

**Fix:** mensaje genérico al cliente, detalle a `logger.error`, y mapear autorización a 403.

---

## 🔵 BAJO

- **B1 — `clients` y `payments` no están scopeados por entorno.** [schema.ts:470-512](src/lib/db/schema.ts#L470-L512) no tienen `workspaceId`, a diferencia del resto del modelo multi-entorno. `listClients` devuelve **todos** los clientes de todos los entornos a cualquier admin/manager. Es la raíz de A3 y contradice la lección de arquitectura de [LESSONS.md](LESSONS.md) ("módulos aislados por entorno").
- **B2 — Falta PK/índice en `client_projects`** ([schema.ts:514-517](src/lib/db/schema.ts#L514-L517)) y falta índice en `payments.clientId`. El resto del schema tiene una cobertura de índices notablemente buena — estas dos son las excepciones.
- **B3 — Enumeración de usuarios por timing en el login.** [auth.ts:36](src/lib/auth.ts#L36) retorna antes de `bcrypt.compare` si el email no existe; con usuario válido paga ~100 ms. La diferencia revela qué emails están registrados. Mitigación estándar: comparar siempre contra un hash dummy.
- **B4 — `console.*` vs `logger.*` inconsistente** (4 vs 8 usos). [auth.ts:49](src/lib/auth.ts#L49) y ambas rutas de upload usan `console.error` teniendo `lib/logger.ts`.
- **B5 — La cookie `ws` no lleva `secure`** ([ws/switch/route.ts:17-21](src/app/api/ws/switch/route.ts#L17)). No es token de sesión, pero conviene igual en producción.
- **B6 — `_q.mjs` en la raíz** es un runner de SQL ad-hoc que lee `DATABASE_URL` de `.env.local`. Está sin trackear y el header dice "not committed", pero **no está en `.gitignore`** — un `git add -A` lo sube. Agregarlo al ignore.

---

## Lo que está bien hecho

Vale registrarlo, porque condiciona qué conviene tocar:

- **Autorización por entorno** ([workspace.ts](src/lib/workspace.ts)): una sola fuente de permisos (`workspaces.role_permissions`), una lista canónica de claves, un resolver único, deny-por-defecto si el rol no está en la matriz. Coincide con lo que [LESSONS.md](LESSONS.md) dice que se buscaba y evita la redundancia del ERP viejo. **Excepto A3, que se salta este sistema por completo** — de ahí la severidad.
- **Refresh tokens** ([auth-bearer.ts](src/lib/auth-bearer.ts)): random de 256 bits, sólo el hash SHA-256 persiste, rotación single-use, revocación por logout y por cambio de password. De manual.
- **Auth de los crons** ([check-due-soon/route.ts:24-29](src/app/api/cron/check-due-soon/route.ts#L24)): `timingSafeEqual` con chequeo de longitud previo.
- **Sin SQL injection.** Revisé los 20 usos de `sql\`\``/`db.execute`, incluido el constructor dinámico de [segment.ts](src/lib/marketing/segment.ts): todo va por template parametrizado, incluso el `ILIKE` de búsqueda.
- **Índices**: cobertura amplia y pensada en las rutas calientes (`tasks(assignee_id,status)`, `notifications(user_id,read_at)`, `erp_sales(workspace_id,sale_date)`…).
- **`tsc --noEmit` pasa limpio** con `ignoreBuildErrors: false`. La deuda de tipos que menciona el config está efectivamente cerrada.
- **Documentación inline** excepcional: casi todos los módulos abren con un comentario que explica el porqué, no el qué. `LESSONS.md` es un artefacto genuinamente útil.

---

## Orden sugerido

1. **C1** — mover la página del portal. Una feature entera vuelve a existir; es un `git mv`.
2. **A1** — `and()` en vez de `&&`. Una línea, corta pérdida de datos silenciosa.
3. **A3** — guard de rol en `listClientProjects` / `listClientPayments`. Dos líneas.
4. **A2** — refrescar el rol desde DB en el callback `jwt`. Requiere decidir el TTL.
5. **A4** — rate limit en `authorize()`. La infraestructura ya existe, sólo hay que llamarla.
6. **M1, M2, M5** — endurecimiento; ninguno es explotable trivialmente hoy.
7. **M4** — arreglar ESLint, si no las reglas nuevas nacen muertas.
8. **A5** — Vitest + tests de autorización + workflow de CI. Es lo que evita que 1-5 vuelvan.

Los puntos 1-3 son ~6 líneas de cambio en total y cierran el crítico y los dos altos más concretos.
