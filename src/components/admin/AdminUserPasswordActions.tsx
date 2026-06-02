"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Key, Link2, Copy, Check } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Props {
  userId: string;
  userEmail: string;
  userName?: string | null;
}

/**
 * Admin actions sobre la contraseña de un user — 2 botones inline:
 *
 *  [🔑 Asignar contraseña] [🔗 Generar reset link]
 *
 * Asignar contraseña: modal con input + confirm. Admin tipea la
 *   contraseña, server la hashea con bcrypt y la guarda. El admin la
 *   comunica al user out-of-band (WhatsApp, etc).
 *
 * Generar reset link: server genera token + envía email + devuelve URL.
 *   Si el email falla (no configurado), el admin puede copiar el link
 *   al portapapeles y mandarlo manualmente.
 *
 * Ambos endpoints requieren admin role (validado server-side).
 * Component se usa adentro del UsersTab del AdminPanel.
 */
export function AdminUserPasswordActions({ userId, userEmail, userName }: Props) {
  const [setPwdOpen, setSetPwdOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setSetPwdOpen(true)}
          title="Asignar contraseña directa"
          aria-label="Asignar contraseña"
          className="rounded-md p-2 text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
        >
          <Key className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          title="Generar enlace de reset"
          aria-label="Generar reset link"
          className="rounded-md p-2 text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink"
        >
          <Link2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      {setPwdOpen && (
        <SetPasswordModal
          userId={userId}
          userName={userName ?? userEmail}
          onClose={() => setSetPwdOpen(false)}
        />
      )}

      {resetOpen && (
        <ResetLinkModal
          userId={userId}
          userEmail={userEmail}
          userName={userName ?? userEmail}
          onClose={() => setResetOpen(false)}
        />
      )}
    </>
  );
}

// ── Modal: asignar contraseña directa ────────────────────────────

function SetPasswordModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const minLen = 8;
  const tooShort = pwd.length > 0 && pwd.length < minLen;
  const mismatch = confirm.length > 0 && pwd !== confirm;
  const canSubmit = pwd.length >= minLen && pwd === confirm && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al asignar contraseña");
      toast.success(`Contraseña actualizada para ${userName}`);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Asignar contraseña"
      description={`Setear nueva contraseña para ${userName}. El user va a entrar con esta credential — comunícala por un canal seguro (no por email plano).`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="admin-set-pwd"
            loading={saving}
            disabled={!canSubmit}
          >
            Guardar contraseña
          </Button>
        </>
      }
    >
      <form id="admin-set-pwd" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="admin-pwd"
            className="mb-1.5 block text-xs font-medium text-text-muted"
          >
            Nueva contraseña (mín. {minLen} caracteres)
          </label>
          <Input
            id="admin-pwd"
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="••••••••"
            autoFocus
            autoComplete="new-password"
            aria-invalid={tooShort}
          />
          {tooShort && (
            <p className="mt-1 text-xs text-danger">
              Faltan {minLen - pwd.length} caracteres.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="admin-pwd-confirm"
            className="mb-1.5 block text-xs font-medium text-text-muted"
          >
            Confirmar contraseña
          </label>
          <Input
            id="admin-pwd-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            aria-invalid={mismatch}
          />
          {mismatch && (
            <p className="mt-1 text-xs text-danger">
              Las contraseñas no coinciden.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ── Modal: generar reset link ────────────────────────────────────

function ResetLinkModal({
  userId,
  userEmail,
  userName,
  onClose,
}: {
  userId: string;
  userEmail: string;
  userName: string;
  onClose: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<
    { resetUrl: string; emailSent: boolean } | null
  >(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/users/${userId}/reset-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al generar link");
      setResult({ resetUrl: data.resetUrl, emailSent: data.emailSent });
      if (data.emailSent) {
        toast.success(`Enlace enviado a ${userEmail}`);
      } else {
        toast.info("Enlace generado — copialo y enviáselo manualmente");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function copyToClipboard() {
    if (!result?.resetUrl) return;
    navigator.clipboard
      .writeText(result.resetUrl)
      .then(() => {
        setCopied(true);
        toast.success("Enlace copiado");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("No se pudo copiar"));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Generar enlace de reset"
      description={
        result
          ? `Enlace generado para ${userName}.`
          : `Se va a generar un enlace temporal (válido 1 hora) para que ${userName} setee su contraseña. Se envía a ${userEmail} automáticamente; también te queda visible acá por si necesitás copiar y enviar manualmente.`
      }
      footer={
        result ? (
          <Button onClick={onClose}>Listo</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={generate} loading={generating}>
              Generar enlace
            </Button>
          </>
        )
      }
    >
      {result && (
        <div className="space-y-3">
          <div className="rounded-md border border-rule bg-surface-el px-3 py-2.5">
            <p className="break-all font-mono text-[12px] leading-relaxed text-ink">
              {result.resetUrl}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule-strong bg-transparent px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-accent-soft"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar enlace
                </>
              )}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {result.emailSent ? "Email enviado ✓" : "Email no enviado"}
            </p>
          </div>
          <p className="text-xs italic text-ink-soft">
            Expira en 1 hora. Si el user no lo usa a tiempo, generá uno nuevo.
          </p>
        </div>
      )}
    </Modal>
  );
}
