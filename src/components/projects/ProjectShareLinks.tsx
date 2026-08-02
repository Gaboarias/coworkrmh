"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Trash2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { OneTimeSecret } from "@/components/ui/OneTimeSecret";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateCR } from "@/lib/utils/datetime";
import {
  createProjectShare,
  listProjectShares,
  revokeProjectShare,
  type ProjectShareRow,
} from "@/lib/actions/projectShares";

/**
 * Links de sólo lectura al proyecto.
 *
 * A diferencia de las invitaciones a un entorno, acá "sin vencimiento" SÍ es
 * una opción, y es el default. El caso real es mandarle el avance a un cliente
 * y que le sirva mientras dure el proyecto; forzar rotación sobre algo de sólo
 * lectura no compra seguridad, compra que dejen de usarlo.
 */
export const ProjectShareLinks = ({
  projectId,
  initialShares,
}: {
  projectId: string;
  initialShares: ProjectShareRow[];
}) => {
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("0");
  const [creating, setCreating] = useState(false);
  const [shares, setShares] = useState<ProjectShareRow[]>(initialShares);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFreshUrl(null);
    try {
      const res = await createProjectShare(projectId, {
        label,
        expiresInDays: Number(days) > 0 ? Number(days) : null,
      });
      setFreshUrl(res.url);
      setLabel("");
      setShares(await listProjectShares(projectId));
      toast.success("Link creado");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("¿Dar de baja este link? Deja de funcionar de inmediato.")) {
      return;
    }
    setRevoking(id);
    try {
      await revokeProjectShare(id);
      setShares((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, revokedAt: new Date().toISOString() } : s
        )
      );
      toast.success("Link dado de baja");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRevoking(null);
    }
  };

  const vivos = shares.filter((s) => estadoDe(s) === "activo");
  const muertos = shares.filter((s) => estadoDe(s) !== "activo");

  return (
    <Card className="mt-6">
      <CardContent>
        <h3 className="text-sm font-semibold text-ink">Compartir por link</h3>
        <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-soft">
          Quien tenga el link ve el avance, las tareas y las fechas — sin cuenta
          y sin poder tocar nada. No ve montos, documentos, notas ni los
          comentarios del equipo.
        </p>

        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <Field label="Para quién es" hint="sólo para acordarte vos">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Cliente — Marcela"
            />
          </Field>
          <Field label="Vence">
            <Select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="0">Sin vencimiento</option>
              <option value="7">En 7 días</option>
              <option value="30">En 30 días</option>
              <option value="90">En 90 días</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={creating}>
              <Link2 className="h-4 w-4" />
              Generar link
            </Button>
          </div>
        </form>

        {freshUrl && <OneTimeSecret url={freshUrl} className="mt-4" />}

        <div className="mt-6 border-t border-rule pt-4">
          {vivos.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-8 w-8" />}
              title="Sin links activos"
              description="El proyecto no está compartido con nadie de afuera."
            />
          ) : (
            <div className="divide-y divide-rule">
              {vivos.map((s) => (
                <ShareLine
                  key={s.id}
                  share={s}
                  busy={revoking === s.id}
                  onRevoke={() => revoke(s.id)}
                />
              ))}
            </div>
          )}

          {muertos.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                Dados de baja ({muertos.length})
              </summary>
              <div className="mt-2 divide-y divide-rule opacity-60">
                {muertos.map((s) => (
                  <ShareLine key={s.id} share={s} busy={false} />
                ))}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

function estadoDe(s: ProjectShareRow): "revocado" | "vencido" | "activo" {
  if (s.revokedAt) return "revocado";
  if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
    return "vencido";
  }
  return "activo";
}

const ShareLine = ({
  share,
  busy,
  onRevoke,
}: {
  share: ProjectShareRow;
  busy: boolean;
  onRevoke?: () => void;
}) => {
  const estado = estadoDe(share);
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <Link2 className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-ink">{share.label ?? "Link sin nombre"}</p>
        <p className="truncate text-xs text-ink-soft">
          {/* El conteo de vistas es lo que hace que revocar sea una decisión
              con información: un link que no se abre hace meses se da de baja
              sin pensarlo. */}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" aria-hidden />
            {share.viewCount === 0
              ? "sin abrir"
              : `${share.viewCount} ${share.viewCount === 1 ? "vista" : "vistas"}`}
          </span>
          {share.lastViewedAt &&
            ` · última ${formatDateCR(share.lastViewedAt)}`}
          {" · "}
          {estado !== "activo"
            ? estado
            : share.expiresAt
              ? `vence ${formatDateCR(share.expiresAt)}`
              : "sin vencimiento"}
        </p>
      </div>
      {onRevoke && (
        <IconButton
          size="lg"
          tone="danger"
          onClick={onRevoke}
          disabled={busy}
          label={`Dar de baja el link ${share.label ?? "sin nombre"}`}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
};
