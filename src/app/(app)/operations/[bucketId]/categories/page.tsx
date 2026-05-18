import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import {
  listProductCategories,
  getBucketName,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/shared/PageHeader";
import { CategoryList } from "@/components/operations/categories/CategoryList";

interface PageProps {
  params: { bucketId: string };
}

export default async function CategoriesPage({ params }: PageProps) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

  const [categoriesRes, bucketName] = await Promise.all([
    listProductCategories(bucketId),
    getBucketName(bucketId),
  ]);
  const categories = categoriesRes.success ? categoriesRes.data : [];

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <Link
        href={`/operations/${bucketId}/products`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        {bucketName ?? "Productos"}
      </Link>
      <PageHeader
        title="Categorías"
        description="Organiza los productos de este negocio"
      />
      <CategoryList bucketId={bucketId} categories={categories} />
    </div>
  );
}
