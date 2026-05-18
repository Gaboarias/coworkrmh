import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserSettingsForm } from "@/components/settings/UserSettingsForm";
import { Card, CardContent } from "@/components/ui/Card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="Configuración"
        description="Gestiona tu perfil y cuenta"
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

      {user.role === "admin" && (
        <Card className="mt-6">
          <CardContent className="p-0">
            <Link
              href="/settings/team"
              className="flex items-center gap-4 p-5 transition-colors hover:bg-surface-el"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text">Equipo y roles</p>
                <p className="text-sm text-text-muted">
                  Gestiona los miembros del equipo y asigna roles
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
