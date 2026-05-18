import { redirect } from "next/navigation";

// Cobros consolidados dentro de Operaciones → Clientes (por negocio).
export default function CRMPaymentsPage() {
  redirect("/operations");
}
