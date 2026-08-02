import { cn } from "@/lib/utils/cn";

/**
 * StatStrip — fila de cifras.
 *
 * Es un objeto tipográfico, no una grilla de tarjetas: etiqueta chica en mono
 * arriba, cifra grande abajo, sin caja, sin icono de color, sin gradiente.
 * PRODUCT.md nombra la grilla de tarjetas idénticas como anti-referencia
 * explícita, y las tres tarjetas de totales de Ventas eran exactamente eso.
 *
 * Tampoco es la "hero metric" del dashboard SaaS: no hay una cifra gigante con
 * stats de apoyo alrededor. Todas las cifras de la fila pesan lo mismo, y el
 * lector decide cuál le importa (ui-contract.md → Primitivos aún no
 * implementados).
 *
 * Las cifras usan `.kpi-value`, que en globals.css fija `tabular-nums` y
 * `lining-nums`: sin eso las columnas de dinero bailan al cambiar de dígito.
 */

export interface Stat {
  label: string;
  value: React.ReactNode;
  /** Segunda línea opcional: contexto, comparación, unidad. */
  sub?: React.ReactNode;
  /** Semántica de la cifra. Por defecto hereda el color de texto. */
  tone?: "default" | "done" | "urgent" | "warn";
}

const TONE = {
  default: "text-ink",
  done: "text-done",
  urgent: "text-urgent",
  warn: "text-warn",
} as const;

const SIZE = {
  /** Resumen a nivel de página. */
  lg: "text-[34px] leading-none tracking-[-0.035em]",
  /** Totales dentro de una vista, conviviendo con una tabla. */
  md: "text-[22px] leading-none tracking-[-0.025em]",
} as const;

interface StatStripProps {
  items: Stat[];
  size?: keyof typeof SIZE;
  /** Nombre accesible del grupo de cifras. */
  label?: string;
  className?: string;
}

export function StatStrip({
  items,
  size = "lg",
  label,
  className,
}: StatStripProps) {
  return (
    <dl
      aria-label={label}
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-3",
        className
      )}
    >
      {items.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
            {s.label}
          </dt>
          <dd
            className={cn(
              "kpi-value font-bold",
              SIZE[size],
              TONE[s.tone ?? "default"]
            )}
          >
            {s.value}
          </dd>
          {/* Sin itálica: JetBrains Mono no tiene corte itálico y el navegador
              la sintetiza inclinando el glifo, que en monoespaciada se nota
              feo. El contraste con la cifra lo hace el tamaño. */}
          {s.sub && (
            <span className="text-[12px] text-ink-soft">{s.sub}</span>
          )}
        </div>
      ))}
    </dl>
  );
}
