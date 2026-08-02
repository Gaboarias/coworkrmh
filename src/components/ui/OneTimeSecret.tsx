"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/**
 * El panel de "copialo ahora, no se vuelve a mostrar".
 *
 * Existe porque los links de invitación y los de proyecto guardan sólo el
 * hash del token: el valor en claro aparece una vez, en la respuesta de
 * creación, y después no hay forma de recuperarlo. Eso hay que decirlo en la
 * pantalla o la persona cierra el modal y pierde el link sin entender por qué.
 *
 * Lo que hace que valga como primitivo y no como dos copias: el fallback de
 * copiado. `navigator.clipboard` no existe en contexto inseguro y falla si el
 * navegador no dio permiso — dejar el `catch` vacío deja al usuario apretando
 * un botón que no hace nada. Acá el texto queda seleccionable y el error lo
 * dice.
 */
export function OneTimeSecret({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar — seleccionalo y copialo a mano");
    }
  };

  return (
    <div
      className={cn(
        "rounded-md border border-accent/40 bg-accent-soft px-4 py-3",
        className
      )}
    >
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        Copialo ahora — no se vuelve a mostrar
      </p>
      <div className="flex items-center gap-2">
        {/* `select-all` para que el fallback manual sea un clic, no arrastrar
            con el mouse sobre un texto largo que se corta. */}
        <code className="min-w-0 flex-1 select-all truncate rounded-sm bg-surface px-2 py-1.5 text-xs text-ink">
          {url}
        </code>
        <Button size="sm" variant="outline" onClick={copy} type="button">
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        En la base sólo queda el hash del token. Si se pierde, se da de baja
        este link y se genera otro.
      </p>
    </div>
  );
}
