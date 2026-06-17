import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { CampaignMetrics } from "@/components/marketing/CampaignMetrics";
import { formatDateCR } from "@/lib/utils/datetime";
import { requireFeature } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sending: "Enviando",
  sent: "Enviada",
  paused: "Pausada",
  failed: "Falló",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  await requireFeature("blaster");

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, params.id));
  if (!campaign) notFound();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <Link
        href="/marketing"
        className="mb-6 inline-block font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-ink"
      >
        ← Campañas
      </Link>

      <PageHeader
        eyebrow={`/ campañas · ${STATUS_LABEL[campaign.status] ?? campaign.status}`}
        title={campaign.name + ","}
        subtitle={campaign.subject}
        issueLines={[
          formatDateCR(campaign.createdAt),
          `${campaign.fromName}`,
        ]}
      />

      <section>
        <HairlineRule label="Métricas en vivo" />
        <div className="mt-6">
          <CampaignMetrics campaignId={campaign.id} />
        </div>
      </section>

      <section className="mt-14">
        <HairlineRule label="Remitente" />
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label="From" value={`${campaign.fromName} <${campaign.fromEmail}>`} />
          {campaign.replyTo && <Meta label="Reply-to" value={campaign.replyTo} />}
          <Meta label="Bucket" value={campaign.bucketId} />
        </dl>
      </section>

      <section className="mt-14">
        <HairlineRule label="Vista previa del correo" />
        <div className="mt-5 overflow-hidden rounded-lg border border-rule bg-white">
          <iframe
            title="Vista previa"
            srcDoc={campaign.html}
            className="h-[420px] w-full"
            sandbox=""
          />
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </dt>
      <dd className="break-words text-[15px] text-ink">{value}</dd>
    </div>
  );
}
