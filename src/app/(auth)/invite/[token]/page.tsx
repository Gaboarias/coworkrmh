/**
 * Pantalla de invitación a un entorno.
 *
 * Vive en (auth) y no en (app) por una razón concreta: quien llega acá puede
 * no tener cuenta todavía. El layout de (app) exige sesión y un entorno activo
 * — las dos cosas que esta pantalla existe para conseguir.
 *
 * Muestra a qué te invitan ANTES de pedirte registrarte. Al revés (registrate
 * primero y después te decimos) es cómo se ve una estafa.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getInvitePreview } from "@/lib/actions/invitations";
import { Card, CardContent } from "@/components/ui/Card";
import { BUILTIN_ROLE_LABELS } from "@/lib/constants/workspacePermissions";
import { buttonVariants } from "@/components/ui/Button";
import { AcceptInvite } from "./AcceptInvite";

export const metadata: Metadata = {
  title: "Invitación — Pistachio",
  // Un link de invitación indexado por Google sería el peor final posible
  // para todo este diseño.
  robots: { index: false, follow: false },
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-fade-in">
    <div className="mb-8 text-center">
      <img
        src="/pistachio-logo.svg"
        alt=""
        className="mx-auto mb-4 h-12 w-12 rounded-xl"
      />
      <h1 className="text-2xl font-bold text-ink">Pistachio</h1>
      <p className="mt-1 text-sm text-ink-soft">Rewind Media House</p>
    </div>
    <Card>
      <CardContent className="p-8">{children}</CardContent>
    </Card>
  </div>
);

/** Los tres finales muertos comparten forma; sólo cambia por qué. */
const DeadEnd = ({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) => (
  <Shell>
    <h2 className="mb-2 text-xl font-semibold text-ink">{title}</h2>
    <p className="text-sm leading-relaxed text-ink-soft">{detail}</p>
    <Link
      href="/login"
      className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-6"}
    >
      Ir a iniciar sesión
    </Link>
  </Shell>
);

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const [preview, session] = await Promise.all([
    getInvitePreview(params.token),
    auth(),
  ]);

  if (preview.status === "invalid") {
    return (
      <DeadEnd
        title="Este link no sirve"
        detail="Puede estar incompleto por cómo se copió, o la invitación pudo haberse eliminado. Pedile a quien te lo mandó que genere uno nuevo."
      />
    );
  }
  if (preview.status === "expired") {
    return (
      <DeadEnd
        title="La invitación venció"
        detail={`El link para entrar a "${preview.workspaceName}" ya pasó su fecha de vencimiento. Pedí uno nuevo — se genera en un segundo.`}
      />
    );
  }
  if (preview.status === "revoked") {
    return (
      <DeadEnd
        title="La invitación fue revocada"
        detail={`Alguien con permisos sobre "${preview.workspaceName}" dio de baja este link. Si creés que es un error, escribile.`}
      />
    );
  }
  if (preview.status === "exhausted") {
    return (
      <DeadEnd
        title="La invitación ya se usó"
        detail={`Este link para "${preview.workspaceName}" tenía un límite de usos y se agotó. Pedí uno nuevo.`}
      />
    );
  }

  const roleLabel = BUILTIN_ROLE_LABELS[preview.role] ?? preview.role;
  // `next` vuelve exactamente acá: después de registrarse o iniciar sesión, la
  // persona cae de nuevo en esta pantalla y ya con sesión ve el botón.
  const back = `/invite/${encodeURIComponent(params.token)}`;

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <span
          aria-hidden
          className="h-9 w-9 shrink-0 rounded-sm"
          style={{ background: preview.workspaceColor }}
        />
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Invitación a un entorno
          </p>
          <p className="truncate text-lg font-semibold text-ink">
            {preview.workspaceName}
          </p>
        </div>
      </div>

      <dl className="mb-6 space-y-2 border-t border-rule pt-4 text-sm">
        {preview.invitedByName && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Te invitó</dt>
            <dd className="truncate text-ink">{preview.invitedByName}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Entrarías como</dt>
          <dd className="text-ink">{roleLabel}</dd>
        </div>
        {preview.emailHint && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Para la cuenta</dt>
            <dd className="truncate font-mono text-xs text-ink">
              {preview.emailHint}
            </dd>
          </div>
        )}
      </dl>

      {session?.user ? (
        <AcceptInvite
          token={params.token}
          workspaceName={preview.workspaceName}
        />
      ) : (
        <>
          <p className="mb-4 text-sm leading-relaxed text-ink-soft">
            Para entrar necesitás una cuenta. Es lo que hace que del otro lado
            quede tu nombre y no un link suelto.
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href={`/signup?next=${encodeURIComponent(back)}`}
              className={buttonVariants({ size: "lg" }) + " w-full"}
            >
              Crear cuenta y entrar
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(back)}`}
              className={
                buttonVariants({ variant: "ghost", size: "sm" }) + " w-full"
              }
            >
              Ya tengo cuenta
            </Link>
          </div>
        </>
      )}
    </Shell>
  );
}
