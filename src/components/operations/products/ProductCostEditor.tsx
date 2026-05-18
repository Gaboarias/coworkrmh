"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ProductMarginIndicator } from "./ProductMarginIndicator";
import { updateProductCosts } from "@/lib/actions/products";
import type { Product } from "@/lib/actions/products-shared";

export function ProductCostEditor({ product }: { product: Product }) {
  const router = useRouter();
  const [materials, setMaterials] = useState(product.defaultMaterialsCost);
  const [labor, setLabor] = useState(product.defaultLaborCost);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await updateProductCosts({
      id: product.id,
      materialsCost: Number(materials) || 0,
      laborCost: Number(labor) || 0,
      note: note || undefined,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Costos actualizados y registrados");
    setNote("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ce-mat"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Costo materiales
            </label>
            <Input
              id="ce-mat"
              type="number"
              step="0.01"
              min="0"
              value={materials}
              onChange={(e) => setMaterials(Number(e.target.value))}
            />
          </div>
          <div>
            <label
              htmlFor="ce-lab"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Costo mano de obra
            </label>
            <Input
              id="ce-lab"
              type="number"
              step="0.01"
              min="0"
              value={labor}
              onChange={(e) => setLabor(Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="ce-note"
            className="mb-1.5 block text-sm font-medium text-text-muted"
          >
            Nota del cambio (opcional)
          </label>
          <Textarea
            id="ce-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. aumento de proveedor, ajuste de mano de obra…"
          />
        </div>
        <div className="flex items-center justify-between">
          <ProductMarginIndicator
            basePrice={product.basePrice}
            materialsCost={Number(materials) || 0}
            laborCost={Number(labor) || 0}
          />
          <Button onClick={handleSave} loading={saving}>
            Guardar y registrar cambio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
