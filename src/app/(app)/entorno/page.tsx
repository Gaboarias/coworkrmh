import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Users } from "lucide-react";
import { WorkspaceInvites } from "@/components/settings/WorkspaceInvites";
import { WorkspaceMembers } from "@/components/settings/WorkspaceMembers";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listWorkspaceInvites } from "@/lib/actions/invitations";
import {
  listWorkspaceMembers,
  getWorkspacePermissionMatrix,
} from "@/lib/actions/workspaces";

/**
 * El equipo del entorno activo: quién está adentro y cómo se suma gente.
 *
 * Por qué es pantalla propia y no una sección de /settings, que es donde
 * estaba: /settings dice "perfil y cuenta" en el encabezado — es lo tuyo.
 * Invitar gente a un entorno no es una preferencia personal, y enterrarlo como
 * tercera tarjeta de esa página lo hacía imposible de encontrar. La prueba fue
 * que hubo que preguntar dónde estaba.
 *
 * Y por qué no /admin, que sería el otro candidato: /admin exige rol admin
 * GLOBAL. Esa era exactamente la restricción que las invitaciones vinieron a
 * quitar — el dueño de un entorno tenía que pedirle a otro que sumara gente a
 * su propio equipo. Acá el permiso es `members.manage` sobre ESTE entorno.
 */
export default async function EntornoPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { ws, can } = await getActiveWorkspaceWithPermissions();

  if (!ws) {
    return (
      <div className="animate-fade-in mx-auto max-w-3xl px-8 py-10 md:px-12">
        <PageHeader eyebrow="/ entorno" title="Entorno." />
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Sin entorno"
          description="No pertenecés a ningún entorno todavía."
        />
      </div>
    );
  }

  // Sin `members.manage` no hay nada que hacer acá. Se manda al dashboard en
  // vez de mostrar la pantalla vacía: una página que existe pero no deja hacer
  // nada se lee como algo roto.
  if (!can("members.manage")) redirect("/dashboard");

  const [members, invites, matrix] = await Promise.all([
    listWorkspaceMembers(ws.id),
    listWorkspaceInvites(ws.id),
    getWorkspacePermissionMatrix(ws.id),
  ]);

  // "owner" no está en la matriz a propósito: no se asigna nunca, ni por
  // invitación ni a mano (ver assertAssignableRole).
  const roles = Object.keys(matrix);
  const pendientes = invites.filter(
    (i) =>
      !i.revokedAt &&
      new Date(i.expiresAt).getTime() > Date.now() &&
      (i.maxUses === null || i.usedCount < i.maxUses)
  ).length;

  return (
    <div className="animate-fade-in mx-auto max-w-3xl px-8 py-10 md:px-12">
      <PageHeader
        eyebrow="/ entorno"
        title={`${ws.name},`}
        subtitle="equipo y accesos."
        issueLines={[
          `${members.length} ${members.length === 1 ? "MIEMBRO" : "MIEMBROS"}`,
          `${pendientes} ${pendientes === 1 ? "INVITACIÓN" : "INVITACIONES"}`,
        ]}
      />

      <WorkspaceMembers
        workspaceId={ws.id}
        members={members}
        roles={roles}
        currentUserId={session.user.id}
      />

      <WorkspaceInvites
        workspaceId={ws.id}
        workspaceName={ws.name}
        roles={roles}
        initialInvites={invites}
      />
    </div>
  );
}
