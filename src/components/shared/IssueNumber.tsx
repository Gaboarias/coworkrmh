import { cn } from "@/lib/utils/cn";

interface IssueNumberProps {
  /** Líneas a renderizar (1-3 strings). Ej:
   *  ["Ed. 04 · MAY 30", "22 / 187 ACTIVAS"]
   *  Cada string se muestra en su propia línea, mono small-caps.
   */
  lines: string[];
  className?: string;
}

/**
 * Issue numeration — gesto signature de Edition 04.
 *
 * Renderiza en la esquina top-right de cada página un bloque mono
 * small-caps con líneas tipo identificador editorial:
 *
 *     Ed. 04 · MAY 30
 *     22 / 187 ACTIVAS
 *
 * Da identidad de "número de revista". Reemplaza el "logged in as X"
 * SaaS-typical. El componente se posiciona absolute por el padre.
 */
export function IssueNumber({ lines, className }: IssueNumberProps) {
  return (
    <div className={cn("issue", className)}>
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}
