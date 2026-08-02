/**
 * Aplica archivos SQL de ./drizzle contra la base.
 *
 *   node scripts/migrate.mjs 0003 0004 0005
 *
 * Por qué esto y no `drizzle-kit migrate`, que es lo que uno esperaría:
 *
 * 1. drizzle-kit elige el driver `@neondatabase/serverless` y lo usa por
 *    WebSocket, que en Node necesita `neonConfig.webSocketConstructor` asignado
 *    a mano — cosa que drizzle-kit no hace. Se queda colgado en "applying
 *    migrations..." sin decir nada, que parece un problema de red y no lo es.
 *    Acá se usa el driver neon-http, el mismo de la app (src/lib/db/index.ts),
 *    que va por HTTP y no necesita nada de eso.
 *
 * 2. Más de fondo: esta base se administró con `drizzle-kit push`, no con
 *    migraciones. La tabla de journal de drizzle está vacía, así que `migrate`
 *    cree que NINGUNA migración se aplicó y arranca por 0000 — que crea enums
 *    que ya existen. Por eso acá se nombra explícitamente qué aplicar, en vez
 *    de dejar que un journal desincronizado decida.
 *
 * Si algún día se quiere volver al flujo normal de drizzle, hay que hacer
 * baseline: insertar en el journal las migraciones ya aplicadas. No lo hace
 * este script — equivocarse en un hash ahí hace que una migración vieja se
 * reintente sobre datos reales.
 *
 * Cada archivo se parte por el `--> statement-breakpoint` que escribe drizzle y
 * se ejecuta sentencia por sentencia: neon-http no hace transacciones
 * multi-sentencia. Si una falla, las anteriores quedaron aplicadas — se avisa
 * cuál para poder seguir a mano desde ahí.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function connectionString() {
  const fromEnv =
    process.env.DATABASE_URL ?? process.env.coworkrmh_DATABASE_URL;
  if (fromEnv) return fromEnv;

  const envFile = path.join(root, ".env.local");
  if (!fs.existsSync(envFile)) return null;
  for (const raw of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const prefixes = process.argv.slice(2);
if (prefixes.length === 0) {
  console.error(
    "Decí qué aplicar. Ej: node scripts/migrate.mjs 0003 0004 0005"
  );
  process.exit(1);
}

const url = connectionString();
if (!url) {
  console.error("No hay DATABASE_URL — ni en el entorno ni en .env.local.");
  process.exit(1);
}

const dir = path.join(root, "drizzle");
const todos = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

const archivos = prefixes.map((p) => {
  const hit = todos.filter((f) => f.startsWith(p));
  if (hit.length !== 1) {
    console.error(
      `"${p}" ${hit.length === 0 ? "no existe" : `es ambiguo (${hit.join(", ")})`} en drizzle/`
    );
    process.exit(1);
  }
  return hit[0];
});

// Sólo el host: el string completo lleva la contraseña y este repo es público.
console.log(`Base: ${new URL(url).host}`);
const sql = neon(url);

for (const archivo of archivos) {
  const stmts = fs
    .readFileSync(path.join(dir, archivo), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\n${archivo} — ${stmts.length} sentencias`);
  for (const [i, stmt] of stmts.entries()) {
    const resumen = stmt.split("\n")[0].slice(0, 70);
    try {
      await sql.query(stmt);
      console.log(`  ${i + 1}/${stmts.length} ok  ${resumen}`);
    } catch (err) {
      // "ya existe" no es un fallo: hace que correr esto dos veces sea
      // inofensivo, que es lo que uno quiere de algo que toca una base.
      if (/already exists/i.test(err.message)) {
        console.log(`  ${i + 1}/${stmts.length} ya estaba  ${resumen}`);
        continue;
      }
      console.error(`  ${i + 1}/${stmts.length} FALLÓ  ${resumen}`);
      console.error(`  ${err.message}`);
      console.error(
        `\nLas sentencias anteriores de ${archivo} sí quedaron aplicadas.`
      );
      process.exit(1);
    }
  }
}

console.log("\nListo.");
