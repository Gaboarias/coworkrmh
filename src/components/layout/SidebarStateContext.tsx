"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface SidebarState {
  /** Estado colapsado en desktop — controla 228px ↔ 56px. Persistido. */
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  hydrated: boolean;
  /** Si el viewport es mobile (< md 768px). Affects sidebar render mode. */
  isMobile: boolean;
  /** En mobile: si el sidebar drawer está abierto (overlay). NO persistido. */
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarStateContext = createContext<SidebarState | null>(null);

const COLLAPSED_KEY = "pistachio-sidebar-collapsed";
const MOBILE_BREAKPOINT = 768; // matches Tailwind `md`

/**
 * SidebarStateProvider — coordinado el sidebar entre desktop y mobile.
 *
 * Desktop (≥ md 768px):
 *   - `collapsed` controla 228 ↔ 56px, persistido en localStorage
 *   - `toggle()` flipea entre los dos modos
 *
 * Mobile (< md 768px):
 *   - El sidebar vive como drawer/overlay, oculto por default
 *   - `mobileOpen` controla si el overlay está visible
 *   - `toggle()` abre/cierra el overlay en lugar de cambiar width
 *   - `collapsed` se ignora en mobile (no aplica)
 *
 * Shortcut ⌘B / Ctrl+B funciona en ambos modos (desktop toggle, mobile open/close).
 *
 * Persistencia: `pistachio-sidebar-collapsed` para el modo desktop sólo.
 */
export function SidebarStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hydration: leer localStorage + detectar viewport en mount.
  useEffect(() => {
    try {
      setCollapsedState(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  // Media query para mobile detection — escucha resize/orientation change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Si pasamos de mobile → desktop, cerrar drawer móvil (queda como artifact).
  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
  }, [isMobile, mobileOpen]);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((o) => !o);
      return;
    }
    setCollapsedState((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [isMobile]);

  // Keyboard shortcut: ⌘B (Mac) / Ctrl+B (Windows/Linux)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <SidebarStateContext.Provider
      value={{
        collapsed,
        toggle,
        setCollapsed,
        hydrated,
        isMobile,
        mobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState() {
  const ctx = useContext(SidebarStateContext);
  if (!ctx)
    throw new Error(
      "useSidebarState debe usarse dentro de <SidebarStateProvider>"
    );
  return ctx;
}
