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

export const OperationsNav = () => <TabNav tabs={tabs} />;
