"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "./CommandPaletteProvider";

/**
 * SearchTrigger (Edition 04 · responsive).
 *
 * Desktop (`md:` 768px+): input-like wide con icono + placeholder + kbd hint ⌘K.
 * Mobile (< md): solo icono 36x36, sin texto ni hint (ahorra espacio en topbar).
 *
 * Es un button, no input — abre el Command Palette al hacer click.
 */
export function SearchTrigger() {
  const { setOpen } = useCommandPalette();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Buscar (⌘K)"
      title="Buscar (⌘K)"
      className="group flex h-9 items-center gap-2.5 rounded-md text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:rounded-lg md:border md:border-rule md:bg-surface md:px-3 md:text-[13px] md:hover:border-rule-strong md:min-w-[240px] w-9 justify-center md:w-auto md:justify-start"
    >
      <Search className="h-4 w-4 flex-shrink-0" />
      <span className="hidden flex-1 truncate text-left md:inline">
        Buscar...
      </span>
      <kbd className="hidden rounded border border-rule bg-surface-el px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-faint md:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
