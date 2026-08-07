import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";
import { CalendarConnections } from "@/components/settings/CalendarConnections";
import { getCalendarStatus } from "@/lib/calendar/meetings";
import { googleConfigured } from "@/lib/calendar/google";

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

  // El equipo del entorno (miembros + invitaciones) estuvo un rato acá abajo y
  // se mudó a /entorno. Esta página dice "perfil y cuenta": sumar gente a un
  // entorno no es una preferencia personal, y como tercera tarjeta bajo el
  // pliegue no la encontraba nadie.

  return (
    <div className="animate-fade-in mx-auto max-w-2xl px-8 py-10 md:px-12">
      <PageHeader
        eyebrow="/ configuración"
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
        needsReconnect={calStatus.needsReconnect}
      />
    </div>
  );
}
