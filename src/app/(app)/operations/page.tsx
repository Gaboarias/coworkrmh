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

      {/* Stat strip — sin cards individuales, divisores finos, tipografía pura */}
      <dl className="mb-8 grid grid-cols-2 divide-y divide-border rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1.5 px-5 py-4">
            <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-text-tertiary">
              {k.label}
            </dt>
            <dd className="text-[24px] font-medium leading-none tabular-nums text-text">
              {k.value}
            </dd>
            {k.sub && (
              <p className="text-[11px] text-text-tertiary">{k.sub}</p>
            )}
          </div>
        ))}
      </dl>

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
