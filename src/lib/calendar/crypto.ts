import crypto from "node:crypto";

/**
 * Cifrado simétrico (AES-256-GCM) para tokens OAuth de calendario. Nunca
 * guardamos access/refresh tokens en texto plano. La clave sale de
 * CALENDAR_TOKEN_ENC_KEY (cualquier string random sirve — se deriva a 32
 * bytes con SHA-256 si no calza exacto).
 */
const ALGO = "aes-256-gcm";

function key(): Buffer {
  const raw = process.env.CALENDAR_TOKEN_ENC_KEY;
  if (!raw) throw new Error("CALENDAR_TOKEN_ENC_KEY no configurado");
  let k: Buffer;
  if (raw.length === 64) k = Buffer.from(raw, "hex");
  else k = Buffer.from(raw, "base64");
  if (k.length !== 32) k = crypto.createHash("sha256").update(raw).digest();
  return k;
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(":");
}

export function decryptToken(payload: string): string {
  const [ivB, tagB, dataB] = payload.split(":");
  if (!ivB || !tagB || !dataB) throw new Error("token cifrado inválido");
  const decipher = crypto.createDecipheriv(
    ALGO,
    key(),
    Buffer.from(ivB, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
