import { redirect } from "next/navigation";

// CRM consolidado dentro de Operaciones (clientes/cobros por negocio).
export default function CRMPage() {
  redirect("/operations");
}
