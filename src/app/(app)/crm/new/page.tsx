"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClientRecord } from "@/lib/actions/clients";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
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
    if (!form.company_name.trim()) return;
    setLoading(true);
    try {
      const client = await createClientRecord({
        company_name: form.company_name,
        contact_name: form.contact_name || undefined,
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

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      <Link
        href="/crm"
        className="mb-4 flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>
      <PageHeader title="Nuevo cliente" />

      <div className="rounded-xl border border-border bg-surface p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Empresa / Razón social *
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              required
              autoFocus
              className={inputClass}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Contacto principal
              </label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => set("contact_name", e.target.value)}
                className={inputClass}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Estado
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
              >
                <option value="active">Activo</option>
                <option value="prospect">Prospecto</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Correo
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
                placeholder="email@empresa.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-muted">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Dirección
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className={inputClass}
              placeholder="Dirección del cliente"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Notas sobre el cliente..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/crm"
              className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm text-text-muted hover:bg-surface-el"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || !form.company_name.trim()}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
