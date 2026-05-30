import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * Badge (Edition 04).
 *
 * Reformulado a mono small-caps tracking 0.16em — pattern de los .pill-*
 * en globals.css pero con variantes "soft" para badges informativos
 * (no urgency primary). Para urgencia/done usar .pill-urgent / .pill-done.
 */
const badge = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-accent-soft text-ink-soft",
        primary: "bg-accent-soft text-ink",
        success: "bg-done-soft text-done",
        warning: "bg-warn-soft text-warn",
        danger: "bg-urgent-soft text-urgent",
        info: "bg-info-soft text-info",
        outline: "border border-rule-strong text-ink-soft",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant }), className)} {...props} />;
}
