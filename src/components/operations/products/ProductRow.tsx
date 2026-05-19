import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ProductMarginIndicator } from "./ProductMarginIndicator";
import type { Product } from "@/lib/actions/products-shared";
import { formatMoney as money } from "@/lib/utils/money";

const STATUS: Record<
  Product["status"],
  { label: string; variant: "success" | "neutral" | "warning" }
> = {
  active: { label: "Activo", variant: "success" },
  archived: { label: "Archivado", variant: "neutral" },
};

export function ProductRow({
  product,
  bucketId,
  categoryName,
}: {
  product: Product;
  bucketId: string;
  categoryName: string | null;
}) {
  const s = STATUS[product.status];
  return (
    <Link
      href={`/operations/${bucketId}/products/${product.id}`}
      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-el"
    >
      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-border bg-surface-el">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {product.name}
        </p>
        <p className="truncate text-xs text-text-muted">
          {product.sku ? `${product.sku} · ` : ""}
          {categoryName ?? "Sin categoría"}
        </p>
      </div>
      <ProductMarginIndicator
        basePrice={product.basePrice}
        materialsCost={product.defaultMaterialsCost}
        laborCost={product.defaultLaborCost}
        className="hidden sm:inline-flex"
      />
      <span className="hidden w-28 text-right text-sm text-text md:block">
        {money(product.basePrice, product.currency)}
      </span>
      <Badge variant={s.variant}>{s.label}</Badge>
    </Link>
  );
}
