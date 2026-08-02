import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
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
        <Link href="/dashboard" className={buttonVariants()}>
          Ir al resumen
        </Link>
        <Link href="/projects" className={buttonVariants({ variant: "outline" })}>
          Ver proyectos
        </Link>
      </div>
    </div>
  );
}
