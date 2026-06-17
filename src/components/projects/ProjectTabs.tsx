"use client";

import { TabNav } from "@/components/shared/TabNav";

/**
 * Tabs del detalle de proyecto. Reusa el TabNav compartido (mismo
 * visual pattern que OperationsNav, integración visual N6).
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const tabs = [
    { href: `/projects/${projectId}`, label: "Tareas", exact: true },
    {
      href: `/projects/${projectId}/documents`,
      label: "Contenido",
      match: [`/projects/${projectId}/notes`],
    },
    { href: `/projects/${projectId}/reports`, label: "Reportes" },
    { href: `/projects/${projectId}/settings`, label: "Config." },
  ];
  return <TabNav tabs={tabs} />;
}
