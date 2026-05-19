import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { getTeam } from "@/lib/actions/erp";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { TeamView } from "@/components/operations/TeamView";

export default async function EquipoPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Equipo" />;
  const { members, agreements } = await getTeam();

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title="Equipo"
        description="Roles, responsabilidades, compensación y acuerdos"
      />
      <TeamView
        members={members}
        agreements={agreements}
        canManage={can("team.manage")}
      />
    </div>
  );
}
