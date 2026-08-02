import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Enlace de vuelta al listado, encima del PageHeader. Tres páginas lo escribían
 * carácter por carácter con la misma cadena de clases.
 *
 * Habla en mono/mayúscula igual que el CTA sólido, pero sin fondo: es el mismo
 * lenguaje de etiqueta técnica que `.eyebrow`, no una segunda acción principal.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-6 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-ink",
        className
      )}
    >
      <ChevronLeft className="h-3 w-3" />
      {children}
    </Link>
  );
}
