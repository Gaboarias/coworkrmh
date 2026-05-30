import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,box-shadow,transform] duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px select-none",
  {
    variants: {
      variant: {
        // Primary: gradiente triotone Sunset Aurora con glow coral
        primary:
          "bg-[linear-gradient(135deg,var(--amber),var(--coral),var(--magenta))] text-primary-foreground font-semibold shadow-[0_0_18px_rgba(255,107,107,0.35)] hover:brightness-110",
        // Secondary: glass sólido cálido
        secondary:
          "bg-secondary text-secondary-foreground shadow-elev-1 hover:opacity-90",
        outline:
          "border border-border-strong bg-transparent text-text backdrop-blur-md hover:bg-surface-el",
        ghost: "bg-transparent text-text-muted hover:bg-surface-el hover:text-text",
        danger: "bg-danger text-white shadow-elev-1 hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-sm",
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
