import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { getTeam } from "@/lib/actions/erpTeam";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { TeamView } from "@/components/operations/TeamView";

export default async function EquipoPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Roles & acuerdos" />;
  const { members, agreements } = await getTeam();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations / roles & acuerdos"
        title="Roles"
        subtitle="& acuerdos."
        issueLines={[
          `${members.length} INTEGRANTES`,
          `${agreements.length} ACUERDOS`,
        ]}
      />
      <TeamView
        members={members}
        agreements={agreements}
        canManage={can("team.manage")}
      />
    </div>
  );
}
