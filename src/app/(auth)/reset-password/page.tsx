"use client";

import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-xl font-bold text-white">R</span>
        </div>
        <h1 className="text-2xl font-bold text-text">Cowork RMH</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8">
        <h2 className="mb-2 text-xl font-semibold text-text">
          Recuperar contraseña
        </h2>
        <p className="mb-6 text-sm text-text-muted">
          Para restablecer tu contraseña, contacta a un administrador del
          equipo. El administrador puede actualizar tu contraseña desde el panel
          de configuración de equipo.
        </p>

        <div className="rounded-lg border border-border bg-surface-el p-4 text-sm text-text-muted">
          <p className="font-medium text-text">¿Eres administrador?</p>
          <p className="mt-1">
            Ve a{" "}
            <Link
              href="/settings/team"
              className="text-primary hover:text-primary-hover"
            >
              Configuración → Equipo
            </Link>{" "}
            para gestionar las contraseñas de los usuarios.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link href="/login" className="text-primary hover:text-primary-hover">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
