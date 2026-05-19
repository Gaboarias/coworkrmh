"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Check, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  setAgreements,
  type TeamMemberRow,
} from "@/lib/actions/erp";

interface Draft {
  name: string;
  role: string;
  responsibilities: string;
  compensation: string;
  status: string;
}
const empty: Draft = {
  name: "",
  role: "",
  responsibilities: "",
  compensation: "",
  status: "active",
};

const Fields = ({
  d,
  set,
}: {
  d: Draft;
  set: (p: Partial<Draft>) => void;
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    <Input
      value={d.name}
      onChange={(e) => set({ name: e.target.value })}
      placeholder="Nombre"
      aria-label="Nombre"
    />
    <Input
      value={d.role}
      onChange={(e) => set({ role: e.target.value })}
      placeholder="Rol principal"
      aria-label="Rol"
    />
    <Textarea
      rows={2}
      value={d.responsibilities}
      onChange={(e) => set({ responsibilities: e.target.value })}
      placeholder="Responsabilidades"
      aria-label="Responsabilidades"
      className="sm:col-span-2"
    />
    <Input
      value={d.compensation}
      onChange={(e) => set({ compensation: e.target.value })}
      placeholder="Compensación"
      aria-label="Compensación"
    />
    <Select
      value={d.status}
      onChange={(e) => set({ status: e.target.value })}
      aria-label="Estado"
    >
      <option value="active">Activo</option>
      <option value="inactive">Inactivo</option>
    </Select>
  </div>
);

export const TeamView = ({
  members,
  agreements,
  canManage = true,
}: {
  members: TeamMemberRow[];
  agreements: string;
  canManage?: boolean;
}) => {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(empty);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [ag, setAg] = useState(agreements);
  const [savingAg, setSavingAg] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setCreating(true);
    try {
      await createTeamMember(draft);
      toast.success("Miembro agregado");
      setDraft(empty);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (id: string) => {
    setBusy(true);
    try {
      await updateTeamMember(id, editDraft);
      toast.success("Actualizado");
      setEditId(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar miembro?")) return;
    try {
      await deleteTeamMember(id);
      toast.success("Eliminado");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const saveAgreements = async () => {
    setSavingAg(true);
    try {
      await setAgreements(ag);
      toast.success("Acuerdos guardados");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingAg(false);
    }
  };

  return (
    <div className="space-y-5">
      {canManage && (
        <Card>
          <CardContent>
            <h3 className="mb-3 text-sm font-semibold text-text">
              Agregar miembro
            </h3>
            <form onSubmit={add} className="space-y-3">
              <Fields
                d={draft}
                set={(p) => setDraft((s) => ({ ...s, ...p }))}
              />
              <Button type="submit" loading={creating}>
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        {members.length === 0 ? (
          <p className="p-5 text-sm text-text-muted">Sin miembros todavía.</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) =>
              editId === m.id ? (
                <div key={m.id} className="space-y-3 bg-surface-el/40 p-4">
                  <Fields
                    d={editDraft}
                    set={(x) => setEditDraft((s) => ({ ...s, ...x }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveEdit(m.id)}
                      loading={busy}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-surface-el">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">
                        {m.name}
                      </p>
                      <Badge
                        variant={
                          m.status === "active" ? "success" : "neutral"
                        }
                      >
                        {m.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted">
                      {m.role ?? "Sin rol"}
                    </p>
                    {m.responsibilities && (
                      <p className="mt-1 text-sm text-text-muted">
                        {m.responsibilities}
                      </p>
                    )}
                    {m.compensation && (
                      <p className="mt-1 text-xs text-text-tertiary">
                        Compensación: {m.compensation}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setEditId(m.id);
                          setEditDraft({
                            name: m.name,
                            role: m.role ?? "",
                            responsibilities: m.responsibilities ?? "",
                            compensation: m.compensation ?? "",
                            status: m.status,
                          });
                        }}
                        aria-label={`Editar ${m.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-text"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        aria-label={`Eliminar ${m.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-el focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-2 text-sm font-semibold text-text">
            Acuerdos clave del equipo
          </h3>
          <Textarea
            rows={6}
            value={ag}
            onChange={(e) => setAg(e.target.value)}
            placeholder="Ej. % de ganancias por rol, pago por pieza vs. utilidades, aprobación de diseños…"
            disabled={!canManage}
          />
          {canManage && (
            <div className="mt-3">
              <Button onClick={saveAgreements} loading={savingAg}>
                <Save className="h-4 w-4" />
                Guardar acuerdos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
