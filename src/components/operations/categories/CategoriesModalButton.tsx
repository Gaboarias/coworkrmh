"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CategoryList } from "./CategoryList";
import type { ProductCategory } from "@/lib/actions/products-shared";

export function CategoriesModalButton({
  bucketId,
  categories,
}: {
  bucketId: string;
  categories: ProductCategory[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-text transition-colors duration-200 ease-out hover:bg-surface-el"
      >
        <Tags className="h-4 w-4" />
        Categorías
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Categorías"
        description="Organiza los productos de este negocio"
        size="lg"
      >
        <CategoryList bucketId={bucketId} categories={categories} />
      </Modal>
    </>
  );
}
