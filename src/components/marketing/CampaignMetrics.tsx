"use client";

import { useEffect, useState, useCallback } from "react";

type Metrics = {
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
  queued: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
};

const POLL_MS = 5000;

/**
 * Métricas de campaña (Edition 04). Polling cada 5s mientras haya cola.
 * Sin SWR — useEffect + setInterval, igual patrón que NotificationsBell.
 */
export function CampaignMetrics({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/metrics`);
      if (!res.ok) throw new Error("No se pudieron cargar las métricas");
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Polling sólo mientras haya envíos en cola/proceso, y solo con la pestaña
  // visible (una pestaña oculta no necesita refrescar y quema compute de DB).
  useEffect(() => {
    if (!data || data.queued === 0) return;
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [data, load]);

  if (error && !data)
    return <p className="text-[14px] text-urgent">{error}</p>;
  if (!data)
    return <p className="text-[14px] text-ink-soft">Cargando métricas…</p>;

  const stats: { label: string; value: string; accent?: boolean }[] = [
    { label: "Total", value: String(data.total) },
    { label: "Enviados", value: String(data.sent) },
    { label: "Entregados", value: String(data.delivered) },
    { label: "En cola", value: String(data.queued) },
    { label: "Aperturas", value: `${data.uniqueOpens} · ${data.openRate}%`, accent: true },
    { label: "Clics", value: `${data.uniqueClicks} · ${data.clickRate}%`, accent: true },
    { label: "Rebotes", value: `${data.bounced} · ${data.bounceRate}%` },
    { label: "Quejas", value: String(data.complained) },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
            {s.label}
          </dt>
          <dd
            className={
              "text-[30px] font-bold tabular-nums leading-none tracking-[-0.035em] " +
              (s.accent ? "text-accent" : "text-ink")
            }
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
