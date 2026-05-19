import { redirect } from "next/navigation";

interface PageProps {
  params: { bucketId: string };
}

// Consolidado en el panel único /admin/negocios/[bucketId].
export default function LegacyBucketTeamPage({ params }: PageProps) {
  redirect(`/admin/negocios/${params.bucketId}`);
}
