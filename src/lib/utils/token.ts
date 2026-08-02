import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * Tokens de un solo uso que viajan en una URL.
 *
 * Existe porque el par "generar aleatorio + guardar el sha256" ya estaba
 * copiado dos veces (api/auth/forgot-password y api/users) y las
 * invitaciones iban a ser la tercera. Tres copias de una decisión de
 * seguridad son tres lugares donde puede divergir sin que nadie lo note.
 *
 * La regla que encapsula: a la base va el HASH, nunca el token. Si alguien
 * lee la tabla —un backup, un dump, un `select *` en una pantalla de
 * soporte— no obtiene nada canjeable.
 */

/** 256 bits de entropía. base64url para que el link quepa en un mensaje. */
export function newToken(): string {
  // hex daría 64 caracteres para la misma entropía; base64url da 43. Importa
  // porque estos links se pegan en WhatsApp, donde un link larguísimo se ve
  // sospechoso y se corta feo. La entropía es idéntica.
  return randomBytes(32).toString("base64url");
}

/** sha256 hex. Es lo único que se persiste. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Compara dos hashes en tiempo constante.
 *
 * En la práctica los tokens se buscan por índice (`where token_hash = ?`), y
 * ahí el timing lo domina el motor de base de datos, no nosotros. Esto es
 * para cuando ya tenés la fila y querés confirmar: no cuesta nada y evita
 * que un `===` suelto se vuelva costumbre.
 */
export function tokensMatch(rawCandidate: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(rawCandidate), "hex");
  const b = Buffer.from(storedHash, "hex");
  // timingSafeEqual lanza si difieren en largo — un hash corrupto en la base
  // no debería tumbar la request, así que se responde "no coincide".
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
