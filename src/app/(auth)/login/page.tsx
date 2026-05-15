"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Credenciales incorrectas");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-xl font-bold text-white">R</span>
        </div>
        <h1 className="text-2xl font-bold text-text">Cowork RMH</h1>
        <p className="mt-1 text-sm text-text-muted">Rewind Media House</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-8">
        <h2 className="mb-6 text-xl font-semibold text-text">Iniciar sesión</h2>

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
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="tu@ejemplo.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-muted">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface-el px-3 py-2.5 text-sm text-text placeholder-text-tertiary transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          ¿No tienes cuenta?{" "}
          <Link href="/signup" className="text-primary hover:text-primary-hover">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
