import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Button (Consola).
 *
 * Siguen siendo dos voces, no seis — pero ya no se distinguen por familia,
 * porque en Consola toda la interfaz es monoespaciada. La distinción pasa a la
 * caja:
 *
 *   SÓLIDAS (primary / danger / done) — MAYÚSCULA con tracking ancho. Es la
 *     única tipografía con permiso para levantar la voz, así que va sólo en la
 *     acción principal y en las destructivas, que tienen que pesar.
 *   CALLADAS (secondary / outline / ghost) — caja baja, tracking neutro.
 *
 * Que las dos voces compartan familia las acerca, y eso es correcto: la
 * jerarquía la marcan el relleno sólido y la caja alta, no dos tipografías
 * compitiendo.
 *
 * El cuerpo sigue fuera de `size` porque las dos voces no escalan igual: la
 * mayúscula con tracking ocupa ópticamente más que la caja baja al mismo px.
 * `size` define la caja (alto + padding) y los compoundVariants ponen el cuerpo.
 *
 * Los altos NO bajan al 26px de la maqueta de Consola: un control tiene que
 * poder tocarse. La densidad de la dirección se paga en las filas de tabla,
 * que se leen, no en los botones, que se apuntan.
 *
 * Para un `<Link>` o un `<a>` con pinta de botón, usar `buttonVariants(...)` en
 * vez de duplicar las clases a mano.
 */

/** Mayúscula + tracking ancho. La voz alta del sistema. */
const LOUD = "font-semibold uppercase tracking-[0.16em]";
/** Caja baja, tracking neutro. La voz normal. */
const QUIET = "font-medium tracking-[0.005em]";

const SOLID = ["primary", "danger", "done"] as const;
const SUBDUED = ["secondary", "outline", "ghost"] as const;

export const buttonVariants = cva(
  // `font-mono` explícito y no heredado: un botón dentro de `.prose` (el editor
  // de notas) heredaría la cara de lectura. Un control es cromo esté donde esté.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-mono transition-[background-color,color,border-color,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none",
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
      // Voz normal. Un escalón por debajo de los px de Satoshi: la mono avanza
      // ~20% más ancha, así que a 15px el botón crecía sin ganar legibilidad.
      { variant: [...SUBDUED], class: QUIET },
      { variant: [...SUBDUED], size: "sm", class: "text-[12px]" },
      { variant: [...SUBDUED], size: "md", class: "text-[13px]" },
      { variant: [...SUBDUED], size: "lg", class: "text-[14px]" },
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
