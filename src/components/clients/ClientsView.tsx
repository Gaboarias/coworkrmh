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
import { Button, buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { DensityToggle } from "@/components/operations/DensityToggle";
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
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" />
              Nuevo cliente
            </Button>
          ) : undefined
        }
      />
      <HairlineRule />

      {/* New client form */}
      {showForm && (
        <div className="mt-6 rounded-xl border border-rule bg-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-ink">Nuevo cliente</h3>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-ink-soft">
                Empresa <span className="text-urgent">*</span>
              </label>
              <Input
                type="text"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Nombre de la empresa"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-soft">Contacto</label>
              <Input
                type="text"
                value={form.contactName}
                onChange={(e) => setField("contactName", e.target.value)}
                placeholder="Nombre del contacto"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-soft">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-soft">Teléfono</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+506 8888-8888"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowForm(false); setForm(EMPTY); }}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={isPending}>
                Crear
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      <div className="mt-8">
        {clients.length === 0 ? (
          <div className="rounded-xl border border-rule bg-surface px-6 py-12 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-ink-soft/40" />
            <p className="text-sm text-ink-soft">No hay clientes todavía.</p>
            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs text-ink-soft underline underline-offset-2 transition-colors hover:text-ink"
              >
                Agregar el primero
              </button>
            )}
          </div>
        ) : (
          <>
          <div className="mb-2 flex justify-end">
            <DensityToggle />
          </div>
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
          </>
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
    <li className="rounded-xl border border-rule bg-surface">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-[var(--erp-row-py)]">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg text-xs font-semibold text-ink uppercase">
          {client.companyName.slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {client.companyName}
          </p>
          {client.contactName && (
            <p className="truncate text-xs text-ink-soft">{client.contactName}</p>
          )}
        </div>

        {/* Status chip — el primitivo Badge ya trae estas variantes. Antes eran
            pares oklch fijos con fondo oscuro (L=0.22), o sea colores de tema
            oscuro cableados que no se adaptaban al claro. */}
        <Badge
          className="shrink-0"
          variant={
            client.status === "active"
              ? "success"
              : client.status === "prospect"
              ? "warning"
              : "outline"
          }
        >
          {client.status === "active"
            ? "Activo"
            : client.status === "prospect"
            ? "Prospecto"
            : "Inactivo"}
        </Badge>

        {/* Portal indicator */}
        {hasPortal && (
          <Globe className="h-3.5 w-3.5 shrink-0 text-done" />
        )}

        {/* Expand toggle */}
        {isAdmin && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-ink-soft transition-colors hover:text-ink"
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
        <div className="border-t border-rule px-4 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Portal del cliente
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Procesando...
            </div>
          ) : hasPortal ? (
            <div className="space-y-2">
              {/* Current portal URL display */}
              <div className="flex items-center gap-2 rounded-lg border border-rule bg-bg px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
                <code className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/portal/${client.portalToken}`
                    : `/portal/${client.portalToken}`}
                </code>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCopyPortalUrl(client.portalToken!)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Copy className="h-3 w-3" />
                  Copiar link
                </button>

                {client.email && (
                  <button
                    onClick={() => onSendInvite(client.id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-rule px-3 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    <Mail className="h-3 w-3" />
                    Enviar por email
                  </button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRevokeToken(client.id)}
                  className="text-urgent hover:border-urgent hover:text-urgent"
                >
                  <XCircle className="h-3 w-3" />
                  Revocar acceso
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-ink-soft">
                Este cliente aún no tiene portal activo.
              </p>
              <Button size="sm" onClick={() => onGenerateToken(client.id)}>
                <Globe className="h-3.5 w-3.5" />
                Generar portal
              </Button>
            </div>
          )}

          {/* Email info */}
          {client.email && (
            <p className="mt-3 text-xs text-ink-soft">
              <span className="text-ink-soft/60">Email: </span>
              {client.email}
            </p>
          )}
          {client.phone && (
            <p className="text-xs text-ink-soft">
              <span className="text-ink-soft/60">Teléfono: </span>
              {client.phone}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
