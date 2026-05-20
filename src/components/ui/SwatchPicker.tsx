"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { readableFg } from "@/lib/utils/color";
import { ENTORNO_SWATCHES } from "@/lib/constants/entornoColors";

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const SwatchPicker = ({ value, onChange, label }: Props) => (
  <div
    role="radiogroup"
    aria-label={label ?? "Color"}
    className="flex flex-wrap gap-1.5"
  >
    {ENTORNO_SWATCHES.map((c) => {
      const selected = value.toLowerCase() === c.toLowerCase();
      return (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-transform duration-200 ease-out hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)]",
            selected && "ring-2 ring-text ring-offset-2 ring-offset-surface"
          )}
          style={{ backgroundColor: c }}
        >
          {selected && (
            <Check className="h-3.5 w-3.5" style={{ color: readableFg(c) }} />
          )}
        </button>
      );
    })}
  </div>
);
