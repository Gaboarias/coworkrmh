import { redirect } from "next/navigation";

// Consolidado en el panel único /admin → Negocios.
export default function LegacyTeamsPage() {
  redirect("/admin/negocios");
}
