"use client";

import {
  BarChart3,
  CheckCircle2,
  FolderKanban,
  TrendingUp,
  Receipt,
  Wallet,
  Users,
} from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* KPIs grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Proyectos activos"
          value={kpis.activeProjects.toString()}
          icon={<FolderKanban className="h-4 w-4" />}
          accent="amber"
        />
        <Kpi
          label="Tareas en curso"
          value={kpis.activeTasks.toString()}
          icon={<BarChart3 className="h-4 w-4" />}
          accent="coral"
        />
        <Kpi
          label="Completadas (30d)"
          value={kpis.completedTasksLast30Days.toString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="magenta"
        />
        <Kpi
          label="Cotizaciones abiertas"
          value={kpis.pendingQuotes.toString()}
          icon={<Receipt className="h-4 w-4" />}
          accent="violet"
        />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Ventas (30d)"
          value={formatMoney(kpis.salesLast30Days)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
          large
        />
        <Kpi
          label="Gastos (30d)"
          value={formatMoney(kpis.expensesLast30Days)}
          icon={<Wallet className="h-4 w-4" />}
          accent="coral"
          large
        />
        <Kpi
          label="Neto (30d)"
          value={formatMoney(kpis.netLast30Days)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent={kpis.netLast30Days >= 0 ? "magenta" : "danger"}
          large
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Tareas por estado">
          {report.tasksByStatus.length === 0 ? (
            <Empty label="Sin tareas aún." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={report.tasksByStatus.map((r) => ({
                  status: STATUS_LABELS[r.status] ?? r.status,
                  count: r.count,
                  fill: STATUS_COLORS[r.status] ?? "#b39c84",
                }))}
              >
                <XAxis
                  dataKey="status"
                  stroke="var(--text-tertiary)"
                  style={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  style={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,.7)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    backdropFilter: "blur(20px)",
                    color: "var(--text)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {report.tasksByStatus.map((r, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[r.status] ?? "#b39c84"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Ventas por categoría (30d)">
          {report.salesByCategory.length === 0 ? (
            <Empty label="Sin ventas en los últimos 30 días." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.salesByCategory}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {report.salesByCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,.7)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    backdropFilter: "blur(20px)",
                    color: "var(--text)",
                    fontSize: 12,
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
        </Card>
      </div>

      {/* Top contributors */}
      <Card title="Top colaboradores (30d)">
        {report.topContributors.length === 0 ? (
          <Empty label="Sin tareas completadas con asignación." />
        ) : (
          <ul className="divide-y divide-border">
            {report.topContributors.map((c, i) => (
              <li
                key={c.userId}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--coral)_20%,transparent)] text-xs font-semibold text-coral">
                  {i + 1}
                </span>
                <Users className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                <span className="flex-1 truncate text-sm text-text">
                  {c.name ?? "Sin nombre"}
                </span>
                <span className="text-sm font-semibold tabular-nums text-coral">
                  {c.completedTasks}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
  large,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "amber" | "coral" | "magenta" | "violet" | "danger";
  large?: boolean;
}) {
  const accentMap: Record<string, string> = {
    amber: "var(--amber)",
    coral: "var(--coral)",
    magenta: "var(--magenta)",
    violet: "#a78bfa",
    danger: "var(--danger)",
  };
  const accentRgb: Record<string, string> = {
    amber: "255, 179, 71",
    coral: "255, 107, 107",
    magenta: "255, 61, 139",
    violet: "167, 139, 250",
    danger: "255, 77, 109",
  };
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border-strong bg-surface p-4 transition-colors hover:border-[color-mix(in_oklab,var(--coral)_45%,var(--border))]"
      style={{
        // Sutil glow del color del KPI en la esquina superior derecha
        backgroundImage: `radial-gradient(circle at 100% 0%, rgba(${accentRgb[accent]}, 0.12) 0%, transparent 55%)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
          {label}
        </span>
        {/* Icon backplate con tint del accent */}
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            background: `rgba(${accentRgb[accent]}, 0.16)`,
            color: accentMap[accent],
            boxShadow: `0 0 12px rgba(${accentRgb[accent]}, 0.22)`,
          }}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 font-bold tabular-nums leading-none ${large ? "text-[28px]" : "text-[32px]"}`}
        style={{
          color: accentMap[accent],
          textShadow: `0 0 16px rgba(${accentRgb[accent]}, 0.35)`,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-text">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="py-10 text-center text-sm text-text-muted">{label}</p>
  );
}
