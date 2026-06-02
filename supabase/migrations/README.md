# DEPRECATED — legacy SQL migrations

Estos archivos son del setup inicial cuando la DB vivía en Supabase. Hoy la DB
es **Neon Postgres** y el source of truth es `src/lib/db/schema.ts` (Drizzle).

**No editar estos SQL ni agregar nuevos acá.** Si necesitás un cambio de schema:

1. Editá `src/lib/db/schema.ts` con la modificación.
2. Generá la migración Drizzle:
   ```bash
   npm run db:generate
   ```
3. Revisá el SQL en `./drizzle/<timestamp>_*.sql`.
4. Aplicalo:
   ```bash
   npm run db:migrate
   ```

Para cambios chicos (un `CREATE INDEX IF NOT EXISTS`, un `ALTER COLUMN` simple)
podés usar el patrón de los endpoints one-shot en `src/app/api/admin/debug/` —
admin-only, idempotentes, se borran después del run.

**Archivos en este directorio**:
- `001_initial_schema.sql` — snapshot del schema cuando se migró Supabase → Neon
- `002_rls_policies.sql` — Row-Level Security (NO se aplica con Neon HTTP, ignorar)
- `003_functions_triggers.sql` — triggers/functions del init

Quedan acá como referencia histórica. Eventualmente se pueden mover a `docs/`.
