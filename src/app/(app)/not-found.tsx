import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";

/**
 * 404 dentro de la app (con shell y sidebar).
 *
 * Sin este archivo, `notFound()` caía en la página built-in de Next, que se
 * renderiza dentro de (app)/layout.tsx → AppShell. Ese choque producía un
 * "Application error: a client-side exception has occurred" (React #310) en
 * vez de un 404: cualquier link viejo o id inexistente mostraba una pantalla
 * de error rota.
 */
export default function AppNotFound() {
  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ 404"
        title="No encontramos eso,"
        subtitle="puede que se haya movido o borrado."
        description="El enlace puede estar viejo, o el recurso pertenece a otro entorno. Revisá el entorno activo en la barra lateral."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Ir al resumen
        </Link>
        <Link
          href="/projects"
          className="rounded-md border border-rule px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
        >
          Ver proyectos
        </Link>
      </div>
    </div>
  );
}
