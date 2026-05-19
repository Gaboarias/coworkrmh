import { getActiveWorkspace } from "@/lib/workspace";
import { listProducts } from "@/lib/actions/erp";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { CatalogView } from "@/components/operations/CatalogView";

export default async function CatalogoPage() {
  const ws = await getActiveWorkspace();
  if (!ws) return <NoEntorno title="Catálogo" />;
  const products = await listProducts();

  return (
    <div className="animate-fade-in p-6 md:p-8">
      <OperationsNav />
      <PageHeader
        title={`Catálogo · ${ws.name}`}
        description="Productos, costos y margen"
      />
      <CatalogView products={products} />
    </div>
  );
}
