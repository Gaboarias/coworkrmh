"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layers, Check } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface WorkspaceOption {
  id: string;
  name: string;
  color: string;
}

interface Props {
  userId: string;
  userName: string;
  workspaces: WorkspaceOption[];
}

/**
 * Botón inline en el AdminPanel UsersTab para gestionar los entornos
 * de un user existente. Click → modal con checkboxes de todos los
 * workspaces. Submit → POST /api/users/[id]/workspaces con el nuevo set.
 *
 * Útil para fix de users que se invitaron antes sin asignar entornos —
 * o para mover users entre entornos.
 *
 * Limitación: si el user es OWNER de un workspace, no se puede remover
 * por este modal (server lo skipea). Para transferir ownership hay que
 * usar la tab Entornos.
 */
export function AdminUserWorkspaces({ userId, userName, workspaces }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Gestionar entornos del usuario"
        aria-label="Gestionar entornos"
        className="rounded-md p-2 text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
      >
        <Layers className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <WorkspacesModal
          userId={userId}
          userName={userName}
          workspaces={workspaces}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function WorkspacesModal({
  userId,
  userName,
  workspaces,
  onClose,
}: {
  userId: string;
  userName: string;
  workspaces: WorkspaceOption[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());

  // Cargar memberships actuales del user al montar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/${userId}/workspaces`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          toast.error(data.error ?? "No se pudo cargar entornos del usuario");
          return;
        }
        const ids = new Set<string>(
          (data.workspaces ?? []).map((w: { workspaceId: string }) => w.workspaceId)
        );
        setSelected(ids);
        setInitial(ids);
      } catch (err) {
        if (!cancelled) toast.error((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(workspaces.map((w) => w.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  // Detectar si hubo cambios reales para enable submit.
  const hasChanges =
    selected.size !== initial.size ||
    [...selected].some((id) => !initial.has(id));

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      const msg: string[] = [];
      if (data.added > 0) msg.push(`+${data.added}`);
      if (data.removed > 0) msg.push(`-${data.removed}`);
      toast.success(
        msg.length > 0
          ? `Entornos actualizados (${msg.join(" ")})`
          : "Sin cambios"
      );
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Entornos de ${userName}`}
      description="Marcá los entornos donde el user puede trabajar. Si está como owner de alguno, ese checkbox queda fijo (no se puede sacar acá — usar tab Entornos para transferir ownership)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges || loading}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="py-4 text-sm italic text-text-tertiary">
          Cargando entornos del usuario…
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
            >
              Seleccionar todos
            </button>
            <span className="text-text-tertiary">·</span>
            <button
              type="button"
              onClick={selectNone}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
            >
              Ninguno
            </button>
            <span className="ml-auto font-mono text-[11px] tracking-[0.1em] text-ink-faint">
              {selected.size} / {workspaces.length}
            </span>
          </div>

          {workspaces.length === 0 ? (
            <p className="py-4 text-sm italic text-text-tertiary">
              No hay entornos creados todavía. Creá uno desde la tab Entornos.
            </p>
          ) : (
            <ul className="space-y-1">
              {workspaces.map((ws) => {
                const isSelected = selected.has(ws.id);
                return (
                  <li key={ws.id}>
                    <button
                      type="button"
                      onClick={() => toggle(ws.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-accent-soft"
                          : "hover:bg-accent-soft"
                      }`}
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: ws.color }}
                      />
                      <span className="flex-1 truncate text-[14px] font-medium text-ink">
                        {ws.name}
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-ink" strokeWidth={2.25} />
                      ) : (
                        <span className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
