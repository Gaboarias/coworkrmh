import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import {
  getProductById,
  listProductCostHistory,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { History } from "lucide-react";
import { ProductCostEditor } from "@/components/operations/products/ProductCostEditor";

interface PageProps {
  params: { bucketId: string; productId: string };
}

function money(n: number, currency: string) {
  return `${currency === "USD" ? "$" : "₡"}${n.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function ProductCostsPage({ params }: PageProps) {
  const { bucketId, productId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

  const productRes = await getProductById(productId);
  if (!productRes.success) notFound();
  const product = productRes.data;

  const historyRes = await listProductCostHistory(productId);
  const history = historyRes.success ? historyRes.data : [];

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <Link
        href={`/operations/${bucketId}/products/${productId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        {product.name}
      </Link>
      <PageHeader
        title="Costos"
        description="Edita el costo activo y consulta el historial de cambios"
      />

      <div className="space-y-6">
        <ProductCostEditor product={product} />

        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Historial de cambios
          </h3>
          <Card>
            {history.length === 0 ? (
              <EmptyState
                icon={<History className="h-10 w-10" />}
                title="Sin historial"
                description="Los cambios de costo aparecerán aquí."
              />
            ) : (
              <div className="divide-y divide-border">
                {history.map((h) => (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text">
                        Materiales {money(h.materialsCost, product.currency)}
                        {"  ·  "}
                        Mano de obra {money(h.laborCost, product.currency)}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {new Date(h.changedAt).toLocaleString("es-CR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {h.note && (
                      <p className="mt-1 text-xs text-text-muted">{h.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
