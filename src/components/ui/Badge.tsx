import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral:
          "bg-[color-mix(in_oklab,var(--text-tertiary)_16%,transparent)] text-text-muted",
        primary:
          "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary",
        success:
          "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success",
        warning:
          "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning",
        danger:
          "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-danger",
        info: "bg-[color-mix(in_oklab,var(--info)_18%,transparent)] text-info",
        outline: "border border-border text-text-muted",
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
