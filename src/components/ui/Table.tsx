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
 *
 * El encabezado queda pegado al scrollear (`sticky`). Es barato y cambia el uso
 * real: en una tabla de doscientos productos, sin eso hay que subir a releer
 * qué columna era cuál.
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
        "overflow-auto rounded-lg border border-rule bg-surface",
        containerClassName
      )}
    >
      {/* 13px y no 14: la mono avanza ~20% más ancha, así que al mismo cuerpo
          entran menos columnas sin que se lea mejor. */}
      <table
        className={cn("w-full text-left text-[13px]", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      // `bg-surface` explícito: sin fondo propio, las filas se ven pasar por
      // debajo del encabezado pegado.
      className={cn("sticky top-0 z-10 bg-surface", className)}
      {...props}
    />
  );
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
          ? "border-b border-rule-strong"
          : // El realce al pasar por encima no es decoración: en una tabla ancha
            // es lo que evita perder el renglón a mitad de camino.
            "border-b border-rule transition-colors last:border-0 hover:bg-surface-2",
        className
      )}
      {...props}
    />
  );
}

/**
 * Celda de encabezado.
 *
 * La etiqueta va en el vocabulario técnico del sistema —caja alta, tracking
 * ancho, tenue— para que la fila de encabezado se distinga del dato por forma y
 * no sólo por posición.
 */
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
        "px-3 py-[var(--erp-row-py)] text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint",
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
        // Una celda alineada a la derecha es, en esta app, siempre un número.
        // Las cifras se comparan de a columnas, así que van tabulares por
        // definición en vez de depender de que el caller se acuerde.
        align === "right" && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  );
}
