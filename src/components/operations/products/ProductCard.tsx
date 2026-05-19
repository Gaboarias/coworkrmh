import Link from "next/link";
import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProductMarginIndicator } from "./ProductMarginIndicator";
import type { Product } from "@/lib/actions/products-shared";

const STATUS: Record<
  Product["status"],
  { label: string; variant: "success" | "neutral" | "warning" }
> = {
  active: { label: "Activo", variant: "success" },
  archived: { label: "Archivado", variant: "neutral" },
};

export function ProductCard({
  product,
  bucketId,
}: {
  product: Product;
  bucketId: string;
}) {
  const s = STATUS[product.status];
  return (
    <Link href={`/operations/${bucketId}/products/${product.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="space-y-3">
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-el">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-7 w-7 text-text-tertiary" />
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium text-text">
              {product.name}
            </p>
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>
          <ProductMarginIndicator
            basePrice={product.basePrice}
            materialsCost={product.defaultMaterialsCost}
            laborCost={product.defaultLaborCost}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
