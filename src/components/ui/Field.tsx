import { cn } from "@/lib/utils/cn";

/**
 * Campo de formulario con etiqueta visible.
 *
 * Vivía como `FieldWithLabel` dentro de SalesView y estaba por tener una
 * segunda copia en CatalogView. Sube a primitivo antes de duplicarse.
 *
 * El control va DENTRO del `<label>`. Eso los asocia de forma implícita, sin
 * que nadie tenga que inventar y sincronizar un `id`: hacer clic en la etiqueta
 * enfoca el campo, y el lector de pantalla lo anuncia con su nombre. La versión
 * anterior ponía el `<label>` al lado del control sin `htmlFor`, así que no
 * hacía ninguna de las dos cosas — se veía como una etiqueta y no lo era.
 *
 * Por qué importa acá y no es un detalle: el formulario de Catálogo tiene tres
 * campos numéricos seguidos que arrancan en `0`. Tenían `placeholder`, pero un
 * placeholder sólo se ve con el campo vacío, así que en la práctica eran tres
 * cajas idénticas con un cero adentro. Con `aria-label` un lector de pantalla
 * los distinguía y quien mira la pantalla no.
 */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  /** Aclaración corta al lado de la etiqueta: unidad, formato, ejemplo. */
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-xs font-medium text-ink-soft">
        {label}
        {hint && <span className="ml-1 font-normal text-ink-faint">— {hint}</span>}
      </span>
      {children}
    </label>
  );
}
