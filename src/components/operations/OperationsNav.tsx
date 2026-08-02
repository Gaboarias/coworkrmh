"use client";

import { TabNav } from "@/components/shared/TabNav";

const tabs = [
  { href: "/operations", label: "Resumen", exact: true },
  { href: "/operations/catalogo", label: "Catálogo" },
  { href: "/operations/cotizador", label: "Cotizador" },
  { href: "/operations/ventas", label: "Ventas" },
  { href: "/operations/gastos", label: "Gastos" },
  { href: "/operations/equipo", label: "Roles & acuerdos" },
];

/**
 * Cuántos módulos tiene el ERP, sin contar "Resumen", que es el índice.
 *
 * Sale de acá porque esta lista es la navegación real: el dashboard tenía su
 * propia copia de los cinco módulos y las dos podían separarse sin que nada
 * fallara.
 */
export const OPERATIONS_MODULE_COUNT = tabs.length - 1;

export const OperationsNav = () => <TabNav tabs={tabs} />;
