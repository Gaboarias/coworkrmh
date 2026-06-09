"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
      <button
        type="button"
        aria-label="Toggle sidebar"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft"
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      title={collapsed ? "Expandir sidebar (⌘B)" : "Colapsar sidebar (⌘B)"}
      className="group inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
    >
      {collapsed ? (
        <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
      )}
      <kbd className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint group-hover:text-ink-soft sm:inline">
        ⌘B
      </kbd>
    </button>
  );
}
