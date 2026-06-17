"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { HairlineRule } from "@/components/shared/HairlineRule";

type SamplePreview = {
  total: number;
  sample: { email: string; nombre: string; empresa: string | null }[];
};

const DEFAULT_HTML = `<p>Hola {{nombre}},</p>
<p>Escribí acá el cuerpo del correo. Podés usar {{empresa}} también.</p>
<p>Saludos,<br>ReWind Media House</p>`;

/**
 * Builder del Email Blaster (Edition 04). Dos columnas: campaña + segmento.
 * Sin shadcn ni SWR — usa los primitives del proyecto y fetch directo.
 */
export function CampaignBuilder({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    subject: "",
    fromName: "ReWind Media House",
    fromEmail: "",
    replyTo: "",
    html: DEFAULT_HTML,
  });
  const [segment, setSegment] = useState({ status: "", search: "" });
  const [preview, setPreview] = useState<SamplePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const segmentFilter = () => ({
    bucketId,
    status: segment.status || undefined,
    search: segment.search || undefined,
  });

  async function doPreview() {
    setPreviewing(true);
    try {
      const res = await fetch("/api/campaigns/segment-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(segmentFilter()),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setPreview(await res.json());
    } catch (err) {
      toast.error((err as Error).message || "Error al previsualizar");
    } finally {
      setPreviewing(false);
    }
  }

  async function createAndLaunch() {
    if (!form.name.trim() || !form.subject.trim() || !form.fromEmail.trim()) {
      toast.error("Completá nombre, asunto y from email");
      return;
    }
    setSending(true);
    try {
      // 1) crear campaña draft
      const created = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          replyTo: form.replyTo || null,
          bucketId,
          segmentQuery: segmentFilter(),
        }),
      });
      if (!created.ok) throw new Error((await created.json()).error ?? "Error al crear");
      const campaign = await created.json();

      // 2) lanzar (resuelve segmento + encola)
      const launched = await fetch(`/api/campaigns/${campaign.id}/launch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segment: segmentFilter() }),
      });
      if (!launched.ok) throw new Error((await launched.json()).error ?? "Error al lanzar");
      const { queued } = await launched.json();

      toast.success(`${queued} correos encolados. Se envían por lotes (cron c/min).`);
      router.push(`/marketing/${campaign.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Error al enviar");
      setSending(false);
    }
  }

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const canSend =
    !!preview && preview.total > 0 && !!form.fromEmail.trim() && !sending;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* ── Campaña ── */}
      <section>
        <HairlineRule label="Campaña" />
        <div className="mt-5 space-y-4">
          <Field label="Nombre interno">
            <Input
              value={form.name}
              onChange={set("name")}
              placeholder="Ej. Newsletter junio"
            />
          </Field>
          <Field label="Asunto" hint="Admite {{nombre}} y {{empresa}}">
            <Input
              value={form.subject}
              onChange={set("subject")}
              placeholder="Novedades de {{empresa}}"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From name">
              <Input value={form.fromName} onChange={set("fromName")} />
            </Field>
            <Field label="From email" hint="Debe ser un dominio verificado">
              <Input
                value={form.fromEmail}
                onChange={set("fromEmail")}
                placeholder="hola@mkt.rwndmedia.com"
                type="email"
              />
            </Field>
          </div>
          <Field label="Reply-to" hint="Opcional">
            <Input
              value={form.replyTo}
              onChange={set("replyTo")}
              placeholder="respuestas@rwndmedia.com"
              type="email"
            />
          </Field>
          <Field label="HTML del correo" hint="Usa {{nombre}} {{empresa}}">
            <Textarea rows={12} value={form.html} onChange={set("html")} />
          </Field>
        </div>
      </section>

      {/* ── Segmento ── */}
      <section>
        <HairlineRule label="Segmento" count={preview ? `${preview.total}` : undefined} />
        <div className="mt-5 space-y-4">
          <p className="text-[14px] text-ink-soft">
            Los destinatarios salen del CRM (clientes con email), excluyendo
            quienes se dieron de baja o rebotaron.
          </p>
          <Field label="Estado del cliente">
            <Select
              value={segment.status}
              onChange={(e) => setSegment({ ...segment, status: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="active">Activos</option>
              <option value="prospect">Prospectos</option>
              <option value="inactive">Inactivos</option>
            </Select>
          </Field>
          <Field label="Buscar" hint="Empresa, contacto o email">
            <Input
              value={segment.search}
              onChange={(e) => setSegment({ ...segment, search: e.target.value })}
              placeholder="Filtrar…"
            />
          </Field>

          <Button
            variant="secondary"
            onClick={doPreview}
            loading={previewing}
            className="w-full"
          >
            <Eye className="h-4 w-4" />
            Previsualizar segmento
          </Button>

          {preview && (
            <div className="rounded-lg border border-rule bg-bg-2 p-4">
              <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                <Users className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
                {preview.total} destinatario{preview.total === 1 ? "" : "s"}
              </p>
              {preview.sample.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-[13px] text-ink-soft">
                  {preview.sample.map((c) => (
                    <li key={c.email} className="truncate">
                      <span className="text-ink">{c.nombre || "—"}</span> ·{" "}
                      {c.email}
                      {c.empresa ? ` · ${c.empresa}` : ""}
                    </li>
                  ))}
                  {preview.total > preview.sample.length && (
                    <li className="text-ink-faint">
                      …y {preview.total - preview.sample.length} más
                    </li>
                  )}
                </ul>
              )}
              {preview.total === 0 && (
                <p className="mt-2 text-[13px] text-ink-soft">
                  Ningún cliente coincide con este filtro.
                </p>
              )}
            </div>
          )}

          <Button onClick={createAndLaunch} disabled={!canSend} loading={sending} className="w-full">
            <Send className="h-4 w-4" />
            {sending
              ? "Encolando…"
              : `Enviar a ${preview?.total ?? 0} destinatario${preview?.total === 1 ? "" : "s"}`}
          </Button>
          <p className="text-[12px] text-ink-faint">
            Se crea la campaña y se encola el envío. El cron procesa lotes de
            100 por minuto.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
