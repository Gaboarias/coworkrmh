"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClientRecord } from "@/lib/actions/clients";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    status: "active" as "active" | "inactive" | "prospect",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return;
    setLoading(true);
    try {
      const client = await createClientRecord({
        companyName: form.companyName,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        status: form.status,
      });
      toast.success("Cliente creado");
      router.push(`/crm/${client.id}`);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl p-6 md:p-8">
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a clientes
      </Link>
      <PageHeader title="Nuevo cliente" />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="nc-company"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Empresa / Razón social *
              </label>
              <Input
                id="nc-company"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                required
                autoFocus
                placeholder="Nombre de la empresa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nc-contact"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Contacto principal
                </label>
                <Input
                  id="nc-contact"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label
                  htmlFor="nc-status"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Estado
                </label>
                <Select
                  id="nc-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                >
                  <option value="active">Activo</option>
                  <option value="prospect">Prospecto</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nc-email"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Correo
                </label>
                <Input
                  id="nc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="email@empresa.com"
                />
              </div>
              <div>
                <label
                  htmlFor="nc-phone"
                  className="mb-1.5 block text-sm font-medium text-text-muted"
                >
                  Teléfono
                </label>
                <Input
                  id="nc-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="nc-address"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Dirección
              </label>
              <Input
                id="nc-address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Dirección del cliente"
              />
            </div>

            <div>
              <label
                htmlFor="nc-notes"
                className="mb-1.5 block text-sm font-medium text-text-muted"
              >
                Notas internas
              </label>
              <Textarea
                id="nc-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Notas sobre el cliente…"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => router.push("/crm")}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
                disabled={!form.companyName.trim()}
              >
                {loading ? "Creando…" : "Crear cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
