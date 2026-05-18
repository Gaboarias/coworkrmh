import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import { listProductCategories } from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/components/operations/products/ProductForm";

interface PageProps {
  params: { bucketId: string };
}

export default async function NewProductPage({ params }: PageProps) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

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
      <PageHeader title="Nuevo producto" />
      <ProductForm
        bucketId={bucketId}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
