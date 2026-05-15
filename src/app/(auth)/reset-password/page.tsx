"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-xl font-bold text-white">R</span>
        </div>
        <h1 className="text-2xl font-bold text-text">Cowork RMH</h1>
      </div>
      <div className="rounded-xl border border-border bg-surface p-8">
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
const btnCls =
  "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60";

function RequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSent(true);
      toast.success(data.message ?? "Si el correo existe, te enviamos un enlace.");
    } catch {
      toast.error("Error al enviar la solicitud. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-text">
        Recuperar contraseña
      </h2>
      <p className="mb-6 text-sm text-text-muted">
        Ingresa tu correo y te enviaremos un enlace para crear una nueva
        contraseña.
      </p>

      {sent ? (
        <div className="rounded-lg bg-success/10 p-4 text-center text-sm text-success">
          ✓ Si existe una cuenta con ese correo, recibirás un enlace en unos
          minutos. Revisa también spam.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
              placeholder="tu@ejemplo.com"
            />
          </div>
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="text-primary hover:text-primary-hover">
          ← Volver al inicio
        </Link>
      </p>
    </>
  );
}

function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo restablecer la contraseña.");
        setLoading(false);
        return;
      }
      toast.success("Contraseña actualizada. Inicia sesión.");
      router.push("/login");
    } catch {
      toast.error("Error interno. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-text">
        Nueva contraseña
      </h2>
      <p className="mb-6 text-sm text-text-muted">
        Crea una contraseña nueva para tu cuenta.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={inputCls}
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-muted">
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className={inputCls}
            placeholder="Repite la contraseña"
          />
        </div>
        <button type="submit" disabled={loading} className={btnCls}>
          {loading ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="text-primary hover:text-primary-hover">
          ← Volver al inicio
        </Link>
      </p>
    </>
  );
}

function ResetPasswordInner() {
  const token = useSearchParams().get("token");
  return token ? <SetPasswordForm token={token} /> : <RequestForm />;
}

export default function ResetPasswordPage() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-text-muted">Cargando…</p>}>
        <ResetPasswordInner />
      </Suspense>
    </Shell>
  );
}
