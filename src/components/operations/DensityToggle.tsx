"use client";

import { useDensity } from "@/lib/hooks/useDensity";
import { SegmentedNav } from "@/components/ui/SegmentedNav";

/**
 * Control compacto/cómodo para las tablas del ERP. Persiste la preferencia.
 */
export function DensityToggle() {
  const [density, set] = useDensity();
  return (
    <SegmentedNav
      tone="chip"
      label="Densidad de la tabla"
      className="inline-flex gap-1 rounded-md border border-rule p-1"
      active={density}
      onSelect={(d) => set(d as typeof density)}
      items={[
        { key: "comfortable", label: "Cómodo" },
        { key: "compact", label: "Compacto" },
      ]}
    />
  );
}
