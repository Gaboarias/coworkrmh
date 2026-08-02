"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useSidebarState } from "./SidebarStateContext";

/**
 * SidebarToggle — botón visible en el topbar (left side, junto a
 * breadcrumbs) para colapsar/expandir el sidebar. Mismo estado que
 * el botón interno del Sidebar (via SidebarStateContext).
 *
 * Shortcut: ⌘B / Ctrl+B (manejado en SidebarStateContext).
 *
 * Visual: icono + atajo kbd hint inline para discoverability.
 */
export function SidebarToggle() {
  const { collapsed, toggle, hydrated } = useSidebarState();

  if (!hydrated) {
    return (
      <IconButton label="Colapsar sidebar">
        <PanelLeftClose className="h-4 w-4" />
      </IconButton>
    );
  }

  return (
    <IconButton
      onClick={toggle}
      label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      title={collapsed ? "Expandir sidebar (⌘B)" : "Colapsar sidebar (⌘B)"}
      className="group w-auto gap-2 px-2"
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
      )}
      <kbd className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint group-hover:text-ink-soft sm:inline">
        ⌘B
      </kbd>
    </IconButton>
  );
}
