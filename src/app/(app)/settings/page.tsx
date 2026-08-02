import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";
import { CalendarConnections } from "@/components/settings/CalendarConnections";
import { WorkspaceInvites } from "@/components/settings/WorkspaceInvites";
import { getCalendarStatus } from "@/lib/calendar/meetings";
import { googleConfigured } from "@/lib/calendar/google";
import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listWorkspaceInvites } from "@/lib/actions/invitations";
import { getWorkspacePermissionMatrix } from "@/lib/actions/workspaces";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  const calStatus = await getCalendarStatus(user.id);

  // Invitar al entorno vive acá y no sólo en /admin: la restricción vieja era
  // el rol admin GLOBAL, así que el dueño de un entorno no podía sumar a nadie
  // a su propio equipo. El permiso correcto es `members.manage` sobre ESTE
  // entorno, que es lo que se chequea abajo.
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  const puedeInvitar = ws !== null && can("members.manage");
  // Las dos lecturas exigen requireWorkspaceManage, así que sólo se piden
  // cuando ya sabemos que el permiso está.
  const [invites, matrix] = puedeInvitar
    ? await Promise.all([
        listWorkspaceInvites(ws.id),
        getWorkspacePermissionMatrix(ws.id),
      ])
    : [[], {}];

  return (
    <div className="animate-fade-in mx-auto max-w-2xl px-8 py-10 md:px-12">
      <PageHeader
        eyebrow="/ settings"
        title="Configuración,"
        subtitle="perfil y cuenta."
        issueLines={[user.email ?? "", (user.role ?? "member").toUpperCase()]}
      />
      <UserSettingsForm
        profile={{
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? null,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role ?? "member",
        }}
      />
      <CalendarConnections
        configured={googleConfigured()}
        connected={calStatus.connected}
        email={calStatus.email}
      />
      {puedeInvitar && ws && (
        <WorkspaceInvites
          workspaceId={ws.id}
          workspaceName={ws.name}
          // "owner" queda fuera: no se asigna nunca, ni por invitación ni a
          // mano (ver assertAssignableRole).
          roles={Object.keys(matrix)}
          initialInvites={invites}
        />
      )}
    </div>
  );
}
