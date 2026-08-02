import { cn } from "@/lib/utils/cn";

/**
 * Table — estructura de tabla del ERP y del admin.
 *
 * Lo que aporta más allá de envolver `<table>`: **la densidad se hereda**. Las
 * celdas usan `py-[var(--erp-row-py)]`, la variable que mueve `DensityToggle`,
 * así que el caller no cablea altura de fila y no puede olvidarse de conectarla.
 * Antes cada vista escribía su propio padding y solo tres de seis respetaban la
 * preferencia del usuario.
 *
 * `Table` ya trae el contenedor con scroll horizontal: una tabla ancha dentro
 * de una pantalla angosta tiene que scrollear en su propia caja, nunca empujar
 * el ancho de la página.
 */

export function Table({
  className,
  containerClassName,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & {
  containerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border border-rule bg-surface",
        containerClassName
      )}
    >
      <table
        className={cn("w-full text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({
  className,
  head,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  /** Fila de encabezado: hairline inferior y tipografía de etiqueta. */
  head?: boolean;
}) {
  return (
    <tr
      className={cn(
        head
          ? "border-b border-rule text-xs text-ink-soft"
          : "border-b border-rule last:border-0",
        className
      )}
      {...props}
    />
  );
}

/** Celda de encabezado. */
export function TableHeadCell({
  className,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
}) {
  return (
    <th
      className={cn(
        "px-3 py-[var(--erp-row-py)] font-medium",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "center" | "right";
}) {
  return (
    <td
      className={cn(
        "px-3 py-[var(--erp-row-py)] text-ink",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  );
}
