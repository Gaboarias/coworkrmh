import Link from "next/link";
import {
  Package,
  Calculator,
  TrendingUp,
  Wrench,
  Users,
} from "lucide-react";
import { getActiveWorkspace } from "@/lib/workspace";
import { listProducts } from "@/lib/actions/erpProducts";
import { listSales } from "@/lib/actions/erpSales";
import { listExpenses } from "@/lib/actions/erpExpenses";
import { listQuotes } from "@/lib/actions/erpQuotes";
import { formatMoney } from "@/lib/utils/money";
import { buttonVariants } from "@/components/ui/Button";
import { StatStrip } from "@/components/ui/StatStrip";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { formatDateCR } from "@/lib/utils/datetime";

// Constante de módulo — los módulos de navegación son estáticos.
const OPERATIONS_MODULES = [
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
] as const;

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

  // MM/YYYY en CR (server-side Vercel = UTC; sin TZ podía mostrar el mes
  // siguiente desde las 6pm CR del último día del mes).
  const monthShort = formatDateCR(new Date(), { month: "2-digit", year: "numeric" });

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ operations · resumen"
        title="Operaciones,"
        subtitle="del estudio."
        issueLines={[
          `Ed. 04 · ${monthShort}`,
          `${kpis.length} KPIs · ${OPERATIONS_MODULES.length} módulos`,
        ]}
      />
      <OperationsNav />

      {isEmpty ? (
        /* Entorno vacío: liderar con el llamado a cargar, sin el grid de ceros.
           Callout informativo neutro (sin franja roja: no es un error). */
        <section className="mt-8 flex flex-col gap-4 rounded-lg border border-rule bg-surface-el p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Package
              className="h-5 w-5 flex-shrink-0 text-ink-faint"
              strokeWidth={1.75}
            />
            <div>
              <p className="text-[16px] font-bold text-ink">
                Este entorno está vacío
              </p>
              <p className="mt-1 max-w-[60ch] text-[15px] text-ink-soft">
                Empezá cargando productos en el catálogo para ver costos,
                márgenes, ventas y el resto.
              </p>
            </div>
          </div>
          <Link
            href="/operations/catalogo"
            className={buttonVariants({ className: "flex-shrink-0" })}
          >
            Ir al catálogo →
          </Link>
        </section>
      ) : (
        /* KPIs como objetos tipográficos (figuras ERP all-time). El análisis
           mensual con tendencias y gráficos vive en /reports — fuente única. */
        <section>
          <HairlineRule label="Resumen del estudio" />
          <StatStrip
            items={kpis}
            label="Resumen del estudio"
            className="mt-6 lg:grid-cols-6"
          />
          <Link
            href="/reports"
            className="mt-6 inline-block font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink"
          >
            Ver análisis del mes (tendencias, categorías) →
          </Link>
        </section>
      )}

      {/* Módulos — lista (NO card grid genérico) */}
      <section className="mt-12">
        <HairlineRule label="Módulos" count={`${OPERATIONS_MODULES.length}`} />
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPERATIONS_MODULES.map((m) => (
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
