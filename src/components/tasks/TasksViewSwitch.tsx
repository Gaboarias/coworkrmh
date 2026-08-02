"use client";

import { List, CalendarDays } from "lucide-react";
import { SegmentedNav } from "@/components/ui/SegmentedNav";

/**
 * Switch de vista del área de tareas: Lista (/my-tasks) | Calendario (/calendar).
 * Unifica ambas como dos vistas de una misma sección sin fusionar datos —
 * Calendario sale del sidebar y se accede desde acá.
 */
export function TasksViewSwitch() {
  return (
    <SegmentedNav
      label="Vista de tareas"
      className="mb-6"
      items={[
        { href: "/my-tasks", label: "Lista", icon: List },
        { href: "/calendar", label: "Calendario", icon: CalendarDays },
      ]}
    />
  );
}
