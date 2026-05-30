import Link from "next/link";
import {
  Package,
  Calculator,
  TrendingUp,
  Wrench,
  Users,
} from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";
import {
  listProducts,
  listSales,
  listExpenses,
  listQuotes,
} from "@/lib/actions/erp";
import { formatMoney } from "@/lib/utils/money";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { Card, CardContent } from "@/components/ui/Card";

export default async function OperationsDashboard() {
  const ws = await getActiveWorkspace();
  if (!ws) return <NoEntorno title="Operaciones" />;

  const [products, sales, expenses, quotes] = await Promise.all([
    listProducts(),
    listSales(),
    listExpenses(),
    listQuotes(),
  ]);

  const margin =
    sales.totals.sales > 0
      ? Math.round((sales.totals.profit / sales.totals.sales) * 100)
      : 0;

  const isEmpty =
    products.length === 0 &&
    quotes.length === 0 &&
    sales.rows.length === 0 &&
    expenses.totalFixed === 0 &&
    expenses.totalInvestment === 0;

  const kpis = [
    { label: "Ventas totales", value: formatMoney(sales.totals.sales) },
    {
      label: "Ganancia",
      value: formatMoney(sales.totals.profit),
      sub: `${margin}% margen`,
    },
    {
      label: "Punto de equilibrio",
      value: formatMoney(expenses.breakEvenSales),
      sub: `fijos ${formatMoney(expenses.totalFixed)}/mes`,
    },
    { label: "Productos", value: String(products.length) },
    { label: "Cotizaciones", value: String(quotes.length) },
    {
      label: "Inversión inicial",
      value: formatMoney(expenses.totalInvestment),
    },
  ];

  const modules = [
    {
      href: "/operations/catalogo",
      label: "Catálogo",
      desc: "Productos, costos y margen",
      icon: Package,
    },
    {
      href: "/operations/cotizador",
      label: "Cotizador",
      desc: "Cotizaciones con IVA",
      icon: Calculator,
    },
    {
      href: "/operations/ventas",
      label: "Ventas",
      desc: "Registro y resumen por categoría",
      icon: TrendingUp,
    },
    {
      href: "/operations/gastos",
      label: "Gastos",
      desc: "Inversión, fijos y equilibrio",
      icon: Wrench,
    },
    {
      href: "/operations/equipo",
      label: "Equipo",
      desc: "Roles, responsabilidades, acuerdos",
      icon: Users,
    },
  ];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title="Resumen"
        description="Vista general del entorno activo"
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map((k, i) => {
          // Cyclar triotone para variedad visual sin perder coherencia
          const accents = [
            { rgb: "255, 179, 71", color: "var(--amber)" },
            { rgb: "255, 107, 107", color: "var(--coral)" },
            { rgb: "255, 61, 139", color: "var(--magenta)" },
          ];
          const a = accents[i % accents.length];
          return (
            <div
              key={k.label}
              className="overflow-hidden rounded-xl border border-border-strong bg-surface p-4 shadow-elev-2"
              style={{
                backgroundImage: `radial-gradient(circle at 100% 0%, rgba(${a.rgb}, 0.12) 0%, transparent 55%)`,
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                {k.label}
              </p>
              <p
                className="mt-2 text-[26px] font-bold leading-none tabular-nums"
                style={{
                  color: a.color,
                  textShadow: `0 0 14px rgba(${a.rgb}, 0.35)`,
                }}
              >
                {k.value}
              </p>
              {k.sub && (
                <p className="mt-1.5 text-[11px] text-text-tertiary">{k.sub}</p>
              )}
            </div>
          );
        })}
      </div>

      {isEmpty && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              Este entorno está vacío. Empezá cargando productos en el
              catálogo para ver costos, márgenes y el resto.
            </p>
            <Link
              href="/operations/catalogo"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color] duration-200 ease-out hover:bg-primary-hover"
            >
              Ir al Catálogo
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <m.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-text">{m.label}</p>
                  <p className="truncate text-xs text-text-muted">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
