---
description: Audita deuda técnica del repo (fechas/UI, escalabilidad DB, seguridad) y produce un reporte tabular con severidades. Solo lectura — no edita archivos.
argument-hint: "[area opcional: dates|db|security|all]"
---

# /tech-debt-audit

Sos el orquestador de un audit de deuda técnica de Pistachio (Next.js 14 + Drizzle + Neon + NextAuth, repo en `C:\Users\RWA\cowork RMH`). Tu trabajo en esta invocación es **READ-ONLY**: lanzás 3 Explore agents en paralelo, consolidás los resultados, y devolvés un reporte. **No edites ningún archivo. No corras builds. No hagas commits.**

## Argumento opcional `$ARGUMENTS`

- Sin argumento o `all` → ejecutar los 3 audits.
- `dates` → solo audit de fechas / formato DD/MM/AAAA.
- `db` → solo audit de DB.
- `security` → solo audit de seguridad.

## Baseline

El último baseline conocido vive en `C:\Users\RWA\.claude\plans\necesito-crear-un-app-drifting-cake.md`. Leelo ANTES de empezar para poder marcar diffs (items resueltos / nuevos / sin cambio) vs ese estado.

## Cómo correr el audit

Lanzá los Explore agents que apliquen en **una sola llamada con múltiples tool calls** (paralelo). Pasale a cada uno el prompt textual de abajo, sin cambios — son los mismos prompts que produjeron el baseline original, así los resultados son comparables run-a-run.

### Agent A — Date format audit

Prompt:

> Repo: `C:\Users\RWA\cowork RMH` (Next.js 14 App Router + Drizzle + NextAuth, web app en cowork-rmh.vercel.app).
>
> Necesito que investigues 2 cosas concretas para un plan:
>
> ## 1. Todos los lugares donde se renderiza una fecha en la UI
> El usuario quiere DD/MM/YYYY como formato único sin excepción. Ya existe `src/lib/utils/datetime.ts` con `formatDateCR / formatDateTimeCR / formatTimeCR` que usa `Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica" })`. Pero hay muchos componentes que todavía hacen `new Date(x).toLocaleDateString(...)` o muestran ISO crudo, y otros usan `date-fns format()` sin TZ.
>
> Busca exhaustivamente:
> - Toda llamada a `.toLocaleDateString`, `.toLocaleString`, `.toLocaleTimeString` en `src/`
> - Cualquier uso de `Intl.DateTimeFormat` fuera de `src/lib/utils/datetime.ts`
> - Cualquier uso de `date-fns` `format()` / `parseISO()` / `formatDistanceToNow()` en componentes
> - Cualquier render directo de strings ISO o `Date` en JSX dentro de `src/components/` y `src/app/(app)/`
> - Cualquier uso de `dueDate`, `saleDate`, `createdAt`, `updatedAt`, `completedAt`, `startsAt`, `endsAt` que termine en pantalla
>
> Lista archivos+líneas, agrupando por tipo de fecha (date-only YYYY-MM-DD vs timestamp). NO propongas código, solo el inventario.
>
> ## 2. Upload de documentos no refresca la vista
> El usuario reporta: "cuando se suben documentos no actualiza la vista inmediatamente, hay que refrescar la página".
>
> Busca:
> - Componente que sube documentos en `src/components/documents/` (DocumentList.tsx + FileUploadDropzone.tsx + DocumentsView.tsx)
> - Endpoint `src/app/api/documents/upload/route.ts`
> - Cómo el componente actualiza state local después del upload (router.refresh? revalidatePath? mutate de SWR? simplemente nada?)
> - Si usa Server Action vs API route
> - Si hay `revalidatePath("/documents")` o equivalente en el server
>
> Reporta: cuál es el flujo actual y por qué no refresca. NO propongas la solución, solo el diagnóstico.
>
> Reporta en <600 palabras, formato lista. Cero código nuevo, solo inventario y diagnóstico.

### Agent B — DB scalability audit

Prompt:

> Repo: `C:\Users\RWA\cowork RMH` (Next.js 14 + Drizzle ORM + Neon Postgres serverless).
>
> Necesito un análisis de escalabilidad de DB para un plan de tech-debt audit. Investigá:
>
> ## 1. Schema completo
> Leé `src/lib/db/schema.ts` completo. Reportá:
> - Lista de tablas con su rol
> - Qué índices están declarados (Drizzle `index()` o `uniqueIndex()`)
> - Qué columnas son PKs / FKs
> - Tablas grandes esperadas (notifications, tasks, sales, expenses, projectMembers, workspaceMembers)
> - Cualquier tabla que NO tenga índice en su columna de FK
>
> ## 2. Patrones de query potencialmente problemáticos
> Buscá en `src/lib/actions/` y `src/app/api/`:
> - Queries que hacen JOIN sin WHERE indexado (full scan)
> - Queries que cargan todo (SELECT * sin LIMIT) y filtran en JS
> - N+1 patterns (loop async sobre rows)
> - Uso de `count(*)` sobre tablas grandes en hot paths
> - Falta de paginación en listados (/notifications, /tasks, /sales, etc.)
> - Ordenamiento por columna sin índice
> - Subqueries / CTEs (verificá si están justificadas)
>
> ## 3. Migration history
> - Listá los migrations en `drizzle/` o `migrations/` si existen
> - ¿Hay drift entre schema.ts y la DB real? (ya hubo un caso de `parent_task_id` faltante)
>
> ## 4. Conexión a DB
> - `src/lib/db/index.ts` — ¿usa connection pooling? ¿qué provider? (neon-http, postgres-js, etc.)
> - Límites del plan Neon (free tier suele ser 0.5GB storage + 100h compute/mes)
>
> ## 5. Hot paths
> Identificá las páginas que probablemente ejecutan más queries por request:
> - /dashboard
> - /projects/[id]
> - /operations
> - /reports
> - /notifications (polling cada 30s — multiplica RPS)
>
> Para cada una, cuenta cuántas queries hace aproximadamente.
>
> Reportá en <800 palabras, formato estructurado. Cero código nuevo, solo análisis y diagnóstico. Indicá severidad de cada problema (V0/V1/V2/V3 según vanity-engineering-review skill).

### Agent C — Security audit

Prompt:

> Repo: `C:\Users\RWA\cowork RMH` (Next.js 14 App Router + NextAuth v4 + Drizzle + Neon, deployado en Vercel).
>
> Necesito un audit de seguridad para un plan. Investigá:
>
> ## 1. Autenticación
> - `src/lib/auth.ts` — ¿qué estrategia? (Credentials provider con bcrypt, JWT)
> - `src/lib/auth-bearer.ts` — ¿cómo se valida el JWT mobile? ¿TTL?
> - `src/middleware.ts` — ¿qué rutas protege? ¿qué deja pasar?
> - Password hashing — ¿bcrypt cost? ¿bien aplicado en todos los endpoints que setean password?
> - Endpoints de password: `/api/users/[id]/password`, `/api/users/me/password`, `/api/auth/forgot-password`, `/api/auth/reset-password`
> - `passwordResetTokens` schema — ¿expiración? ¿single-use? ¿token random suficientemente largo?
>
> ## 2. Autorización
> - Patrón de autz: ¿se valida workspace membership en cada server action y API route?
> - Verificá si endpoints como `/api/users/[id]/password`, `/api/users/[id]/workspaces`, `/api/admin/debug/*` validan rol admin antes de operar
> - Server actions en `src/lib/actions/` — ¿qué helpers de scoping usan? (`getActiveWorkspace`, `requireWs`, etc.)
> - IDOR risk: ¿endpoints accept un :id en URL y lo usan sin verificar ownership/membership?
>
> ## 3. Input validation
> - ¿Se usa Zod o similar en API routes? Si no, ¿cómo se valida body?
> - Server actions — ¿validan tipo y forma del input?
>
> ## 4. Secrets & env vars
> - `next.config.mjs` — ¿hay secrets hardcoded? ¿ignoreBuildErrors?
> - ¿`NEXTAUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL` están solo en env vars?
> - ¿Hay `console.log` que puedan filtrar tokens / passwords?
>
> ## 5. Endpoints expuestos sin auth
> - ¿`/api/cron/*` valida `CRON_SECRET`?
> - ¿`/api/auth/forgot-password` rate-limited? ¿permite enumerar emails?
> - ¿`/api/auth/mobile-token` rate-limited?
> - ¿`/api/admin/debug/*` — qué auth tienen? (eran temporales)
>
> ## 6. CSRF / XSS
> - NextAuth maneja CSRF en su flujo, pero ¿hay forms custom que no?
> - Tiptap / rich-text — ¿sanitiza HTML al guardar/renderizar notas?
> - `dangerouslySetInnerHTML` — buscá usos
>
> ## 7. File upload (Vercel Blob)
> - `/api/documents/upload` — ¿valida mime/size? ¿quién puede subir?
> - ¿Los URLs de Blob son públicos o requieren signed URL?
>
> ## 8. Rate limiting
> - ¿Hay middleware de rate limit? (probablemente NO — flag importante)
>
> ## 9. CORS
> - ¿La API permite CORS abierto? (riesgo con el mobile app si usa origen distinto)
>
> ## 10. Logging / audit trail
> - ¿Hay log de acciones admin (set password, delete user, change role)?
> - `changelog` table que vi en el schema — ¿se usa para esto?
>
> Reportá en <1000 palabras, formato estructurado. Por cada hallazgo, severidad (Low/Med/High/Critical) y archivo+línea. Cero código nuevo, solo diagnóstico y prioridades.

## Consolidación del reporte

Cuando vuelvan los 3 agents, devolvé al usuario un único bloque con esta estructura:

### 1. Resumen ejecutivo (3-5 líneas)
Cantidad total de hallazgos por categoría y severidad. Tendencia vs baseline (si baseline existe).

### 2. Tabla consolidada

| ID | Categoría | Hallazgo | Severidad | Archivo:línea | Kill cost | Simpler alternative |
|---|---|---|---|---|---|---|

- **Categoría** = `DATE`, `UPLOAD`, `DB`, `SEC`.
- **Severidad** =
  - DB: V0 / V1 / V2 / V3 (vanity-engineering-review: V0 cosmetic, V1 drag, V2 structural, V3 compounding).
  - SEC: Low / Med / High / Critical.
  - DATE / UPLOAD: Low / Med / High.
- **Kill cost** = estimado en horas o días para arreglar.
- **Simpler alternative** = la corrección de menor riesgo (no necesariamente la "más linda").

### 3. Diff vs baseline

Si el baseline (plan file) existe y tiene tabla de hallazgos:

- **Resueltos desde el último run** (no aparecen ahora): ID + descripción.
- **Nuevos** (no estaban antes): ID + descripción + severidad.
- **Sin cambio**: lista de IDs (sin detalle).

### 4. Recomendación de próxima sesión

UNA sola, la de mayor severidad × menor kill cost. Una sola frase.

### 5. Lo que SÍ está bien

Recordatorio de los puntos donde no hay deuda — evita que la próxima sesión se rompa algo que ya funciona. Tomalo del baseline si existe.

## Hard rules

- NUNCA edites código. Si te tienta proponer un fix concreto, contené el impulso y dejá la propuesta en "Simpler alternative" (texto, no código).
- NUNCA corras `npm run build`, tests, ni commits.
- NUNCA pidas permisos para escribir archivos.
- Si el usuario te pide implementar algo después del audit, decile que cierre `/tech-debt-audit` y abra una sesión nueva con el ID del item a remediar.
- Si baseline no existe, marcá explícitamente "primer run, sin baseline previo" y guardá el reporte mentalmente para que la próxima invocación tenga contra qué comparar (el usuario puede pegar el reporte en el plan file manualmente).

## Modelo mental

El comando es **documentación viviente** de la deuda técnica. Run-a-run debería:

1. Reducir items resueltos.
2. Detectar regresiones (items que volvieron).
3. Catchear deuda nueva temprano.

No es un linter — es un audit estratégico que prioriza qué arreglar antes que cómo arreglarlo.
