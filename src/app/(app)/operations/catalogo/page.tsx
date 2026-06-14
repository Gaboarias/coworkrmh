import { getActiveWorkspaceWithPermissions } from "@/lib/workspace";
import { listProducts } from "@/lib/actions/erpProducts";
import { PageHeader } from "@/components/shared/PageHeader";
import { OperationsNav } from "@/components/operations/OperationsNav";
import { NoEntorno } from "@/components/operations/NoEntorno";
import { CatalogView } from "@/components/operations/CatalogView";

export default async function CatalogoPage() {
  const { ws, can } = await getActiveWorkspaceWithPermissions();
  if (!ws) return <NoEntorno title="Catálogo" />;
  const products = await listProducts();

  return (
    <div className="animate-fade-in px-8 py-10 md:px-12 lg:px-14">
      <OperationsNav />
      <PageHeader
        eyebrow="/ operations / catálogo"
        title="Catálogo,"
        subtitle="productos del estudio."
        issueLines={[`${products.length} PRODUCTOS`, ws.name.toUpperCase()]}
      />
      <CatalogView products={products} canManage={can("catalog.manage")} />
    </div>
  );
}
