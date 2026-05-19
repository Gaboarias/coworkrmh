"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/utils/money";
import {
  createQuote,
  updateQuote,
  type QuoteRow,
  type QuoteItemInput,
} from "@/lib/actions/erp";

const emptyItem: QuoteItemInput = {
  description: "",
  qty: 1,
  unitCost: 0,
  unitPrice: 0,
};

export const QuoteForm = ({ quote }: { quote?: QuoteRow }) => {
  const router = useRouter();
  const isEdit = !!quote;
  const [title, setTitle] = useState(quote?.title ?? "");
  const [customerName, setCustomerName] = useState(quote?.customerName ?? "");
  const [ivaRate, setIvaRate] = useState(quote?.ivaRate ?? 0.13);
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [items, setItems] = useState<QuoteItemInput[]>(
    quote?.items?.length ? quote.items : [{ ...emptyItem }]
  );
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const productionCost = items.reduce(
      (s, i) => s + i.qty * i.unitCost,
      0
    );
    const netSales = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const grossProfit = netSales - productionCost;
    const ivaAmount = netSales * ivaRate;
    return {
      productionCost,
      netSales,
      grossProfit,
      marginPct: netSales > 0 ? grossProfit / netSales : 0,
      ivaAmount,
      totalWithIva: netSales + ivaAmount,
    };
  }, [items, ivaRate]);

  const setItem = (i: number, patch: Partial<QuoteItemInput>) =>
    setItems((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Falta el título");
      return;
    }
    const clean = items.filter((i) => i.description.trim());
    if (clean.length === 0) {
      toast.error("Agregá al menos un ítem");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        customerName: customerName.trim() || undefined,
        ivaRate,
        notes: notes.trim() || undefined,
        items: clean,
      };
      if (isEdit) await updateQuote(quote!.id, payload);
      else await createQuote(payload);
      toast.success(isEdit ? "Cotización actualizada" : "Cotización creada");
      router.push("/operations/cotizador");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Título *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pedido personalizado…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Cliente
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Ítems</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems((s) => [...s, { ...emptyItem }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Ítem
            </Button>
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_70px_110px_110px_32px]"
            >
              <Input
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                placeholder="Descripción"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={it.qty}
                onChange={(e) =>
                  setItem(i, { qty: Number(e.target.value) || 0 })
                }
                aria-label="Cantidad"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={it.unitCost}
                onChange={(e) =>
                  setItem(i, { unitCost: Number(e.target.value) || 0 })
                }
                aria-label="Costo unitario"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={it.unitPrice}
                onChange={(e) =>
                  setItem(i, { unitPrice: Number(e.target.value) || 0 })
                }
                aria-label="Precio unitario"
              />
              <button
                type="button"
                onClick={() =>
                  setItems((s) => s.filter((_, idx) => idx !== i))
                }
                aria-label="Quitar ítem"
                className="flex h-9 items-center justify-center rounded-md text-text-tertiary hover:bg-surface-el hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <p className="text-xs text-text-tertiary">
            descripción · cantidad · costo unit · precio unit
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-text-muted">
              Tasa IVA
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={ivaRate}
              onChange={(e) => setIvaRate(Number(e.target.value) || 0)}
              className="w-24"
            />
            <span className="text-xs text-text-tertiary">(0.13 = 13%)</span>
          </div>
          <dl className="space-y-1 text-sm">
            {[
              ["Total costo producción", formatMoney(totals.productionCost)],
              ["Total venta (sin IVA)", formatMoney(totals.netSales)],
              ["Ganancia bruta", formatMoney(totals.grossProfit)],
              ["Margen bruto %", `${Math.round(totals.marginPct * 100)}%`],
              ["IVA", formatMoney(totals.ivaAmount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-text-muted">{k}</dt>
                <dd className="text-text">{v}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <dt className="text-text">Total con IVA</dt>
              <dd className="text-primary">
                {formatMoney(totals.totalWithIva)}
              </dd>
            </div>
          </dl>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Notas
            </label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/operations/cotizador")}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={submit} loading={saving}>
              {isEdit ? "Guardar cambios" : "Crear cotización"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
