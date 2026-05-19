"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/shared/EmptyState";
import { Package } from "lucide-react";
import { ProductRow } from "./ProductRow";
import { listProducts } from "@/lib/actions/products";
import type { Product } from "@/lib/actions/products-shared";

interface Category {
  id: string;
  name: string;
}

interface Props {
  bucketId: string;
  initialProducts: Product[];
  categories: Category[];
}

export function ProductList({ bucketId, initialProducts, categories }: Props) {
  const [items, setItems] = useState<Product[]>(initialProducts);
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? null;

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await listProducts({
        bucketId,
        status: (status || undefined) as Product["status"] | undefined,
        categoryId: categoryId || undefined,
        search: search || undefined,
      });
      if (res.success) setItems(res.data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [bucketId, status, categoryId, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU…"
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="archived">Archivado</option>
        </Select>
        <Select
          aria-label="Filtrar por categoría"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-auto"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10" />}
            title={loading ? "Cargando…" : "Sin productos"}
            description="Crea el primer producto de este negocio."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                bucketId={bucketId}
                categoryName={catName(p.categoryId)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
