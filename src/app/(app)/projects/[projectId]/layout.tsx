import { loadProject } from "@/lib/projects/access";

interface LayoutProps {
  children: React.ReactNode;
  params: { projectId: string };
}

/**
 * Layout de proyecto — inyecta --project-color como CSS variable
 * en un wrapper div. Esto hace que TODA la sub-ruta del proyecto
 * (tareas, documentos, notas, historial, settings) absorba el
 * color del proyecto en active states, accent bars, focus rings,
 * etc. — el truco signature de Edition 04.
 *
 * Si el proyecto no tiene color asignado, fallback a ink (default
 * neutro, no genera highlight visual extra).
 */
export default async function ProjectLayout({
  children,
  params,
}: LayoutProps) {
  // El layout envuelve TODAS las sub-rutas del proyecto (tareas, documentos,
  // notas, historial, reportes, settings), así que el guard acá cubre a todas.
  const project = await loadProject(params.projectId);

  const color = project.color ?? "var(--ink)";

  return (
    <div
      style={{ ["--project-color" as string]: color }}
      className="min-h-full"
    >
      {/* Top accent bar — 3px, project-color */}
      <div className="proj-bar" />
      {children}
    </div>
  );
}
