import { db } from "@/lib/db";
import { projects, changelog, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ChangelogFeed } from "@/components/changelog/ChangelogFeed";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { PageHeader } from "@/components/shared/PageHeader";

interface PageProps {
  params: { projectId: string };
}

export default async function ProjectChangelogPage({ params }: PageProps) {
  // Fetch project
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.id, params.projectId))
    .limit(1);

  if (!project) notFound();

  // Fetch changelog with user info
  const entryRows = await db
    .select({
      id: changelog.id,
      action: changelog.action,
      entityType: changelog.entityType,
      description: changelog.description,
      createdAt: changelog.createdAt,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
    })
    .from(changelog)
    .leftJoin(users, eq(changelog.userId, users.id))
    .where(eq(changelog.projectId, params.projectId))
    .orderBy(desc(changelog.createdAt))
    .limit(100);

  const entries = entryRows.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType ?? "",
    description: e.description ?? "",
    createdAt: e.createdAt ? e.createdAt.toISOString() : "",
    user: {
      name: e.userName ?? null,
      avatarUrl: e.userAvatarUrl ?? null,
    },
  }));

  const parts = project.name.split(/\s+[—-]\s+/);
  const titleText = parts[0] ?? project.name;
  const subtitleText = parts.length > 1 ? parts.slice(1).join(" — ") : "historial.";

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow={`/ proyectos / ${titleText.toLowerCase()} / historial`}
        title={`${titleText},`}
        subtitle={subtitleText}
        issueLines={[`${entries.length} EVENTOS`]}
      />

      <ProjectTabs projectId={project.id} />

      <ChangelogFeed entries={entries} />
    </div>
  );
}
