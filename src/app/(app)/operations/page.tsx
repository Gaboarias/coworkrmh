import Link from "next/link";
import { Package } from "lucide-react";
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
// Desde el módulo de constantes y NO desde OperationsNav: ese archivo es
// `"use client"`, y este es un Server Component. Importar un valor de un módulo
// cliente devuelve una referencia, no el número — se publicó como
// `[object Object]` en el encabezado.
import { OPERATIONS_MODULE_COUNT } from "@/lib/constants/operationsModules";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { formatDateCR } from "@/lib/utils/datetime";

/**
 * Operations dashboard.
 *
 * Layout:
 *   - PageHeader drop-line "Operaciones," "del estudio"
 *   - OperationsNav — la única navegación a los módulos
 *   - Resumen de cifras
 *
 * Acá vivía además una lista "Módulos" con los mismos cinco destinos que ya
 * ofrece OperationsNav unos centímetros más arriba, y de forma permanente en
 * todas las sub-páginas del ERP. Se eliminó: era navegación duplicada y, de
 * paso, la anti-referencia que PRODUCT.md nombra primero — una grilla de
 * tarjetas idénticas con icono + título + texto de apoyo.
 *
 * Las descripciones ("Productos, costos y margen") no se reubicaron. En una
 * herramienta que se aprende una vez y se usa mil, explicar qué es el catálogo
 * en cada visita es ruido, no ayuda.
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
          `${kpis.length} KPIs · ${OPERATIONS_MODULE_COUNT} módulos`,
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
              <p className="text-[14px] font-bold text-ink">
                Este entorno está vacío
              </p>
              <p className="mt-1 max-w-[60ch] text-[13px] text-ink-soft">
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
          {/* Sin `lg:grid-cols-6`: forzaba seis columnas y las cifras de
              dinero no entraban. StatStrip ahora reparte las que quepan. */}
          <StatStrip items={kpis} label="Resumen del estudio" className="mt-6" />
          <Link
            href="/reports"
            className="mt-6 inline-block font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink"
          >
            Ver análisis del mes (tendencias, categorías) →
          </Link>
        </section>
      )}

      {/* La lista "Módulos" vivía acá y se eliminó: repetía exactamente los
          mismos cinco destinos que ya ofrece OperationsNav, tres centímetros
          más arriba y de forma permanente en todas las sub-páginas del ERP.

          Además era, literalmente, la anti-referencia que PRODUCT.md nombra
          primero: una grilla de tarjetas idénticas con icono + título + texto
          de apoyo. Las descripciones ("Productos, costos y margen") no se
          reubicaron: en una herramienta que se aprende una vez y se usa mil,
          explicar el catálogo en cada visita es ruido, no ayuda. */}
    </div>
  );
}
