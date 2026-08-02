"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

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
      // NextAuth manda "CredentialsSignin" para un fallo genérico; cuando
      // authorize() lanza un Error propio (ej. rate limit) llega el mensaje
      // real, y ese sí conviene mostrarlo tal cual.
      const generic = !result.error || result.error === "CredentialsSignin";
      toast.error(generic ? "Credenciales incorrectas" : result.error);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <img
          src="/pistachio-logo.svg"
          alt="Pistachio"
          className="mx-auto mb-4 h-12 w-12 rounded-xl"
        />
        <h1 className="text-2xl font-bold text-ink">Pistachio</h1>
        <p className="mt-1 text-sm text-ink-soft">Rewind Media House</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <h2 className="mb-6 text-xl font-semibold text-ink">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Correo electrónico
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@ejemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-ink-soft"
              >
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <div className="mt-2 text-right">
                <Link
                  href="/reset-password"
                  className="text-xs text-ink-soft transition-colors hover:text-primary"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            ¿No tienes cuenta?{" "}
            <Link
              href="/signup"
              className="text-primary hover:text-primary-hover"
            >
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
