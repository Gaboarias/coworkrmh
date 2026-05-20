import { Layers } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export const NoEntorno = ({ title }: { title: string }) => (
  <div className="animate-fade-in p-6 md:p-8">
    <PageHeader title={title} />
    <EmptyState
      icon={<Layers className="h-12 w-12" />}
      title="Sin entorno"
      description="No perteneces a ningún entorno. Pedile a un administrador que te asigne o cree uno."
    />
  </div>
);
