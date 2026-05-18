"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProductImageUpload } from "./ProductImageUpload";
import { ProductMarginIndicator } from "./ProductMarginIndicator";
import { createProduct, updateProduct } from "@/lib/actions/products";
import type { Product } from "@/lib/actions/products-shared";

interface Category {
  id: string;
  name: string;
}

interface FormValues {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  currency: "CRC" | "USD";
  status: "active" | "archived" | "out_of_stock";
  basePrice: number;
  defaultMaterialsCost: number;
  defaultLaborCost: number;
  imageUrl: string | null;
}

interface Props {
  bucketId: string;
  categories: Category[];
  product?: Product;
}

export function ProductForm({ bucketId, categories, product }: Props) {
  const router = useRouter();
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      currency: product?.currency ?? "CRC",
      status: product?.status ?? "active",
      basePrice: product?.basePrice ?? 0,
      defaultMaterialsCost: product?.defaultMaterialsCost ?? 0,
      defaultLaborCost: product?.defaultLaborCost ?? 0,
      imageUrl: product?.imageUrl ?? null,
    },
  });

  const currentImage = watch("imageUrl") ?? null;

  const basePrice = Number(watch("basePrice")) || 0;
  const mat = Number(watch("defaultMaterialsCost")) || 0;
  const lab = Number(watch("defaultLaborCost")) || 0;

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      sku: values.sku || undefined,
      categoryId: values.categoryId || null,
      currency: values.currency,
      basePrice: Number(values.basePrice) || 0,
      defaultMaterialsCost: Number(values.defaultMaterialsCost) || 0,
      defaultLaborCost: Number(values.defaultLaborCost) || 0,
      imageUrl: currentImage,
    };

    const result = isEdit
      ? await updateProduct({
          id: product!.id,
          ...payload,
          status: values.status,
        })
      : await createProduct({ bucketId, ...payload });

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Producto actualizado" : "Producto creado");
    router.push(`/operations/${bucketId}/products`);
    router.refresh();
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <ProductImageUpload
            value={currentImage}
            onChange={(url) => setValue("imageUrl", url)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pf-name"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Nombre *
              </label>
              <Input
                id="pf-name"
                {...register("name", { required: true })}
                placeholder="Mesa comedor 4 puestos"
              />
            </div>
            <div>
              <label
                htmlFor="pf-sku"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                SKU
              </label>
              <Input id="pf-sku" {...register("sku")} placeholder="Opcional" />
            </div>
          </div>

          <div>
            <label
              htmlFor="pf-desc"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Descripción
            </label>
            <Textarea
              id="pf-desc"
              rows={3}
              {...register("description")}
              placeholder="Detalle del producto…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="pf-cat"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Categoría
              </label>
              <Select id="pf-cat" {...register("categoryId")}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="pf-cur"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Moneda
              </label>
              <Select id="pf-cur" {...register("currency")}>
                <option value="CRC">CRC (₡)</option>
                <option value="USD">USD ($)</option>
              </Select>
            </div>
            {isEdit && (
              <div>
                <label
                  htmlFor="pf-status"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Estado
                </label>
                <Select id="pf-status" {...register("status")}>
                  <option value="active">Activo</option>
                  <option value="out_of_stock">Sin stock</option>
                  <option value="archived">Archivado</option>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="pf-price"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Precio de venta
              </label>
              <Input
                id="pf-price"
                type="number"
                step="0.01"
                min="0"
                {...register("basePrice", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label
                htmlFor="pf-mat"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Costo materiales
              </label>
              <Input
                id="pf-mat"
                type="number"
                step="0.01"
                min="0"
                {...register("defaultMaterialsCost", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label
                htmlFor="pf-lab"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Costo mano de obra
              </label>
              <Input
                id="pf-lab"
                type="number"
                step="0.01"
                min="0"
                {...register("defaultLaborCost", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <ProductMarginIndicator
              basePrice={basePrice}
              materialsCost={mat}
              laborCost={lab}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  router.push(`/operations/${bucketId}/products`)
                }
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEdit ? "Guardar cambios" : "Crear producto"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
