import { redirect } from "next/navigation";

// Consolidado en el panel único /admin.
export default function LegacyTeamPage() {
  redirect("/admin");
}
