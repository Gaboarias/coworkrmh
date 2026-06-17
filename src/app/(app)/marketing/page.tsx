import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/PageHeader";
import { HairlineRule } from "@/components/shared/HairlineRule";
import { CampaignBuilder } from "@/components/marketing/CampaignBuilder";
import { DEFAULT_BUCKET } from "@/lib/marketing/constants";
import { formatDateCR } from "@/lib/utils/datetime";
import { requireFeature } from "@/lib/workspace";

export const metadata = { title: "Campañas — Pistachio" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programada",
  sending: "Enviando",
  sent: "Enviada",
  paused: "Pausada",
  failed: "Falló",
};

export default async function MarketingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  await requireFeature("blaster");

  const rows = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt))
    .limit(50);

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <PageHeader
        eyebrow="/ campañas"
        title="Email blaster,"
        subtitle="campañas masivas."
        issueLines={[`${rows.length} campaña${rows.length === 1 ? "" : "s"}`, "RMH"]}
      />

      <CampaignBuilder bucketId={DEFAULT_BUCKET} />

      <section className="mt-16">
        <HairlineRule label="Historial" count={`${rows.length}`} />
        {rows.length === 0 ? (
          <p className="mt-5 text-[15px] text-ink-soft">
            Todavía no hay campañas. Creá la primera arriba.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-rule">
            {rows.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/marketing/${c.id}`}
                  className="row-hover -mx-3 flex items-center gap-4 rounded-md px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold text-ink">
                      {c.name}
                    </p>
                    <p className="truncate text-[14px] text-ink-soft">
                      {c.subject}
                    </p>
                  </div>
                  <span className="hidden font-mono text-[12px] uppercase tracking-[0.14em] text-ink-faint sm:block">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  <span className="hidden text-[13px] text-ink-faint md:block">
                    {formatDateCR(c.createdAt)}
                  </span>
                  <span className="font-mono text-[12px] text-ink-faint">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
