"use client";

import { useDensity } from "@/lib/hooks/useDensity";
import { cn } from "@/lib/utils/cn";

/**
 * Control compacto/cómodo para las tablas del ERP. Persiste la preferencia.
 */
export function DensityToggle() {
  const [density, set] = useDensity();
  return (
    <div
      role="group"
      aria-label="Densidad de la tabla"
      className="inline-flex items-center gap-0.5 rounded-md border border-rule p-0.5"
    >
      {(["comfortable", "compact"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => set(d)}
          aria-pressed={density === d}
          className={cn(
            "rounded px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
            density === d
              ? "bg-accent-soft text-ink"
              : "text-ink-soft hover:text-ink"
          )}
        >
          {d === "comfortable" ? "Cómodo" : "Compacto"}
        </button>
      ))}
    </div>
  );
}
