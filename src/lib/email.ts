import { Resend } from "resend";

const FROM = "Pistachio <no-reply@rwndmedia.com>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

/**
 * URL base de la app para construir links absolutos en emails.
 * Prioridad: APP_URL → VERCEL_URL (inyectado por Vercel) → localhost.
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// ─── Layout compartido ────────────────────────────────────────────────────────

function htmlWrap(body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a24">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:28px">
        <div style="width:36px;height:36px;border-radius:9px;background:#10231A;color:#C9E58B;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">P</div>
        <strong style="font-size:17px;letter-spacing:-0.02em">Pistachio</strong>
      </div>
      ${body}
      <p style="font-size:11px;color:#9090a8;margin:32px 0 0;border-top:1px solid #eee;padding-top:16px">
        Pistachio · RMH Studio<br>
        Recibiste este correo porque sos miembro del espacio de trabajo.
      </p>
    </div>
  `;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Restablece tu contraseña — Pistachio",
    text: `Recibimos una solicitud para restablecer tu contraseña.

Abre este enlace para crear una nueva contraseña (válido 1 hora):
${resetUrl}

Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a24">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;border-radius:9px;background:#10231A;color:#C9E58B;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px">P</div>
          <strong style="font-size:18px">Pistachio</strong>
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

// ─── Notificaciones de actividad ──────────────────────────────────────────────

/**
 * Correo de tarea asignada.
 * `taskAndProject` = "Diseño hero — Sitio RMH" (el campo `body` del payload).
 */
export async function sendTaskAssignedEmail(params: {
  to: string;
  recipientName: string | null;
  taskAndProject: string;
  assignerName: string | undefined;
  taskUrl: string;
}) {
  const resend = getResend();
  const { to, recipientName, taskAndProject, assignerName, taskUrl } = params;
  const greeting = recipientName ? `Hola ${recipientName},` : "Hola,";
  const byLine = assignerName ? ` · asignado por <strong>${assignerName}</strong>` : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Tarea asignada — ${taskAndProject}`,
    text: [
      greeting,
      "",
      `Te asignaron: ${taskAndProject}${assignerName ? ` (por ${assignerName})` : ""}.`,
      "",
      `Ver tarea: ${taskUrl}`,
      "",
      "— Pistachio · RMH Studio",
    ].join("\n"),
    html: htmlWrap(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;letter-spacing:-0.02em">
        Nueva tarea asignada
      </h1>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 6px">${greeting}</p>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
        Te asignaron: <strong>${taskAndProject}</strong>${byLine}.
      </p>
      <a href="${taskUrl}"
         style="display:inline-block;background:#6B5FE4;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">
        Ver tarea
      </a>
    `),
  });
}

/**
 * Correo de incorporación a un proyecto.
 * `projectName` = nombre del proyecto (el campo `body` del payload).
 */
export async function sendProjectMemberAddedEmail(params: {
  to: string;
  recipientName: string | null;
  projectName: string;
  inviterName: string | undefined;
  projectUrl: string;
}) {
  const resend = getResend();
  const { to, recipientName, projectName, inviterName, projectUrl } = params;
  const greeting = recipientName ? `Hola ${recipientName},` : "Hola,";
  const byLine = inviterName ? ` por <strong>${inviterName}</strong>` : "";

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Te sumaron al proyecto "${projectName}" — Pistachio`,
    text: [
      greeting,
      "",
      `Ahora sos miembro de "${projectName}"${inviterName ? ` (invitado por ${inviterName})` : ""}.`,
      "",
      `Ir al proyecto: ${projectUrl}`,
      "",
      "— Pistachio · RMH Studio",
    ].join("\n"),
    html: htmlWrap(`
      <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;letter-spacing:-0.02em">
        Te sumaron a un proyecto
      </h1>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 6px">${greeting}</p>
      <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
        Ahora sos miembro de <strong>${projectName}</strong>${byLine}.
      </p>
      <a href="${projectUrl}"
         style="display:inline-block;background:#6B5FE4;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px">
        Ir al proyecto
      </a>
    `),
  });
}
