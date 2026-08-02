import { cn } from "@/lib/utils/cn";
import { IssueNumber } from "./IssueNumber";

interface PageHeaderProps {
  /**
   * Título principal — display 52-56px en Satoshi Bold.
   * Si pasás `subtitle`, se renderiza como drop-line (segunda línea en
   * italic con indent, gesto signature de Edition 04).
   */
  title: string;
  /** Segunda línea italic, indentada — drop-line pattern. */
  subtitle?: string;
  /**
   * Eyebrow corto arriba del título, mono small-caps.
   * Ej: "/ Dashboard" o "/ Proyectos / Aliaga".
   */
  eyebrow?: string;
  /**
   * Líneas para el issue-number en la esquina top-right.
   * Si no se pasa, no se renderiza issue.
   */
  issueLines?: string[];
  /** Acciones a la derecha (botones, etc). Si hay `issueLines`,
   *  actions se muestra debajo del bloque title (no a la derecha). */
  actions?: React.ReactNode;
  /** Descripción opcional debajo del título (body 14px ink-soft). */
  description?: string;
  className?: string;
}

/**
 * PageHeader (Edition 04).
 *
 * Gestos signature:
 * - Eyebrow mono small-caps arriba (`/ dashboard`)
 * - Drop-line title: línea 1 bold + línea 2 italic indentada
 * - IssueNumber en esquina top-right (opcional)
 * - Padding generoso (NOA-style whitespace abundante)
 *
 * Layout: el bloque vive en padding-x 32-40px (el AppShell main no
 * tiene padding interno, las pages controlan su propio padding).
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  issueLines,
  actions,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("relative pb-8", className)}>
      {issueLines && issueLines.length > 0 && (
        <IssueNumber lines={issueLines} className="absolute right-0 top-0" />
      )}

      {eyebrow && <div className="eyebrow-line mb-4">{eyebrow}</div>}

      {/* Display title escalado responsive — 36px en mobile 320px (palabras
          como "Operaciones," ahora caben), crece a 84px en desktop xl. */}
      {/* El título va en <h1>: es el encabezado de la página. Antes era un
          <span>, así que ninguna pantalla tenía h1 y varias no tenían ningún
          heading — sin punto de referencia para lectores de pantalla
          (WCAG 1.3.1 / 2.4.6). El CSS de .title-drop h1 lo deja idéntico. */}
      <div className="title-drop text-[28px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[50px]">
        <h1>{title}</h1>
        {subtitle && <span className="l2">{subtitle}</span>}
      </div>

      {description && (
        <p className="mt-5 max-w-[640px] text-[15px] leading-[1.6] text-ink-soft">
          {description}
        </p>
      )}

      {actions && (
        <div className="mt-6 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
