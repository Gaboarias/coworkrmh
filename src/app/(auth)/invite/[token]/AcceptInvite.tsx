"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { acceptInvite } from "@/lib/actions/invitations";

/**
 * El botón de aceptar, con la sesión ya resuelta del lado del servidor.
 *
 * Al terminar navega DURO a /api/ws/switch en vez de usar el router: hay que
 * dejar el entorno recién aceptado como activo, y esa cookie sólo la puede
 * escribir un Route Handler. Un router.push() de Next devolvería la pantalla
 * con el entorno viejo seleccionado y la persona pensaría que no funcionó.
 */
export const AcceptInvite = ({
  token,
  workspaceName,
}: {
  token: string;
  workspaceName: string;
}) => {
  const [loading, setLoading] = useState(false);

  const accept = async () => {
    setLoading(true);
    try {
      const res = await acceptInvite(token);
      window.location.href = `/api/ws/switch?to=${encodeURIComponent(
        res.workspaceId
      )}&next=${encodeURIComponent("/dashboard")}`;
    } catch (err) {
      toast.error((err as Error).message);
      // No se apaga el loading en el camino feliz: la navegación dura tarda, y
      // volver a habilitar el botón invita a un segundo clic que no hace falta.
      setLoading(false);
    }
  };

  return (
    <Button onClick={accept} loading={loading} size="lg" className="w-full">
      Entrar a {workspaceName}
    </Button>
  );
};
