"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Check, Unlink } from "lucide-react";
import { toast } from "sonner";
import { disconnectCalendar } from "@/lib/actions/calendar";
import { HairlineRule } from "@/components/shared/HairlineRule";

interface CalendarConnectionsProps {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

/**
 * Sección "Calendarios" de /settings. Conectar / estado / desconectar el
 * calendario del correo (Google) para mostrar reuniones en /calendar.
 * Si OAuth no está configurado en el server, muestra estado informativo.
 */
export function CalendarConnections({
  configured,
  connected,
  email,
}: CalendarConnectionsProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);

  // Toast según el resultado del callback OAuth (?calendar=...).
  useEffect(() => {
    const r = params.get("calendar");
    if (!r) return;
    if (r === "connected") toast.success("Calendario conectado");
    else if (r === "error") toast.error("No se pudo conectar el calendario");
    else if (r === "unconfigured")
      toast.error("La integración de calendario no está configurada");
    if (r) router.replace("/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleDisconnect() {
    if (!confirm("¿Desconectar el calendario? Dejarás de ver tus reuniones."))
      return;
    setBusy(true);
    try {
      await disconnectCalendar();
      toast.success("Calendario desconectado");
      router.refresh();
    } catch {
      toast.error("Error al desconectar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <HairlineRule label="Calendarios" />
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-rule bg-surface-el p-4">
        <CalendarClock
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink-faint"
          strokeWidth={1.75}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-ink">Google Calendar</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Conectá tu calendario para ver tus reuniones dentro del calendario
            de Pistachio. Solo lectura.
          </p>

          {!configured ? (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              No configurado — falta el setup OAuth en el servidor.
            </p>
          ) : connected ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Check className="h-3.5 w-3.5 text-[var(--done)]" />
                Conectado{email ? ` · ${email}` : ""}
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:border-urgent hover:text-urgent disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" />
                {busy ? "Desconectando…" : "Desconectar"}
              </button>
            </div>
          ) : (
            <a
              href="/api/calendar/google/connect"
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2 font-mono text-[12px] uppercase tracking-[0.16em] text-bg transition-colors hover:bg-ink-soft"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Conectar Google Calendar
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
