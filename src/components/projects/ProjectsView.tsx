"use client";

import { useState } from "react";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
      <div className="mb-2 flex items-center gap-1.5">
        {(
          [
            ["lista", "Lista", List],
            ["tablero", "Tablero", LayoutGrid],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              view === k
                ? "bg-accent-soft text-ink"
                : "text-ink-soft hover:bg-accent-soft hover:text-ink"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {view === "lista" ? (
        <ProjectsExplorer specimens={specimens} buckets={buckets} />
      ) : (
        <ProjectBoard specimens={specimens} buckets={buckets} canEdit={canEdit} />
      )}
    </div>
  );
}
