import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { buckets, bucketMembers, users, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canAccessBucket } from "@/lib/access";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsTabs } from "@/components/operations/shared/OperationsTabs";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/shared/UserAvatar";

export default async function TeamPage({
  params,
}: {
  params: { bucketId: string };
}) {
  const { bucketId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");

  const [bucket] = await db
    .select({ name: buckets.name, teamAgreements: buckets.teamAgreements })
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .limit(1);

  const memberRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      profileName: profiles.name,
      responsibilities: bucketMembers.responsibilities,
      compensation: bucketMembers.compensation,
      memberStatus: bucketMembers.memberStatus,
    })
    .from(bucketMembers)
    .leftJoin(users, eq(bucketMembers.userId, users.id))
    .leftJoin(profiles, eq(bucketMembers.profileId, profiles.id))
    .where(eq(bucketMembers.bucketId, bucketId));

  const members = memberRows.filter((m) => m.id != null);

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <Link
        href="/operations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Operaciones
      </Link>
      <OperationsTabs bucketId={bucketId} />
      <PageHeader
        title={`Equipo · ${bucket?.name ?? ""}`}
        description="Roles, responsabilidades y acuerdos del equipo"
      />

      <Card>
        <div className="divide-y divide-border">
          {members.length === 0 ? (
            <div className="p-5 text-sm text-text-muted">
              Sin miembros asignados a este negocio.
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="flex items-start gap-4 p-4">
                <UserAvatar
                  name={m.name ?? undefined}
                  avatarUrl={m.avatarUrl ?? undefined}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">
                      {m.name ?? m.email}
                    </p>
                    <Badge
                      variant={
                        m.memberStatus === "active" ? "success" : "neutral"
                      }
                    >
                      {m.memberStatus === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {m.profileName ?? "Sin perfil"}
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
              </div>
            ))
          )}
        </div>
      </Card>

      {bucket?.teamAgreements && (
        <Card className="mt-6">
          <CardContent>
            <h3 className="mb-2 text-sm font-semibold text-text">
              Acuerdos clave del equipo
            </h3>
            <p className="whitespace-pre-wrap text-sm text-text-muted">
              {bucket.teamAgreements}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
