"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff, Shield, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { addClientAccount } from "@/lib/actions/clients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";

interface Account {
  id: string;
  bankName: string | null;
  accountNumber: string;
  accountType: string | null;
  currency: string;
  isPrimary: boolean;
}

interface AccountsViewProps {
  client: { id: string; companyName: string };
  accounts: Account[];
}

function MaskedNumber({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  const masked =
    value.length > 4 ? "•".repeat(value.length - 4) + value.slice(-4) : value;
  return (
    <div className="flex items-center gap-2">
      <code className="font-mono text-sm text-text">
        {show ? value : masked}
      </code>
      <button
        onClick={() => setShow(!show)}
        aria-label={show ? "Ocultar número" : "Mostrar número"}
        title={show ? "Ocultar" : "Mostrar"}
        className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-el hover:text-text"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const tabs = (clientId: string) => [
  { href: `/crm/${clientId}`, label: "Perfil" },
  { href: `/crm/${clientId}/payments`, label: "Pagos" },
  { href: `/crm/${clientId}/accounts`, label: "Cuentas", active: true },
];

export function AccountsView({ client, accounts }: AccountsViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    accountNumber: "",
    accountType: "",
    currency: "USD",
    isPrimary: false,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await addClientAccount({
        clientId: client.id,
        bankName: form.bankName || undefined,
        accountNumber: form.accountNumber,
        accountType: form.accountType || undefined,
        currency: form.currency,
        isPrimary: form.isPrimary,
      });
      toast.success("Cuenta agregada");
      setShowForm(false);
      setForm({
        bankName: "",
        accountNumber: "",
        accountType: "",
        currency: "USD",
        isPrimary: false,
      });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Clientes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {client.companyName}
            </h1>
            <Badge variant="danger">
              <Shield className="h-3 w-3" />
              Solo Admin
            </Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            Números de cuenta bancaria
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Agregar cuenta
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(client.id).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-text">
              Nueva cuenta bancaria
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="Banco"
                  value={form.bankName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bankName: e.target.value }))
                  }
                  placeholder="Banco"
                />
                <Input
                  aria-label="Tipo de cuenta"
                  value={form.accountType}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, accountType: e.target.value }))
                  }
                  placeholder="Tipo (cheques, ahorro…)"
                />
              </div>
              <Input
                aria-label="Número de cuenta"
                value={form.accountNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, accountNumber: e.target.value }))
                }
                placeholder="Número de cuenta *"
                required
              />
              <div className="flex items-center gap-4">
                <Select
                  aria-label="Moneda"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, currency: e.target.value }))
                  }
                  className="w-auto pr-8"
                >
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                  <option value="EUR">EUR</option>
                </Select>
                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, isPrimary: e.target.checked }))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                  Cuenta principal
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" loading={creating}>
                  {creating ? "Guardando…" : "Agregar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!accounts.length ? (
        <p className="py-12 text-center text-sm text-text-muted">
          No hay cuentas bancarias registradas
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                account.isPrimary
                  ? "border-primary/40 bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]"
                  : "border-border bg-surface shadow-elev-1"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text">
                      {account.bankName ?? "Banco"}
                    </p>
                    {account.isPrimary && (
                      <Badge variant="primary">Principal</Badge>
                    )}
                  </div>
                  {account.accountType && (
                    <p className="text-xs text-text-muted">
                      {account.accountType}
                    </p>
                  )}
                </div>
                <span className="text-xs text-text-tertiary">
                  {account.currency}
                </span>
              </div>
              <div className="mt-3">
                <MaskedNumber value={account.accountNumber} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
