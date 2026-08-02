import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Button (Edition 04).
 *
 * Dos voces, no seis. Ver PRODUCT.md, principio 1 ("una voz alta por pantalla"):
 *
 *   SÓLIDAS (primary / danger / done) — hablan en mono + MAYÚSCULA con tracking
 *     0.16em, el mismo lenguaje que `.eyebrow`, `.pill` y `.h-rule .lbl` en
 *     globals.css. Es la única tipografía con permiso para levantar la voz, así
 *     que va sólo en la acción principal (y en las destructivas, que tienen que
 *     pesar — principio 5).
 *   CALLADAS (secondary / outline / ghost) — sentence-case, Satoshi bold,
 *     tracking apretado. Todo lo demás.
 *
 * El tamaño de letra no vive en `size` porque las dos voces no escalan igual:
 * 12px en mono-mayúscula ocupa ópticamente lo mismo que 15px en Satoshi. `size`
 * define la caja (alto + padding) y los compoundVariants ponen el cuerpo.
 *
 * Para un `<Link>` o un `<a>` con pinta de botón, usar `buttonVariants(...)` en
 * vez de duplicar las clases a mano.
 */

/** Mono + mayúscula + tracking ancho. La voz alta del sistema. */
const LOUD = "font-mono font-semibold uppercase tracking-[0.16em]";
/** Satoshi bold, sentence-case. La voz normal. */
const QUIET = "font-bold tracking-[-0.005em]";

const SOLID = ["primary", "danger", "done"] as const;
const SUBDUED = ["secondary", "outline", "ghost"] as const;

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[background-color,color,border-color,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none",
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
          "bg-urgent text-on-solid hover:opacity-90 focus-visible:ring-urgent",
        done: "bg-done text-on-solid hover:opacity-90 focus-visible:ring-done",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-10 px-5",
        icon: "h-9 w-9 p-0",
      },
    },
    compoundVariants: [
      // Voz alta: mono en mayúscula, un escalón por debajo en px.
      { variant: [...SOLID], class: LOUD },
      { variant: [...SOLID], size: "sm", class: "text-[11px]" },
      { variant: [...SOLID], size: "md", class: "text-[12px]" },
      { variant: [...SOLID], size: "lg", class: "text-[13px]" },
      // Voz normal.
      { variant: [...SUBDUED], class: QUIET },
      { variant: [...SUBDUED], size: "sm", class: "text-[14px]" },
      { variant: [...SUBDUED], size: "md", class: "text-[15px]" },
      { variant: [...SUBDUED], size: "lg", class: "text-[16px]" },
      // `icon` no lleva texto: sin cuerpo, sin tracking que descentre el glifo.
      { size: "icon", class: "tracking-normal" },
    ],
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";
