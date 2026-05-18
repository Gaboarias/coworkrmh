import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { TeamManagement } from "@/components/settings/TeamManagement";

export default async function TeamSettingsPage() {
  const session = await auth();

  if (!session || (session.user.role as string) !== "admin") {
    redirect("/settings");
  }

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));

  const members = userRows.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name: u.name ?? null,
    avatarUrl: u.avatarUrl ?? null,
    role: u.role ?? "member",
  }));

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="Equipo"
        description="Gestiona los miembros y roles del equipo"
      />
      <TeamManagement members={members} currentUserId={session.user.id} />
    </div>
  );
}
