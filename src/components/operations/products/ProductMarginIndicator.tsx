import { cn } from "@/lib/utils/cn";

interface Props {
  basePrice: number;
  materialsCost: number;
  laborCost: number;
  className?: string;
}

export function ProductMarginIndicator({
  basePrice,
  materialsCost,
  laborCost,
  className,
}: Props) {
  const cost = materialsCost + laborCost;
  const profit = basePrice - cost;
  const margin = basePrice > 0 ? profit / basePrice : 0;
  const pct = Math.round(margin * 100);

  const tone =
    basePrice <= 0
      ? "neutral"
      : margin >= 0.4
        ? "good"
        : margin >= 0.15
          ? "ok"
          : "bad";

  const toneClass = {
    neutral: "bg-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] text-text-muted",
    good: "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success",
    ok: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning",
    bad: "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-danger",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass,
        className
      )}
      title={`Precio ${basePrice} − costo ${cost} = ${profit}`}
    >
      Margen {basePrice > 0 ? `${pct}%` : "—"}
    </span>
  );
}
