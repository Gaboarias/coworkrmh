"use client";

import { useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import { SegmentedNav } from "@/components/ui/SegmentedNav";
import {
  ProjectsExplorer,
  type ProjectSpecimen,
  type BucketTab,
} from "./ProjectsExplorer";
import { ProjectBoard } from "./ProjectBoard";

/**
 * Contenedor de /projects con switch Lista | Tablero.
 *  - Lista   → specimens grandes (ProjectsExplorer).
 *  - Tablero → kanban (ProjectBoard) agrupable por categoría o estado.
 */
export function ProjectsView({
  specimens,
  buckets,
  canEdit,
}: {
  specimens: ProjectSpecimen[];
  buckets: BucketTab[];
  canEdit: boolean;
}) {
  const [view, setView] = useState<"lista" | "tablero">("lista");

  return (
    <div>
      <SegmentedNav
        label="Vista de proyectos"
        className="mb-2"
        active={view}
        onSelect={(k) => setView(k as typeof view)}
        items={[
          { key: "lista", label: "Lista", icon: List },
          { key: "tablero", label: "Tablero", icon: LayoutGrid },
        ]}
      />

      {view === "lista" ? (
        <ProjectsExplorer specimens={specimens} buckets={buckets} />
      ) : (
        <ProjectBoard specimens={specimens} buckets={buckets} canEdit={canEdit} />
      )}
    </div>
  );
}
