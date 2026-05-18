import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, buckets } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { TeamsManagement } from "@/components/settings/TeamsManagement";

export default async function TeamsSettingsPage() {
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    redirect("/settings");
  }

  const bucketRows = await db
    .select({
      id: buckets.id,
      name: buckets.name,
      color: buckets.color,
      position: buckets.position,
    })
    .from(buckets)
    .orderBy(asc(buckets.position));

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(asc(users.name));

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="Equipos y negocios"
        description="Crea negocios (Azulejos, RMH…) y asigna qué usuarios acceden a cada uno"
      />
      <TeamsManagement
        buckets={bucketRows}
        allUsers={userRows.map((u) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email ?? "",
          avatarUrl: u.avatarUrl ?? null,
        }))}
      />
    </div>
  );
}
