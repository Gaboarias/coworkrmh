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
import { HairlineRule } from "@/components/shared/HairlineRule";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Operations dashboard (Edition 04).
 *
 * Layout:
 *   - PageHeader drop-line "Operaciones," "del estudio"
 *   - OperationsNav (tabs)
 *   - KPI grid 6 columnas tipografía pura
 *   - Asymmetric: módulos como lista (no card grid)
 */
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

  const monthShort = format(new Date(), "MMM yyyy", { locale: es }).toUpperCase();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations · resumen"
        title="Operaciones,"
        subtitle="del estudio."
        issueLines={[
          `Ed. 04 · ${monthShort}`,
          `${kpis.length} KPIs · ${modules.length} módulos`,
        ]}
      />

      {/* KPIs como objetos tipográficos */}
      <section>
        <HairlineRule label="Resumen del estudio" />
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-2">
              <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                {k.label}
              </dt>
              <dd className="text-[34px] font-bold tabular-nums leading-none tracking-[-0.035em] text-ink">
                {k.value}
              </dd>
              {k.sub && (
                <span className="text-[13px] italic text-ink-soft">
                  {k.sub}
                </span>
              )}
            </div>
          ))}
        </dl>
      </section>

      {isEmpty && (
        <section className="mt-10 flex flex-wrap items-center justify-between gap-4 border-l-2 border-urgent pl-4">
          <p className="max-w-[60ch] text-[16px] text-ink-soft">
            Este entorno está vacío. Empezá cargando productos en el catálogo
            para ver costos, márgenes y el resto.
          </p>
          <Link
            href="/operations/catalogo"
            className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink transition-colors hover:text-urgent"
          >
            Ir al catálogo →
          </Link>
        </section>
      )}

      {/* Módulos — lista (NO card grid genérico) */}
      <section className="mt-12">
        <HairlineRule label="Módulos" count={`${modules.length}`} />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="row-hover -mx-3 flex items-center gap-3 rounded-md px-3 py-3"
              >
                <m.icon
                  className="h-4 w-4 flex-shrink-0 text-ink-faint"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold text-ink">
                    {m.label}
                  </p>
                  <p className="truncate text-[14px] text-ink-soft">
                    {m.desc}
                  </p>
                </div>
                <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
