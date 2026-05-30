"use client";

import { TabNav } from "@/components/shared/TabNav";

/**
 * Tabs del detalle de proyecto. Reusa el TabNav compartido (mismo
 * visual pattern que OperationsNav, integración visual N6).
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const tabs = [
    { href: `/projects/${projectId}`, label: "Tareas", exact: true },
    { href: `/projects/${projectId}/documents`, label: "Documentos" },
    { href: `/projects/${projectId}/notes`, label: "Notas" },
    { href: `/projects/${projectId}/changelog`, label: "Historial" },
    { href: `/projects/${projectId}/settings`, label: "Config." },
  ];
  return <TabNav tabs={tabs} />;
}
