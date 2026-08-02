/**
 * Los módulos del ERP. Fuente única para la navegación y para todo lo que
 * necesite contarlos.
 *
 * Vive acá y NO en `OperationsNav.tsx` por una razón que costó un bug: ese
 * archivo es `"use client"`, y cuando un Server Component importa un valor de
 * un módulo cliente, Next no le entrega el valor — le entrega una **referencia
 * de cliente**. Interpolar eso en un template da `[object Object]`.
 *
 * El compilador no lo ve: en TypeScript el tipo sigue siendo `number`. Se
 * publicó y estuvo visible en el encabezado de Operaciones hasta que lo
 * encontró una corrida de QA.
 *
 * Un módulo sin directiva lo pueden importar los dos lados.
 */
export const OPERATIONS_TABS = [
  { href: "/operations", label: "Resumen", exact: true },
  { href: "/operations/catalogo", label: "Catálogo" },
  { href: "/operations/cotizador", label: "Cotizador" },
  { href: "/operations/ventas", label: "Ventas" },
  { href: "/operations/gastos", label: "Gastos" },
  { href: "/operations/equipo", label: "Roles & acuerdos" },
] as const;

/** Cuántos módulos hay, sin contar "Resumen", que es el índice. */
export const OPERATIONS_MODULE_COUNT = OPERATIONS_TABS.length - 1;
