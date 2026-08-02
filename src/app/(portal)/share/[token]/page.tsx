/**
 * Vista pública de un proyecto compartido por link.
 *
 * Vive en `(portal)` y no en `(app)` por lo mismo que el portal del cliente:
 * sin sesión, sin sidebar, y siempre en claro. Quien abre esto es alguien de
 * afuera — no hereda el tema de nadie ni ve el cromo de la app.
 *
 * Todo lo que se pinta acá sale de `getSharedProject`, que tiene la lista
 * cerrada de campos. Si algo hace falta, se agrega ALLÁ y con el motivo
 * escrito, no se resuelve trayendo otra query desde esta página.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Circle, Clock, Eye } from "lucide-react";
import { getSharedProject } from "@/lib/actions/projectShares";
import { formatDateCR } from "@/lib/utils/datetime";

export const metadata: Metadata = {
  title: "Avance del proyecto — Pistachio",
  // Un link compartido indexado sería el fin del "secreto" del token.
  robots: { index: false, follow: false },
};

const ESTADO: Record<string, string> = {
  active: "Activo",
  paused: "En pausa",
  in_review: "En revisión",
  stopped: "Detenido",
  completed: "Completado",
  archived: "Archivado",
};

const TAREA: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  todo: { label: "Por hacer", icon: <Circle className="h-3.5 w-3.5" />, color: "#8a8378" },
  in_progress: { label: "En progreso", icon: <Clock className="h-3.5 w-3.5" />, color: "#2e52d9" },
  review: { label: "En revisión", icon: <Clock className="h-3.5 w-3.5" />, color: "#e89a0d" },
  done: { label: "Listo", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#1f7a4d" },
};

export default async function SharedProjectPage({
  params,
}: {
  params: { token: string };
}) {
  const p = await getSharedProject(params.token);

  // Un link revocado, vencido o inventado dan todos lo mismo: 404. Acá sí
  // conviene no distinguirlos — a diferencia de una invitación, del otro lado
  // no hay nadie a quien ayudar a resolverlo, y "este link existió" es
  // información que no le debemos a un desconocido.
  if (!p) notFound();

  const pct =
    p.counts.total === 0
      ? 0
      : Math.round((p.counts.done / p.counts.total) * 100);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12" style={{ color: "#1a1a24" }}>
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#8a8378]">
          {p.workspaceName}
        </p>
        <div className="flex items-start gap-3">
          {p.color && (
            <span
              aria-hidden
              className="mt-1.5 h-4 w-4 shrink-0 rounded-sm"
              style={{ background: p.color }}
            />
          )}
          <h1 className="text-2xl font-bold leading-tight">{p.projectName}</h1>
        </div>
        {p.description && (
          <p className="mt-3 text-sm leading-relaxed text-[#524d44]">
            {p.description}
          </p>
        )}
      </header>

      <section className="mb-8 rounded-lg border border-[#e5e0d5] bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium">
            {ESTADO[p.status] ?? p.status}
          </span>
          <span className="text-sm tabular-nums text-[#524d44]">
            {p.counts.done} de {p.counts.total} listas
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[#eeeae0]"
          role="img"
          aria-label={`Avance: ${pct} por ciento`}
        >
          <div
            className="h-full rounded-full bg-[#1f7a4d]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {(p.startDate || p.dueDate) && (
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-[#eeeae0] pt-4 text-sm">
            {p.startDate && (
              <div>
                <dt className="text-xs text-[#8a8378]">Inicio</dt>
                <dd>{formatDateCR(p.startDate)}</dd>
              </div>
            )}
            {p.dueDate && (
              <div>
                <dt className="text-xs text-[#8a8378]">Entrega</dt>
                <dd>{formatDateCR(p.dueDate)}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {p.tasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-[#8a8378]">
            Tareas
          </h2>
          <ul className="divide-y divide-[#eeeae0] rounded-lg border border-[#e5e0d5] bg-white">
            {p.tasks.map((t) => {
              const s = TAREA[t.status] ?? TAREA.todo;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span aria-hidden style={{ color: s.color }}>
                    {s.icon}
                  </span>
                  <span
                    className={
                      "min-w-0 flex-1 truncate text-sm " +
                      (t.status === "done" ? "text-[#8a8378]" : "")
                    }
                  >
                    {t.title}
                  </span>
                  {t.dueDate && (
                    <span className="shrink-0 text-xs tabular-nums text-[#8a8378]">
                      {formatDateCR(t.dueDate)}
                    </span>
                  )}
                  <span className="sr-only">{s.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer className="mt-10 flex items-start gap-2 border-t border-[#e5e0d5] pt-5 text-xs leading-relaxed text-[#8a8378]">
        <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          Vista de sólo lectura. Muestra el avance del proyecto — no incluye
          montos, documentos ni conversaciones del equipo. Quien te compartió
          este link puede darlo de baja cuando quiera.
        </p>
      </footer>
    </main>
  );
}
