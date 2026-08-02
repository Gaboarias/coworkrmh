import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * IconButton — botón cuadrado sin texto.
 *
 * Existían diez escrituras distintas de esto (h-7/h-8/h-9/p-1/p-2, rounded-md
 * vs rounded-lg, y cuatro vocabularios de token para el mismo gris:
 * `text-ink-soft`, `text-ink-soft`, `text-ink-faint`, `text-ink-faint`,
 * que en globals.css son alias del mismo par de variables). Acá hay una.
 *
 * El hover unificado es `accent-soft`, no `surface-el` ni `background`: es lo que
 * ya usaba el primitivo `Button` en su variante ghost, y los otros dos daban un
 * hover neutro en una superficie y uno más oscuro en otra.
 *
 * `label` es obligatorio a propósito. Un botón de solo icono sin nombre
 * accesible es invisible para un lector de pantalla, y el compilador es el único
 * que se va a acordar de pedirlo (PRODUCT.md → WCAG 2.1 AA).
 *
 * Para un `<a>` de descarga con la misma pinta, usar `iconButtonVariants(...)`.
 */
export const iconButtonVariants = cva(
  "inline-flex flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        /** Acción normal — el gris de texto secundario. */
        default: "text-ink-soft hover:bg-accent-soft hover:text-ink",
        /** Acción terciaria: cerrar, colapsar, adjuntos. Arranca más apagado. */
        faint: "text-ink-faint hover:bg-accent-soft hover:text-ink",
        /** Destructiva. Se pinta solo en hover — en reposo no grita. */
        danger: "text-ink-faint hover:bg-urgent-soft hover:text-urgent",
      },
      size: {
        sm: "h-7 w-7",
        md: "h-8 w-8",
        lg: "h-9 w-9",
      },
    },
    defaultVariants: { tone: "default", size: "md" },
  }
);

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">,
    VariantProps<typeof iconButtonVariants> {
  /** Nombre accesible. Se usa como `aria-label` y como tooltip nativo. */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, tone, size, label, title, children, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={title ?? label}
      className={cn(iconButtonVariants({ tone, size }), className)}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = "IconButton";
