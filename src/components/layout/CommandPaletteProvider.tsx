"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CommandPalette } from "./CommandPalette";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<CommandPaletteContextValue | null>(null);

/**
 * Provider del Command Palette (⌘K).
 *
 * - Estado global `open` con setter / toggle.
 * - Hotkey ⌘K / Ctrl+K listener montado una sola vez.
 * - Renderiza el componente CommandPalette modal cuando `open=true`.
 *
 * Se monta en AppShell para estar disponible app-wide.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <Ctx.Provider value={{ open, setOpen, toggle }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCommandPalette must be inside CommandPaletteProvider");
  }
  return ctx;
}
