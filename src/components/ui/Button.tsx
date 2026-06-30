import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Button (Edition 04).
 *
 * Variants:
 *   primary   — solid ink bg, bg text (default ink en light, bg ink en dark).
 *               No gradient, no glow. Letterspacing tight, weight bold.
 *   secondary — outline con ink border, ink text.
 *   outline   — hairline border, neutral.
 *   ghost     — transparent, hover bg-accent-soft.
 *   danger    — bg-urgent solid + white text.
 *   done      — bg-done solid + white text.
 *
 * Sizes: sm/md/lg/icon. Bordes rounded-md (suaves, no pill).
 */
const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-bold tracking-[-0.005em] transition-[background-color,color,border-color,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:ring-primary",
        secondary:
          "border border-rule-strong bg-transparent text-ink hover:bg-accent-soft focus-visible:ring-primary",
        outline:
          "border border-rule-strong bg-transparent text-ink-soft hover:text-ink hover:border-ink focus-visible:ring-primary",
        ghost:
          "bg-transparent text-ink-soft hover:bg-accent-soft hover:text-ink focus-visible:ring-primary",
        danger:
          "bg-urgent text-white hover:opacity-90 focus-visible:ring-urgent",
        done:
          "bg-done text-white hover:opacity-90 focus-visible:ring-done",
      },
      size: {
        sm: "h-8 px-3 text-[14px]",
        md: "h-9 px-4 text-[15px]",
        lg: "h-10 px-5 text-[16px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
