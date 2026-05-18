import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { canAccessBucket } from "@/lib/access";
import { getQuote } from "@/lib/actions/quotes";
import { PageHeader } from "@/components/shared/PageHeader";
import { QuoteForm } from "@/components/operations/quotes/QuoteForm";

export default async function EditQuotePage({
  params,
}: {
  params: { bucketId: string; quoteId: string };
}) {
  const { bucketId, quoteId } = params;
  if (!(await canAccessBucket(bucketId))) redirect("/operations");
  const res = await getQuote(quoteId);
  if (!res.success) notFound();

  return (
    <div className="animate-fade-in mx-auto max-w-3xl p-6 md:p-8">
      <Link
        href={`/operations/${bucketId}/quotes`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="h-4 w-4" />
        Cotizaciones
      </Link>
      <PageHeader title={res.data.title} />
      <QuoteForm bucketId={bucketId} quote={res.data} />
    </div>
  );
}
