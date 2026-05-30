"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  hydrated: boolean;
}

const SidebarStateContext = createContext<SidebarState | null>(null);

const COLLAPSED_KEY = "pistachio-sidebar-collapsed";

/**
 * SidebarStateProvider — lifts el estado collapsed del Sidebar para
 * que sea accesible desde el Topbar (toggle button visible globalmente)
 * y desde keyboard shortcut (⌘B / Ctrl+B).
 *
 * Persistencia: localStorage `pistachio-sidebar-collapsed`.
 */
export function SidebarStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsedState(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

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
      value={{ collapsed, toggle, setCollapsed, hydrated }}
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
