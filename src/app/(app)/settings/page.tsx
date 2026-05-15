import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  // Shape to match UserSettingsForm's Profile type (snake_case)
  const profile = {
    id: user.id,
    email: user.email ?? "",
    full_name: user.name ?? null,
    avatar_url: user.avatarUrl ?? null,
    role: user.role ?? "member",
    created_at: user.createdAt ? String(user.createdAt) : "",
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <PageHeader title="Configuración" description="Gestiona tu perfil y cuenta" />
      <UserSettingsForm profile={profile as any} />
    </div>
  );
}
