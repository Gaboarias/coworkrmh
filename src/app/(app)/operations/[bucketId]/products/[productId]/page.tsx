import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, History } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import {
  getProductById,
  listProductCategories,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/components/operations/products/ProductForm";
import { ProductArchiveButton } from "@/components/operations/products/ProductArchiveButton";

interface PageProps {
  params: { bucketId: string; productId: string };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { bucketId, productId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

  const productRes = await getProductById(productId);
  if (!productRes.success) notFound();
  const product = productRes.data;

  const categoriesRes = await listProductCategories(bucketId);
  const categories = categoriesRes.success ? categoriesRes.data : [];

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <Link
        href={`/operations/${bucketId}/products`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Productos
      </Link>
      <PageHeader
        title={product.name}
        actions={
          <>
            <Link
              href={`/operations/${bucketId}/products/${productId}/costs`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-text transition-colors duration-200 ease-out hover:bg-surface-el"
            >
              <History className="h-4 w-4" />
              Historial de costos
            </Link>
            <ProductArchiveButton product={product} />
          </>
        }
      />
      <ProductForm
        bucketId={bucketId}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        product={product}
      />
    </div>
  );
}
