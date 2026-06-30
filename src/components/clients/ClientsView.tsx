"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Link2,
  Copy,
  Mail,
  Trash2,
  ChevronRight,
  Globe,
  XCircle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import {
  createClient,
  generatePortalToken,
  revokePortalToken,
  sendPortalInvite,
} from "@/lib/actions/clients";
import type { ClientRow } from "@/lib/actions/clients";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientsViewProps {
  clients: ClientRow[];
  isAdmin: boolean;
}

interface NewClientForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

const EMPTY: NewClientForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClientsView({ clients: initialClients, isAdmin }: ClientsViewProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewClientForm>(EMPTY);
  const [isPending, startTransition] = useTransition();
  const [loadingToken, setLoadingToken] = useState<string | null>(null);

  function setField(key: keyof NewClientForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Create client ──────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error("El nombre de la empresa es requerido.");
      return;
    }
    startTransition(async () => {
      try {
        const newClient = await createClient({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
        });
        setClients((prev) => [newClient, ...prev]);
        setForm(EMPTY);
        setShowForm(false);
        toast.success("Cliente creado.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al crear cliente.");
      }
    });
  }

  // ─── Portal token actions ───────────────────────────────────────────────────

  async function handleGenerateToken(clientId: string) {
    if (!isAdmin) return;
    setLoadingToken(clientId);
    try {
      const { url } = await generatePortalToken(clientId);
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== clientId) return c;
          // Extract token from URL for local state
          const token = url.split("/portal/")[1] ?? null;
          return { ...c, portalToken: token };
        })
      );
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado al portapapeles.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error generando token.");
    } finally {
      setLoadingToken(null);
    }
  }

  async function handleCopyPortalUrl(token: string) {
    const url = `${window.location.origin}/portal/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  }

  async function handleSendInvite(clientId: string) {
    if (!isAdmin) return;
    setLoadingToken(clientId);
    try {
      await sendPortalInvite(clientId);
      toast.success("Invitación enviada por email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error enviando invitación.");
    } finally {
      setLoadingToken(null);
    }
  }

  async function handleRevokeToken(clientId: string) {
    if (!isAdmin) return;
    if (!confirm("¿Revocar el acceso? El link actual dejará de funcionar.")) return;
    setLoadingToken(clientId);
    try {
      await revokePortalToken(clientId);
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, portalToken: null } : c))
      );
      toast.success("Acceso revocado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error revocando acceso.");
    } finally {
      setLoadingToken(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ clientes"
        title="Clientes,"
        subtitle="portal y gestión."
        actions={
          isAdmin ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80"
            >
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </button>
          ) : undefined
        }
      />
      <HairlineRule />

      {/* New client form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-text">Nuevo cliente</h3>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-text-muted">
                Empresa <span className="text-[oklch(0.62_0.2_25)]">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-ink focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Contacto</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setField("contactName", e.target.value)}
                placeholder="Nombre del contacto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-ink focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="contacto@empresa.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-ink focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+506 8888-8888"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted/60 focus:border-ink focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY); }}
                className="rounded-lg px-4 py-2 text-sm text-text-muted transition-colors hover:text-text"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      <div className="mt-8">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-text-muted/40" />
            <p className="text-sm text-text-muted">No hay clientes todavía.</p>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs text-text-muted underline underline-offset-2 transition-colors hover:text-text"
              >
                Agregar el primero
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                isAdmin={isAdmin}
                isLoading={loadingToken === client.id}
                onGenerateToken={handleGenerateToken}
                onCopyPortalUrl={handleCopyPortalUrl}
                onSendInvite={handleSendInvite}
                onRevokeToken={handleRevokeToken}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── ClientCard ───────────────────────────────────────────────────────────────

function ClientCard({
  client,
  isAdmin,
  isLoading,
  onGenerateToken,
  onCopyPortalUrl,
  onSendInvite,
  onRevokeToken,
}: {
  client: ClientRow;
  isAdmin: boolean;
  isLoading: boolean;
  onGenerateToken: (id: string) => void;
  onCopyPortalUrl: (token: string) => void;
  onSendInvite: (id: string) => void;
  onRevokeToken: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPortal = !!client.portalToken;

  return (
    <li className="rounded-xl border border-border bg-surface">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-xs font-semibold text-ink uppercase">
          {client.companyName.slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {client.companyName}
          </p>
          {client.contactName && (
            <p className="truncate text-xs text-text-muted">{client.contactName}</p>
          )}
        </div>

        {/* Status chip */}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            client.status === "active"
              ? "bg-[oklch(0.22_0.06_145)] text-[oklch(0.72_0.17_145)]"
              : client.status === "prospect"
              ? "bg-[oklch(0.22_0.05_60)] text-[oklch(0.72_0.15_60)]"
              : "bg-surface text-text-muted ring-1 ring-border"
          }`}
        >
          {client.status === "active"
            ? "Activo"
            : client.status === "prospect"
            ? "Prospecto"
            : "Inactivo"}
        </span>

        {/* Portal indicator */}
        {hasPortal && (
          <Globe className="h-3.5 w-3.5 shrink-0 text-[oklch(0.62_0.17_145)]" />
        )}

        {/* Expand toggle */}
        {isAdmin && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-text-muted transition-colors hover:text-text"
            title="Portal y detalles"
            aria-label={expanded ? "Ocultar portal y detalles" : "Ver portal y detalles"}
            aria-expanded={expanded}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Expanded portal panel */}
      {expanded && isAdmin && (
        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Portal del cliente
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Procesando...
            </div>
          ) : hasPortal ? (
            <div className="space-y-2">
              {/* Current portal URL display */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <code className="min-w-0 flex-1 truncate text-xs text-text-muted">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/portal/${client.portalToken}`
                    : `/portal/${client.portalToken}`}
                </code>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCopyPortalUrl(client.portalToken!)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-ink hover:text-text"
                >
                  <Copy className="h-3 w-3" />
                  Copiar link
                </button>

                {client.email && (
                  <button
                    onClick={() => onSendInvite(client.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-ink hover:text-text"
                  >
                    <Mail className="h-3 w-3" />
                    Enviar por email
                  </button>
                )}

                <button
                  onClick={() => onRevokeToken(client.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-[oklch(0.62_0.2_25)] transition-colors hover:border-[oklch(0.62_0.2_25)]"
                >
                  <XCircle className="h-3 w-3" />
                  Revocar acceso
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">
                Este cliente aún no tiene portal activo.
              </p>
              <button
                onClick={() => onGenerateToken(client.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80"
              >
                <Globe className="h-3.5 w-3.5" />
                Generar portal
              </button>
            </div>
          )}

          {/* Email info */}
          {client.email && (
            <p className="mt-3 text-xs text-text-muted">
              <span className="text-text-muted/60">Email: </span>
              {client.email}
            </p>
          )}
          {client.phone && (
            <p className="text-xs text-text-muted">
              <span className="text-text-muted/60">Teléfono: </span>
              {client.phone}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
