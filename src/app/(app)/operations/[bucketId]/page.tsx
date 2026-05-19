import Link from "next/link";
import {
  ChevronLeft,
  Package,
  Calculator,
  TrendingUp,
  Wrench,
  Users,
} from "lucide-react";
import { requireBucketAccess } from "@/lib/access";
import { listProducts } from "@/lib/actions/products";
import { listQuotes } from "@/lib/actions/quotes";
import { listSales } from "@/lib/actions/sales";
import { listExpenses } from "@/lib/actions/expenses";
import { listPaymentsForBucket } from "@/lib/actions/clients";
import { formatMoney } from "@/lib/utils/money";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { Card, CardContent } from "@/components/ui/Card";

export default async function OperationsDashboard({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  const { bucketName } = await requireBucketAccess(bucketId);

  const [prodRes, quoteRes, salesRes, expRes] = await Promise.all([
    listProducts({ bucketId }),
    listQuotes(bucketId),
    listSales(bucketId),
    listExpenses(bucketId),
  ]);
  let pendingPayments = 0;
  try {
    const pays = await listPaymentsForBucket(bucketId);
    pendingPayments = pays.filter(
      (p) => p.status === "pending" || p.status === "overdue"
    ).length;
  } catch {
    pendingPayments = 0;
  }

  const products = prodRes.success ? prodRes.data : [];
  const activeProducts = products.filter((p) => p.status === "active").length;
  const quotes = quoteRes.success ? quoteRes.data : [];
  const sales = salesRes.success
    ? salesRes.data.totals
    : { sales: 0, profit: 0 };
  const margin =
    sales.sales > 0 ? Math.round((sales.profit / sales.sales) * 100) : 0;
  const exp = expRes.success
    ? expRes.data
    : { totalFixedMonthly: 0, breakEvenSales: 0 };

  const kpis = [
    { label: "Ventas totales", value: formatMoney(sales.sales) },
    {
      label: "Ganancia",
      value: formatMoney(sales.profit),
      sub: `${margin}% margen`,
    },
    {
      label: "Punto de equilibrio",
      value: formatMoney(exp.breakEvenSales),
      sub: `gastos fijos ${formatMoney(exp.totalFixedMonthly)}`,
    },
    { label: "Productos activos", value: String(activeProducts) },
    { label: "Cotizaciones", value: String(quotes.length) },
    {
      label: "Cobros pendientes",
      value: String(pendingPayments),
    },
  ];

  const modules = [
    {
      href: `/operations/${bucketId}/products`,
      label: "Catálogo",
      desc: "Productos, categorías y costos",
      icon: Package,
    },
    {
      href: `/operations/${bucketId}/quotes`,
      label: "Cotizador",
      desc: "Cotizaciones con IVA",
      icon: Calculator,
    },
    {
      href: `/operations/${bucketId}/sales`,
      label: "Ventas",
      desc: "Registro y resumen por categoría",
      icon: TrendingUp,
    },
    {
      href: `/operations/${bucketId}/expenses`,
      label: "Gastos",
      desc: "Inversión, fijos y equilibrio",
      icon: Wrench,
    },
    {
      href: `/operations/${bucketId}/clients`,
      label: "Clientes",
      desc: "Clientes y cobros",
      icon: Users,
    },
  ];

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/operations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Operaciones
      </Link>
      <OperationsTabs bucketId={bucketId} />
      <PageHeader
        title={bucketName}
        description="Resumen del negocio"
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent>
              <p className="text-xs text-text-muted">{k.label}</p>
              <p className="mt-1 text-xl font-semibold text-text">
                {k.value}
              </p>
              {k.sub && (
                <p className="mt-0.5 text-xs text-text-tertiary">{k.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
                  <p className="truncate text-xs text-text-muted">
                    {m.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
