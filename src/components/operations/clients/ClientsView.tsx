"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/shared/EmptyState";
import { createClientRecord } from "@/lib/actions/clients";

interface ClientItem {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
}

export function ClientsView({
  bucketId,
  clients,
}: {
  bucketId: string;
  clients: ClientItem[];
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Falta el nombre");
      return;
    }
    setSaving(true);
    try {
      await createClientRecord({
        companyName: companyName.trim(),
        contactName: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        bucketId,
      });
      toast.success("Cliente creado");
      setCompanyName("");
      setContactName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-semibold text-text">
            Nuevo cliente
          </h3>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Empresa / nombre *"
            />
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Contacto"
            />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
            />
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-10 w-10" />}
            title="Sin clientes"
            description="Agrega el primer cliente de este negocio."
          />
        ) : (
          <div className="divide-y divide-border">
            {clients.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <p className="text-sm font-medium text-text">
                  {c.companyName}
                </p>
                <p className="text-xs text-text-muted">
                  {[c.contactName, c.email, c.phone]
                    .filter(Boolean)
                    .join(" · ") || "Sin contacto"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
