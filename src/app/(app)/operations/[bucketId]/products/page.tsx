import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { requireBucketAccess } from "@/lib/access";
import {
  listProducts,
  listProductCategories,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductList } from "@/components/operations/products/ProductList";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { CategoriesModalButton } from "@/components/operations/categories/CategoriesModalButton";

interface PageProps {
  params: { bucketId: string };
}

export default async function ProductsPage({ params }: PageProps) {
  const { bucketId } = params;
  const { bucketName } = await requireBucketAccess(bucketId);

  const [productsRes, categoriesRes] = await Promise.all([
    listProducts({ bucketId }),
    listProductCategories(bucketId),
  ]);

  const products = productsRes.success ? productsRes.data : [];
  const categories = categoriesRes.success ? categoriesRes.data : [];

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
        title={bucketName || "Productos"}
        description="Catálogo de productos del negocio"
        actions={
          <>
            <CategoriesModalButton
              bucketId={bucketId}
              categories={categories}
            />
            <Link
              href={`/operations/${bucketId}/products/new`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-elev-1 transition-[background-color] duration-200 ease-out hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Link>
          </>
        }
      />

      <ProductList
        bucketId={bucketId}
        initialProducts={products}
        categories={categories}
      />
    </div>
  );
}
