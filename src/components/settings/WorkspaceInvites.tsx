"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Mail, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { OneTimeSecret } from "@/components/ui/OneTimeSecret";
import { SegmentedNav } from "@/components/ui/SegmentedNav";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateCR } from "@/lib/utils/datetime";
import { BUILTIN_ROLE_LABELS } from "@/lib/constants/workspacePermissions";
import {
  INVITE_TTL_OPTIONS,
  DEFAULT_INVITE_TTL_DAYS,
} from "@/lib/constants/invites";
import {
  createWorkspaceInvite,
  listWorkspaceInvites,
  revokeWorkspaceInvite,
  type InviteRow,
} from "@/lib/actions/invitations";

type Mode = "email" | "link";

/**
 * Invitar gente a un entorno.
 *
 * Dos modos porque son dos situaciones distintas, no dos maneras de hacer lo
 * mismo. Por correo: sabés a quién querés adentro y el link no le sirve a
 * nadie más. Link para compartir: lo pegás en el grupo del equipo y entra
 * quien tenga que entrar, con tope de usos y vencimiento.
 */
export const WorkspaceInvites = ({
  workspaceId,
  workspaceName,
  roles,
  initialInvites,
}: {
  workspaceId: string;
  workspaceName: string;
  roles: string[];
  initialInvites: InviteRow[];
}) => {
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [days, setDays] = useState<number>(DEFAULT_INVITE_TTL_DAYS);
  const [maxUses, setMaxUses] = useState("");
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "email" && !email.trim()) {
      toast.error("Escribí un correo");
      return;
    }
    setCreating(true);
    setFreshUrl(null);
    try {
      const res = await createWorkspaceInvite(workspaceId, {
        email: mode === "email" ? email : null,
        role,
        expiresInDays: days,
        maxUses: mode === "link" && maxUses ? Number(maxUses) : null,
        sendEmail: mode === "email",
      });
      // El link se muestra ACÁ y nunca más: en la base sólo queda el hash.
      setFreshUrl(res.url);
      toast.success(
        res.emailSent
          ? `Invitación enviada a ${email}`
          : mode === "email"
            ? "Invitación creada — el correo no salió, compartí el link a mano"
            : "Link creado"
      );
      setEmail("");
      setMaxUses("");
      // La lista viene del servidor con el conteo de usos; se recarga entera
      // en vez de adivinar la fila nueva.
      setInvites(await listWorkspaceInvites(workspaceId));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("¿Dar de baja esta invitación? El link deja de funcionar.")) {
      return;
    }
    setRevoking(id);
    try {
      await revokeWorkspaceInvite(id);
      setInvites((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, revokedAt: new Date().toISOString() } : i
        )
      );
      toast.success("Invitación dada de baja");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const activas = invites.filter((i) => statusOf(i) === "activa");
  const cerradas = invites.filter((i) => statusOf(i) !== "activa");

  return (
    <Card className="mt-6">
      <CardContent>
        <h3 className="text-sm font-semibold text-ink">
          Invitar a {workspaceName}
        </h3>
        <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-soft">
          Quien acepte entra con una cuenta propia y queda registrado. Todas las
          invitaciones vencen — no hay opción de link permanente a un entorno.
        </p>

        <SegmentedNav
          className="mb-4"
          label="Forma de invitar"
          items={[
            { key: "email", label: "Por correo", icon: Mail },
            { key: "link", label: "Link para compartir", icon: Link2 },
          ]}
          active={mode}
          onSelect={(k) => setMode(k as Mode)}
        />

        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          {mode === "email" ? (
            <Field label="Correo" className="sm:col-span-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="persona@ejemplo.com"
              />
            </Field>
          ) : (
            <Field label="Tope de usos" hint="vacío = sin tope hasta que venza">
              <Input
                type="number"
                min="1"
                step="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Sin tope"
              />
            </Field>
          )}

          <Field label="Entra como">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {BUILTIN_ROLE_LABELS[r] ?? r}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vence en">
            <Select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {INVITE_TTL_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end sm:col-span-2">
            <Button type="submit" loading={creating} className="w-full sm:w-auto">
              {mode === "email" ? "Enviar invitación" : "Generar link"}
            </Button>
          </div>
        </form>

        {freshUrl && <OneTimeSecret url={freshUrl} className="mt-4" />}

        <div className="mt-6 border-t border-rule pt-4">
          <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Invitaciones vigentes
          </h4>
          {activas.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-8 w-8" />}
              title="Ninguna pendiente"
              description="Las invitaciones que generés aparecen acá hasta que se usen o venzan."
            />
          ) : (
            <div className="divide-y divide-rule">
              {activas.map((i) => (
                <InviteLine
                  key={i.id}
                  invite={i}
                  busy={revoking === i.id}
                  onRevoke={() => revoke(i.id)}
                />
              ))}
            </div>
          )}

          {cerradas.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Cerradas ({cerradas.length})
              </summary>
              <div className="mt-2 divide-y divide-rule opacity-60">
                {cerradas.map((i) => (
                  <InviteLine key={i.id} invite={i} busy={false} />
                ))}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/** Estado derivado, en el mismo orden en que lo evalúa el servidor. */
function statusOf(i: InviteRow): "revocada" | "vencida" | "agotada" | "activa" {
  if (i.revokedAt) return "revocada";
  if (new Date(i.expiresAt).getTime() <= Date.now()) return "vencida";
  if (i.maxUses !== null && i.usedCount >= i.maxUses) return "agotada";
  return "activa";
}

const InviteLine = ({
  invite,
  busy,
  onRevoke,
}: {
  invite: InviteRow;
  busy: boolean;
  onRevoke?: () => void;
}) => {
  const estado = statusOf(invite);
  const roleLabel = BUILTIN_ROLE_LABELS[invite.role] ?? invite.role;
  const usos =
    invite.maxUses === null
      ? `${invite.usedCount} ${invite.usedCount === 1 ? "uso" : "usos"}`
      : `${invite.usedCount}/${invite.maxUses}`;

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span aria-hidden className="text-ink-faint">
        {invite.email ? (
          <Mail className="h-4 w-4" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink">
          {invite.email ?? "Link para compartir"}
        </p>
        <p className="truncate text-xs text-ink-soft">
          {roleLabel} · {usos} ·{" "}
          {estado === "activa"
            ? `vence ${formatDateCR(invite.expiresAt)}`
            : estado}
          {invite.createdByName ? ` · por ${invite.createdByName}` : ""}
        </p>
      </div>
      {onRevoke && (
        <IconButton
          size="lg"
          tone="danger"
          onClick={onRevoke}
          disabled={busy}
          label={`Dar de baja la invitación${
            invite.email ? ` de ${invite.email}` : ""
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
};
