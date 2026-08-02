"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { IconButton } from "@/components/ui/IconButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { BUILTIN_ROLE_LABELS } from "@/lib/constants/workspacePermissions";
import {
  setMemberRole,
  removeWorkspaceMember,
} from "@/lib/actions/workspaces";

export interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
}

/**
 * Quién está en el entorno y con qué rol.
 *
 * Existía sólo dentro del panel de /admin, o sea sólo para el admin GLOBAL.
 * El dueño de un entorno podía invitar gente (desde que existen las
 * invitaciones) pero después no tenía dónde verla ni cambiarle el rol — tenía
 * que pedírselo a otra persona. Los actions ya pedían `members.manage` sobre el
 * entorno, así que lo único que faltaba era una pantalla que no exigiera ser
 * admin del sistema entero.
 */
export const WorkspaceMembers = ({
  workspaceId,
  members: initial,
  roles,
  currentUserId,
}: {
  workspaceId: string;
  members: MemberRow[];
  roles: string[];
  currentUserId: string;
}) => {
  const [members, setMembers] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const cambiarRol = async (userId: string, role: string) => {
    const previo = members.find((m) => m.id === userId)?.role;
    setBusy(userId);
    setMembers((p) => p.map((m) => (m.id === userId ? { ...m, role } : m)));
    try {
      await setMemberRole(workspaceId, userId, role);
      toast.success("Rol actualizado");
    } catch (err) {
      // Vuelve a lo anterior: el <select> ya se movió y dejarlo mostrando un
      // rol que el servidor rechazó sería afirmar algo falso.
      setMembers((p) =>
        p.map((m) => (m.id === userId && previo ? { ...m, role: previo } : m))
      );
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const quitar = async (userId: string, nombre: string) => {
    if (!confirm(`¿Sacar a ${nombre} del entorno?`)) return;
    setBusy(userId);
    try {
      await removeWorkspaceMember(workspaceId, userId);
      setMembers((p) => p.filter((m) => m.id !== userId));
      toast.success("Miembro removido");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold text-ink">
          Miembros ({members.length})
        </h3>
        <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-soft">
          El rol define qué puede hacer cada quien dentro de este entorno. El
          propietario no se puede cambiar ni quitar.
        </p>

        <div className="divide-y divide-rule">
          {members.map((m) => {
            const esOwner = m.role === "owner";
            const soyYo = m.id === currentUserId;
            return (
              <div key={m.id} className="flex items-center gap-3 py-2">
                <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {m.name ?? m.email}
                    {soyYo && (
                      <span className="ml-1.5 text-xs text-ink-faint">
                        (vos)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{m.email}</p>
                </div>

                {esOwner ? (
                  // El propietario no lleva <select>: no es que esté
                  // deshabilitado, es que no es una opción. Un control gris que
                  // no responde invita a intentarlo y a no entender por qué.
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                    {BUILTIN_ROLE_LABELS.owner}
                  </span>
                ) : (
                  <>
                    <Select
                      aria-label={`Rol de ${m.name ?? m.email}`}
                      value={m.role}
                      disabled={busy === m.id}
                      onChange={(e) => cambiarRol(m.id, e.target.value)}
                      className="w-auto"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {BUILTIN_ROLE_LABELS[r] ?? r}
                        </option>
                      ))}
                    </Select>
                    <IconButton
                      size="lg"
                      tone="danger"
                      disabled={busy === m.id}
                      onClick={() => quitar(m.id, m.name ?? m.email)}
                      label={`Sacar a ${m.name ?? m.email} del entorno`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
