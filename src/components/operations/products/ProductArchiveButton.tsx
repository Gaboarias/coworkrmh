"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/actions/products-shared";

export function ProductArchiveButton({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isArchived = product.status === "archived";

  async function toggle() {
    setBusy(true);
    const res = isArchived
      ? await restoreProduct(product.id)
      : await archiveProduct(product.id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(isArchived ? "Producto restaurado" : "Producto archivado");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={isArchived ? "outline" : "ghost"}
      loading={busy}
      onClick={toggle}
    >
      {isArchived ? (
        <>
          <RotateCcw className="h-4 w-4" />
          Restaurar
        </>
      ) : (
        <>
          <Archive className="h-4 w-4" />
          Archivar
        </>
      )}
    </Button>
  );
}
