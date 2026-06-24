/**
 * Stress test de base de datos — Pistachio.
 *
 * Mide latencia/throughput de los hot paths reales contra Neon y permite
 * inflar volumen (seed) para encontrar el punto de saturación.
 *
 * ⚠️  SEGURIDAD: NUNCA correr contra producción.
 *   - Requiere STRESS_DATABASE_URL (NO usa DATABASE_URL).
 *   - Se niega a correr si STRESS_DATABASE_URL === DATABASE_URL (salvo --force).
 *   - Recomendado: crear un BRANCH en Neon (copia aislada) y apuntar ahí.
 *
 * Uso:
 *   STRESS_DATABASE_URL=postgres://...branch... node scripts/stress-test.mjs ids
 *   STRESS_DATABASE_URL=...  node scripts/stress-test.mjs seed --user <uuid> --project <uuid> --ws <uuid> --tasks 5000 --notifs 20000
 *   STRESS_DATABASE_URL=...  node scripts/stress-test.mjs run  --user <uuid> --project <uuid> --ws <uuid> --concurrency 20 --iterations 1000
 *   STRESS_DATABASE_URL=...  node scripts/stress-test.mjs cleanup
 *
 * Modos:
 *   ids      → imprime un user/workspace/project de ejemplo para usar.
 *   seed     → inserta tareas + notificaciones sintéticas (tag [STRESS]).
 *   run      → martilla los hot paths a --concurrency y reporta percentiles.
 *   cleanup  → borra todo lo sintético ([STRESS]).
 */

import { neon } from "@neondatabase/serverless";

// ─── Args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const mode = argv[0];
function flag(name, def) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const has = (name) => argv.includes(`--${name}`);

const url = process.env.STRESS_DATABASE_URL;
if (!url) {
  console.error(
    "✗ Falta STRESS_DATABASE_URL.\n" +
      "  Creá un BRANCH en Neon y exportá su connection string ahí.\n" +
      "  NUNCA uses la base de producción."
  );
  process.exit(1);
}
if (url === process.env.DATABASE_URL && !has("force")) {
  console.error(
    "✗ STRESS_DATABASE_URL es igual a DATABASE_URL (producción). Abortado.\n" +
      "  Usá un branch de Neon. (--force para ignorar, bajo tu riesgo)."
  );
  process.exit(1);
}

const sql = neon(url);
const STRESS_TAG = "[STRESS]";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}
const ms = (n) => `${n.toFixed(1)}ms`;

// ─── Modo: ids ──────────────────────────────────────────────────────────────
async function runIds() {
  const [u] = await sql`SELECT id, email FROM users LIMIT 1`;
  const [w] = await sql`SELECT id, name FROM workspaces LIMIT 1`;
  const [p] = await sql`SELECT id, name, workspace_id FROM projects LIMIT 1`;
  console.log("user   :", u?.id, `(${u?.email})`);
  console.log("workspace:", w?.id, `(${w?.name})`);
  console.log("project:", p?.id, `(${p?.name}, ws=${p?.workspace_id})`);
  console.log(
    "\nUsalos en seed/run:  --user",
    u?.id,
    "--project",
    p?.id,
    "--ws",
    p?.workspace_id ?? w?.id
  );
}

// ─── Modo: seed ───────────────────────────────────────────────────────────────
async function runSeed() {
  const user = flag("user");
  const project = flag("project");
  const nTasks = parseInt(flag("tasks", "2000"), 10);
  const nNotifs = parseInt(flag("notifs", "10000"), 10);
  if (!user || !project) {
    console.error("✗ seed requiere --user <uuid> y --project <uuid> (ver: node scripts/stress-test.mjs ids)");
    process.exit(1);
  }

  console.log(`Seeding ${nTasks} tareas + ${nNotifs} notificaciones…`);

  // Tareas (80% activas, 20% done) — bulk en 2 statements.
  const doneCut = Math.floor(nTasks * 0.2);
  await sql`
    INSERT INTO tasks (project_id, title, status, created_by, position)
    SELECT ${project}, ${STRESS_TAG} || ' task ' || g, 'todo', ${user}, g
    FROM generate_series(1, ${nTasks - doneCut}) g`;
  await sql`
    INSERT INTO tasks (project_id, title, status, completed_at, created_by, position)
    SELECT ${project}, ${STRESS_TAG} || ' done ' || g, 'done', now(), ${user}, g
    FROM generate_series(1, ${doneCut}) g`;
  // Asignar todas las tareas sintéticas al user (task_assignees).
  await sql`
    INSERT INTO task_assignees (task_id, user_id)
    SELECT id, ${user} FROM tasks WHERE project_id = ${project} AND title LIKE ${STRESS_TAG + "%"}
    ON CONFLICT DO NOTHING`;

  // Notificaciones (50% leídas) — 1 statement.
  await sql`
    INSERT INTO notifications (user_id, type, payload, read_at, created_at)
    SELECT ${user}, 'task_assigned',
      jsonb_build_object('title', ${STRESS_TAG} || ' notif ' || g),
      CASE WHEN random() < 0.5 THEN now() ELSE NULL END,
      now() - (g || ' minutes')::interval
    FROM generate_series(1, ${nNotifs}) g`;

  const [{ t }] = await sql`SELECT count(*)::int t FROM tasks WHERE project_id=${project} AND title LIKE ${STRESS_TAG + "%"}`;
  const [{ n }] = await sql`SELECT count(*)::int n FROM notifications WHERE user_id=${user} AND payload->>'title' LIKE ${STRESS_TAG + "%"}`;
  console.log(`✓ Seed listo. Tareas sintéticas: ${t} · Notifs sintéticas: ${n}`);
}

// ─── Modo: run ────────────────────────────────────────────────────────────────
const HOT_QUERIES = {
  // Polling de notificaciones (cada 30s × usuarios) — conteo unread.
  unreadCount: (u) =>
    sql`SELECT count(*)::int FROM notifications WHERE user_id=${u} AND read_at IS NULL`,
  // Lista de notificaciones (campana / página).
  listNotifs: (u) =>
    sql`SELECT id, type, payload, read_at, created_at FROM notifications WHERE user_id=${u} ORDER BY created_at DESC LIMIT 50`,
  // "Mis tareas" — join task_assignees → tasks → projects.
  myTasks: (u, _p, w) =>
    sql`SELECT t.id, t.title, t.status, t.due_date FROM tasks t
        JOIN task_assignees ta ON ta.task_id = t.id
        JOIN projects pr ON pr.id = t.project_id
        WHERE ta.user_id=${u} AND pr.workspace_id=${w} AND t.status <> 'done'
        ORDER BY t.due_date ASC NULLS LAST LIMIT 100`,
  // Board del proyecto — SIN LIMIT en la app (hot path de saturación).
  projectBoard: (_u, p) =>
    sql`SELECT t.id, t.title, t.status, t.priority, t.due_date
        FROM tasks t WHERE t.project_id=${p} AND t.parent_task_id IS NULL
        ORDER BY t.position`,
  // Agregado de ventas ERP (reports / operations).
  salesAgg: (_u, _p, w) =>
    sql`SELECT category, sum(qty::numeric * unit_price::numeric) total
        FROM erp_sales WHERE workspace_id=${w} GROUP BY category`,
};

async function runLoad() {
  const user = flag("user");
  const project = flag("project");
  const ws = flag("ws");
  const concurrency = parseInt(flag("concurrency", "10"), 10);
  const iterations = parseInt(flag("iterations", "500"), 10);
  if (!user || !project || !ws) {
    console.error("✗ run requiere --user --project --ws (ver: node scripts/stress-test.mjs ids)");
    process.exit(1);
  }

  const names = Object.keys(HOT_QUERIES);
  const stats = Object.fromEntries(names.map((n) => [n, { lat: [], err: 0 }]));
  let done = 0;
  const t0 = Date.now();

  async function worker() {
    while (done < iterations) {
      done++;
      const name = names[Math.floor(Math.random() * names.length)];
      const start = performance.now();
      try {
        await HOT_QUERIES[name](user, project, ws);
        stats[name].lat.push(performance.now() - start);
      } catch (e) {
        stats[name].err++;
      }
    }
  }

  console.log(
    `Corriendo ${iterations} queries @ concurrency=${concurrency} contra ${names.length} hot paths…`
  );
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsed = (Date.now() - t0) / 1000;

  console.log(`\n── Resultados (${elapsed.toFixed(1)}s, ${(iterations / elapsed).toFixed(0)} q/s) ──`);
  console.log(
    "query".padEnd(14),
    "n".padStart(6),
    "p50".padStart(9),
    "p95".padStart(9),
    "p99".padStart(9),
    "max".padStart(9),
    "err".padStart(5)
  );
  for (const name of names) {
    const s = stats[name];
    const sorted = s.lat.slice().sort((a, b) => a - b);
    console.log(
      name.padEnd(14),
      String(sorted.length).padStart(6),
      ms(pct(sorted, 50)).padStart(9),
      ms(pct(sorted, 95)).padStart(9),
      ms(pct(sorted, 99)).padStart(9),
      ms(sorted[sorted.length - 1] ?? 0).padStart(9),
      String(s.err).padStart(5)
    );
  }
  console.log(
    "\nNota: neon-http abre 1 request HTTPS por query (sin pool). Bajo concurrencia alta,\n" +
      "la latencia incluye el round-trip — es el techo real de saturación a observar."
  );
}

// ─── Modo: cleanup ──────────────────────────────────────────────────────────
async function runCleanup() {
  const a = await sql`DELETE FROM tasks WHERE title LIKE ${STRESS_TAG + "%"}`;
  const b = await sql`DELETE FROM notifications WHERE payload->>'title' LIKE ${STRESS_TAG + "%"}`;
  // task_assignees se borra en cascada con las tareas.
  console.log(`✓ Cleanup: ${a.rowCount ?? "?"} tareas, ${b.rowCount ?? "?"} notifs borradas.`);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
const run = { ids: runIds, seed: runSeed, run: runLoad, cleanup: runCleanup }[mode];
if (!run) {
  console.error("Modo inválido. Usá: ids | seed | run | cleanup");
  process.exit(1);
}
run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e.message);
    process.exit(1);
  });
