"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "./CommandPaletteProvider";

/**
 * Botón en el Topbar que abre el Command Palette.
 * Visual: input-like con icono + placeholder + hint ⌘K (es un button, no input).
 */
export function SearchTrigger() {
  const { setOpen } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Buscar (⌘K)"
      className="group flex h-9 items-center gap-2.5 rounded-lg border border-border bg-surface px-3 text-sm text-text-tertiary transition-colors hover:border-border-strong hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--coral)_35%,transparent)] sm:min-w-[260px]"
    >
      <Search className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate text-left">Buscar...</span>
      <kbd className="rounded border border-border bg-surface-el px-1.5 py-0.5 font-mono text-[10px] font-medium text-text-tertiary">
        ⌘K
      </kbd>
    </button>
  );
}
