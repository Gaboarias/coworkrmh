import { Resend } from "resend";

const FROM = "Cowork RMH <no-reply@rwndmedia.com>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — Cowork RMH",
    text: `Recibimos una solicitud para restablecer tu contraseña.

Abre este enlace para crear una nueva contraseña (válido 1 hora):
${resetUrl}

Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a24">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;border-radius:9px;background:#6B5FE4;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px">R</div>
          <strong style="font-size:18px">Cowork RMH</strong>
        </div>
        <h1 style="font-size:20px;margin:0 0 12px">Restablece tu contraseña</h1>
        <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
          Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva. El enlace es válido por 1 hora.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#6B5FE4;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">
          Crear nueva contraseña
        </a>
        <p style="font-size:12px;line-height:1.6;color:#9090a8;margin:24px 0 0">
          Si no solicitaste esto, ignora este correo — tu contraseña no cambiará.<br />
          Si el botón no funciona, copia este enlace:<br />
          <span style="color:#6B5FE4;word-break:break-all">${resetUrl}</span>
        </p>
      </div>
    `,
  });
}
