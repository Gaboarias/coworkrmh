"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Users } from "lucide-react";
import type { WorkspaceReport } from "@/lib/actions/reports";
import { formatMoney } from "@/lib/utils/money";

interface Props {
  report: WorkspaceReport;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "Por hacer",
  in_progress: "En curso",
  review: "Revisión",
  done: "Listo",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "#b39c84",
  in_progress: "#ffb347",
  review: "#ff6b6b",
  done: "#ff3d8b",
};

const PIE_COLORS = ["#ffb347", "#ff6b6b", "#ff3d8b", "#a78bfa", "#34d399"];

export function ReportsView({ report }: Props) {
  const { kpis } = report;

  // Stat strip: stats agrupados en un único container con divisores
  // verticales (en vez de cards individuales con glow/gradient). Más
  // denso, más legible, más Linear/Stripe.
  const operationalStats = [
    { label: "Proyectos activos", value: kpis.activeProjects },
    { label: "Tareas en curso", value: kpis.activeTasks },
    { label: "Completadas (30d)", value: kpis.completedTasksLast30Days },
    { label: "Cotizaciones abiertas", value: kpis.pendingQuotes },
  ];
  const financialStats = [
    { label: "Ventas (30d)", value: formatMoney(kpis.salesLast30Days) },
    { label: "Gastos (30d)", value: formatMoney(kpis.expensesLast30Days) },
    {
      label: "Neto (30d)",
      value: formatMoney(kpis.netLast30Days),
      accent: kpis.netLast30Days >= 0 ? "coral" : "danger",
    },
  ];

  return (
    <div className="space-y-8">
      <StatStrip stats={operationalStats} />
      <StatStrip stats={financialStats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Tareas por estado">
          {report.tasksByStatus.length === 0 ? (
            <Empty label="Sin tareas aún." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={report.tasksByStatus.map((r) => ({
                  status: STATUS_LABELS[r.status] ?? r.status,
                  count: r.count,
                  fill: STATUS_COLORS[r.status] ?? "#b39c84",
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="status"
                  stroke="var(--text-tertiary)"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "rgba(15,8,12,0.92)",
                    border: "1px solid rgba(255,220,200,0.18)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {report.tasksByStatus.map((r, i) => (
                    <Cell key={i} fill={STATUS_COLORS[r.status] ?? "#b39c84"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Ventas por categoría (30d)">
          {report.salesByCategory.length === 0 ? (
            <Empty label="Sin ventas en los últimos 30 días." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={report.salesByCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={82}
                  paddingAngle={2}
                  stroke="none"
                >
                  {report.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,8,12,0.92)",
                    border: "1px solid rgba(255,220,200,0.18)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                  formatter={(value) =>
                    formatMoney(typeof value === "number" ? value : Number(value))
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      <Section title="Top colaboradores (30d)">
        {report.topContributors.length === 0 ? (
          <Empty label="Sin tareas completadas con asignación." />
        ) : (
          <ul className="divide-y divide-border">
            {report.topContributors.map((c, i) => (
              <li
                key={c.userId}
                className="flex items-center gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="w-5 text-right text-xs tabular-nums text-text-tertiary">
                  {i + 1}
                </span>
                <Users className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <span className="flex-1 truncate text-sm text-text">
                  {c.name ?? "Sin nombre"}
                </span>
                <span className="text-sm font-medium tabular-nums text-text">
                  {c.completedTasks}
                  <span className="ml-1 text-xs text-text-tertiary">
                    tareas
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ── Stat strip ────────────────────────────────────────────────────────
// Stats horizontales en un container único con divisores verticales.
// Sin glass, sin glow, sin gradient. Sólo tipografía + un single accent
// donde la semántica lo justifica (ej. neto positivo/negativo).

interface Stat {
  label: string;
  value: string | number;
  accent?: "coral" | "danger";
}

function StatStrip({ stats }: { stats: Stat[] }) {
  // Grid auto-fit a la cantidad: 2 columnas en mobile, len-columnas en sm+
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
    6: "sm:grid-cols-6",
  }[stats.length] ?? "sm:grid-cols-4";

  return (
    <dl
      className={`grid grid-cols-2 divide-y divide-border sm:divide-y-0 sm:divide-x rounded-lg border border-border bg-surface ${cols}`}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1.5 px-5 py-4">
          <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
            {s.label}
          </dt>
          <dd
            className="text-[28px] font-medium tabular-nums leading-none text-text"
            style={
              s.accent === "coral"
                ? { color: "var(--coral)" }
                : s.accent === "danger"
                  ? { color: "var(--danger)" }
                  : undefined
            }
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── Section ───────────────────────────────────────────────────────────
// Contenedor genérico para charts y listas. Un solo borde, sin glass.

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface px-5 py-4">
      <h2 className="mb-4 text-sm font-semibold text-text">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="py-10 text-center text-sm text-text-tertiary">{label}</p>
  );
}
