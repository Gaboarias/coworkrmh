import { describe, it, expect } from "vitest";
import { newToken, hashToken, tokensMatch } from "./token";

describe("newToken", () => {
  it("no repite", () => {
    // 256 bits: una colisión acá sería noticia. Lo que este test agarra de
    // verdad es que alguien reemplace randomBytes por algo determinista.
    const vistos = new Set(Array.from({ length: 500 }, () => newToken()));
    expect(vistos.size).toBe(500);
  });

  it("es base64url — entra en una URL sin escaparse", () => {
    // Si esto pasa a base64 común, el `+` y el `/` se rompen al viajar en el
    // path y el link empieza a fallar sólo para algunos tokens. Ese bug es
    // intermitente y carísimo de diagnosticar.
    for (let i = 0; i < 200; i++) {
      expect(newToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("mantiene los 256 bits de entropía", () => {
    // 32 bytes en base64url = 43 caracteres. Si alguien baja randomBytes(32)
    // a randomBytes(8) "porque el link es muy largo", esto lo frena.
    expect(newToken()).toHaveLength(43);
  });
});

describe("hashToken", () => {
  it("es determinista", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("no devuelve el token", () => {
    // El punto entero de la función.
    const raw = newToken();
    expect(hashToken(raw)).not.toBe(raw);
    expect(hashToken(raw)).not.toContain(raw);
  });

  it("da sha256 hex", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    // Vector conocido de sha256("abc").
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("cambia por completo con un carácter de diferencia", () => {
    const a = hashToken("token-a");
    const b = hashToken("token-b");
    const iguales = [...a].filter((c, i) => c === b[i]).length;
    // Sin avalancha, dos tokens parecidos darían hashes parecidos y se podría
    // ir adivinando de a poco.
    expect(iguales).toBeLessThan(30);
  });
});

describe("tokensMatch", () => {
  it("acepta el token correcto", () => {
    const raw = newToken();
    expect(tokensMatch(raw, hashToken(raw))).toBe(true);
  });

  it("rechaza cualquier otro", () => {
    const raw = newToken();
    expect(tokensMatch(newToken(), hashToken(raw))).toBe(false);
    expect(tokensMatch("", hashToken(raw))).toBe(false);
  });

  it("no revienta con un hash corrupto en la base", () => {
    // timingSafeEqual lanza si los buffers difieren en largo. Una fila con el
    // hash truncado tiene que dar "no coincide", no tumbar la request con un
    // 500 en la pantalla de invitación.
    expect(() => tokensMatch("cualquier-cosa", "abc")).not.toThrow();
    expect(tokensMatch("cualquier-cosa", "abc")).toBe(false);
    expect(tokensMatch("cualquier-cosa", "")).toBe(false);
  });
});
