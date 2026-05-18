import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { buckets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listProfiles } from "@/lib/actions/profiles";
import { listTeamMembers } from "@/lib/actions/profiles";
import { PageHeader } from "@/components/shared/PageHeader";
import { BucketTeamAdmin } from "@/components/settings/BucketTeamAdmin";

interface PageProps {
  params: { bucketId: string };
}

export default async function BucketTeamSettingsPage({ params }: PageProps) {
  const session = await auth();
  if (!session || (session.user.role as string) !== "admin") {
    redirect("/settings");
  }

  const [bucket] = await db
    .select({
      id: buckets.id,
      name: buckets.name,
      teamAgreements: buckets.teamAgreements,
    })
    .from(buckets)
    .where(eq(buckets.id, params.bucketId))
    .limit(1);

  if (!bucket) notFound();

  const [profileRows, memberRows] = await Promise.all([
    listProfiles(params.bucketId),
    listTeamMembers(params.bucketId),
  ]);

  return (
    <div className="animate-fade-in mx-auto max-w-2xl p-6 md:p-8">
      <Link
        href="/settings/teams"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Equipos y negocios
      </Link>
      <PageHeader
        title={bucket.name}
        description="Perfiles, permisos, responsabilidades y acuerdos del equipo"
      />
      <BucketTeamAdmin
        bucketId={bucket.id}
        teamAgreements={bucket.teamAgreements ?? ""}
        profiles={profileRows.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          permissions: (p.permissions as string[]) ?? [],
          isSystem: p.isSystem,
        }))}
        members={memberRows}
      />
    </div>
  );
}
