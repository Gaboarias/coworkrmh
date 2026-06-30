"use client";

import { useEffect, useState } from "react";

export type Density = "comfortable" | "compact";

/**
 * Densidad de tablas ERP. Persistida en localStorage y aplicada como
 * data-density en <html> → la var CSS --erp-row-py reacciona (ver globals.css).
 * Scope: solo afecta filas que usan py-[var(--erp-row-py)] (las tablas ERP).
 */
export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    const saved =
      (localStorage.getItem("erp-density") as Density | null) ?? "comfortable";
    setDensity(saved);
    document.documentElement.dataset.density = saved;
  }, []);

  const set = (d: Density) => {
    setDensity(d);
    localStorage.setItem("erp-density", d);
    document.documentElement.dataset.density = d;
  };

  return [density, set];
}
