"use client";

import { TabNav } from "@/components/shared/TabNav";
import { OPERATIONS_TABS } from "@/lib/constants/operationsModules";

/**
 * La lista de módulos NO vive acá.
 *
 * Este archivo es `"use client"`, y un Server Component que importe un valor
 * suyo recibe una referencia de cliente en vez del valor. El dashboard hacía
 * exactamente eso para contar los módulos y publicaba `[object Object]`.
 * La constante vive en `@/lib/constants/operationsModules`, que no tiene
 * directiva y por lo tanto sirve a los dos lados.
 */
export const OperationsNav = () => <TabNav tabs={[...OPERATIONS_TABS]} />;
