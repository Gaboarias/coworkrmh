"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { addClientAccount } from "@/lib/actions/clients";

interface Account {
  id: string;
  bank_name: string | null;
  account_number: string;
  account_type: string | null;
  currency: string;
  is_primary: boolean;
}

interface AccountsViewProps {
  client: { id: string; company_name: string };
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
        className="text-text-tertiary hover:text-text"
        title={show ? "Ocultar" : "Mostrar"}
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

export function AccountsView({ client, accounts: initialAccounts }: AccountsViewProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    bank_name: "",
    account_number: "",
    account_type: "",
    currency: "USD",
    is_primary: false,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await addClientAccount({
        clientId: client.id,
        bankName: form.bank_name || undefined,
        accountNumber: form.account_number,
        accountType: form.account_type || undefined,
        currency: form.currency,
        isPrimary: form.is_primary,
      });
      toast.success("Cuenta agregada");
      setShowForm(false);
      setForm({ bank_name: "", account_number: "", account_type: "", currency: "USD", is_primary: false });
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text placeholder-text-tertiary focus:border-primary focus:outline-none";

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <Link href="/crm" className="text-sm text-text-muted hover:text-text">
          ← Clientes
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">{client.company_name}</h1>
            <div className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5">
              <Shield className="h-3 w-3 text-danger" />
              <span className="text-xs font-medium text-danger">Solo Admin</span>
            </div>
          </div>
          <p className="text-sm text-text-muted">Números de cuenta bancaria</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          Agregar cuenta
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-1 border-b border-border">
        {tabs(client.id).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium transition border-b-2 ${
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-semibold text-text">Nueva cuenta bancaria</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.bank_name}
                onChange={(e) => setForm((p) => ({ ...p, bank_name: e.target.value }))}
                placeholder="Banco"
                className={inputClass}
              />
              <input
                type="text"
                value={form.account_type}
                onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value }))}
                placeholder="Tipo (cheques, ahorro...)"
                className={inputClass}
              />
            </div>
            <input
              type="text"
              value={form.account_number}
              onChange={(e) => setForm((p) => ({ ...p, account_number: e.target.value }))}
              placeholder="Número de cuenta *"
              required
              className={inputClass}
            />
            <div className="flex items-center gap-3">
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text focus:outline-none"
              >
                <option value="USD">USD</option>
                <option value="MXN">MXN</option>
                <option value="EUR">EUR</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((p) => ({ ...p, is_primary: e.target.checked }))}
                  className="accent-primary"
                />
                Cuenta principal
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-surface-el"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {creating ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts list */}
      {!accounts.length ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No hay cuentas bancarias registradas
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-xl border p-4 ${
                account.is_primary
                  ? "border-primary/40 bg-primary-muted"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text">
                      {account.bank_name ?? "Banco"}
                    </p>
                    {account.is_primary && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                        Principal
                      </span>
                    )}
                  </div>
                  {account.account_type && (
                    <p className="text-xs text-text-muted">{account.account_type}</p>
                  )}
                </div>
                <span className="text-xs text-text-tertiary">{account.currency}</span>
              </div>
              <div className="mt-3">
                <MaskedNumber value={account.account_number} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
