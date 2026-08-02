"use client";

import { FileText, StickyNote } from "lucide-react";
import { SegmentedNav } from "@/components/ui/SegmentedNav";

/**
 * Sub-nav del área "Contenido" del proyecto: Archivos (documentos) | Notas.
 * Unifica las dos secciones bajo una sola pestaña sin tocar sus modelos de
 * datos ni el editor colaborativo — solo presentación.
 */
export function ContentSubNav({ projectId }: { projectId: string }) {
  return (
    <SegmentedNav
      label="Contenido del proyecto"
      className="mb-6"
      items={[
        {
          href: `/projects/${projectId}/documents`,
          label: "Archivos",
          icon: FileText,
        },
        {
          href: `/projects/${projectId}/notes`,
          label: "Notas",
          icon: StickyNote,
        },
      ]}
    />
  );
}
