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
import type { WorkspaceReport } from "@/lib/actions/reports";
import { formatMoney } from "@/lib/utils/money";
import { HairlineRule } from "@/components/shared/HairlineRule";

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
  todo: "var(--ink-faint)",
  in_progress: "var(--info)",
  review: "var(--warn)",
  done: "var(--done)",
};

// Paleta de proyectos cuando no tienen color asignado o queremos
// distinguir series en pie charts.
const PIE_COLORS = [
  "#d63a1f",
  "#1f7a4d",
  "#e89a0d",
  "#2e52d9",
  "#7a3aa0",
  "#3a8a8a",
];

/**
 * ReportsView (Edition 04).
 *
 * Estructura:
 *   1. KPI table — 4 columnas, numerales 44px, sin cards.
 *   2. Asymmetric grid:
 *      LEFT — Por proyecto (lista con color dots).
 *      RIGHT — Tareas por estado (chart neutral con colores semánticos).
 *   3. Ventas por categoría (pie) + Top colaboradores (bar list).
 */
export function ReportsView({ report }: Props) {
  const { kpis } = report;

  return (
    <div className="mt-2 space-y-12">
      {/* ── KPI Table ──────────────────────────────────────────── */}
      <section>
        <HairlineRule label="Resumen del mes" count={`/ ${kpis.activeProjects}p`} />
        <dl className="mt-6 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2 md:grid-cols-4">
          <Kpi
            label="Proyectos"
            value={String(kpis.activeProjects)}
            sub={`${kpis.activeTasks} tareas activas`}
          />
          <Kpi
            label="Ventas (30d)"
            value={formatMoney(kpis.salesLast30Days)}
            sub={`${kpis.completedTasksLast30Days} tareas completadas`}
          />
          <Kpi
            label="Gastos (30d)"
            value={formatMoney(kpis.expensesLast30Days)}
            sub={`${kpis.pendingQuotes} cotizaciones abiertas`}
          />
          <Kpi
            label="Neto (30d)"
            value={formatMoney(kpis.netLast30Days)}
            sub={kpis.netLast30Days >= 0 ? "positivo" : "negativo"}
            accent={kpis.netLast30Days >= 0 ? "done" : "urgent"}
          />
        </dl>
      </section>

      {/* ── Asymmetric: Por proyecto + Tareas por estado ─────── */}
      <section className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div>
          <HairlineRule label="Ventas por categoría" count={`${report.salesByCategory.length}`} />
          {report.salesByCategory.length === 0 ? (
            <p className="mt-4 text-sm italic text-ink-faint">
              Sin ventas en los últimos 30 días.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220} className="!mt-6">
              <PieChart>
                <Pie
                  data={report.salesByCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={2}
                  stroke="none"
                >
                  {report.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-el)",
                    border: "1px solid var(--rule-strong)",
                    borderRadius: "4px",
                    color: "var(--ink)",
                    fontSize: 11,
                    fontFamily: "Satoshi, sans-serif",
                    padding: "6px 10px",
                  }}
                  formatter={(value) =>
                    formatMoney(
                      typeof value === "number" ? value : Number(value)
                    )
                  }
                />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    color: "var(--ink-soft)",
                    fontFamily: "Satoshi, sans-serif",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <HairlineRule
            label="Tareas por estado"
            count={`${report.tasksByStatus.reduce((a, r) => a + r.count, 0)} totales`}
          />
          {report.tasksByStatus.length === 0 ? (
            <p className="mt-4 text-sm italic text-ink-faint">
              Sin tareas aún.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220} className="!mt-6">
              <BarChart
                data={report.tasksByStatus.map((r) => ({
                  status: STATUS_LABELS[r.status] ?? r.status,
                  count: r.count,
                  fill: STATUS_COLORS[r.status] ?? "var(--ink-faint)",
                }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="status"
                  stroke="var(--ink-faint)"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 11, fontFamily: "Satoshi, sans-serif" }}
                />
                <YAxis
                  stroke="var(--ink-faint)"
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: 11, fontFamily: "Satoshi, sans-serif" }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)" }}
                  contentStyle={{
                    background: "var(--surface-el)",
                    border: "1px solid var(--rule-strong)",
                    borderRadius: "4px",
                    color: "var(--ink)",
                    fontSize: 12,
                    fontFamily: "Satoshi, sans-serif",
                    padding: "6px 10px",
                  }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {report.tasksByStatus.map((r, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[r.status] ?? "var(--ink-faint)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Top colaboradores ─────────────────────────────────── */}
      <section>
        <HairlineRule
          label="Top colaboradores (30d)"
          count={`${report.topContributors.length}`}
        />
        {report.topContributors.length === 0 ? (
          <p className="mt-4 text-sm italic text-ink-faint">
            Sin tareas completadas con asignación.
          </p>
        ) : (
          <ul className="h-list mt-4 max-w-2xl">
            {report.topContributors.map((c, i) => (
              <li key={c.userId} className="h-list-item">
                <span className="h-list-item-n">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-[16px] font-medium text-ink">
                  {c.name ?? "Sin nombre"}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-ink-soft">
                  {c.completedTasks}
                  <span className="ml-1 uppercase tracking-[0.1em] text-ink-faint">
                    tareas
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── KPI atom ────────────────────────────────────────────────────
// Numeral grande, label mono small-caps, sub-text body soft.
// Sin card, sin glow. La tipografía es el objeto.

interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "done" | "urgent" | "info" | "warn";
}

function Kpi({ label, value, sub, accent }: KpiProps) {
  const numColor =
    accent === "done"
      ? "text-done"
      : accent === "urgent"
        ? "text-urgent"
        : accent === "info"
          ? "text-info"
          : accent === "warn"
            ? "text-warn"
            : "text-ink";
  return (
    <div className="flex flex-col gap-2">
      <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </dt>
      <dd
        className={
          "text-[56px] font-bold tabular-nums leading-none tracking-[-0.04em] " +
          numColor
        }
      >
        {value}
      </dd>
      {sub && (
        <span className="text-[14px] italic text-ink-soft">{sub}</span>
      )}
    </div>
  );
}
