import { cn } from "@/lib/utils/cn";

interface HairlineRuleProps {
  label?: string;
  /** Conteo a la derecha de la regla (ej. "3 / 24"). */
  count?: string | number;
  /** Color override del label (default = ink-soft). Usar para
   *  enfatizar con project-color en pantallas de proyecto. */
  labelColor?: string;
  className?: string;
}

/**
 * Hairline rule con label inline — gesto signature de Edition 04.
 *
 * Renderiza:  [LABEL] ──────────────────────── [COUNT]
 *
 * El label se separa de la regla con un gap, NO está sobre la línea.
 * Mono small-caps, lectura como typesetter signature.
 */
export function HairlineRule({
  label,
  count,
  labelColor,
  className,
}: HairlineRuleProps) {
  return (
    <div className={cn("h-rule", className)}>
      {label && (
        <span
          className="lbl"
          style={labelColor ? { color: labelColor } : undefined}
        >
          {label}
        </span>
      )}
      <span className="line" />
      {count !== undefined && <span className="ct">{count}</span>}
    </div>
  );
}
