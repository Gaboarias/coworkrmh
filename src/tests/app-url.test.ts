import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAppUrl } from "@/lib/email";

/**
 * De dónde sale la URL que viaja adentro de un correo.
 *
 * Tiene que salir de la configuración del servidor y de ningún otro lado. Las
 * tres rutas de reset de contraseña la sacaban de un helper que leía el header
 * `Origin` y, si no venía, `X-Forwarded-Host`. Los elige quien hace el
 * request.
 *
 * O sea: un POST a /api/auth/forgot-password con el correo de una víctima y
 * `Origin: https://atacante.com` le mandaba a esa persona un correo REAL,
 * salido de nuestro dominio y firmado con nuestro DKIM, con el link de reset
 * apuntando al atacante y un token válido adentro. Toma de cuenta con un solo
 * request, sin autenticarse.
 */

const SRC = path.resolve(__dirname, "..");

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("getAppUrl", () => {
  it("usa APP_URL y le saca la barra final", () => {
    process.env.APP_URL = "https://pistachio.rwndmedia.com/";
    expect(getAppUrl()).toBe("https://pistachio.rwndmedia.com");
  });

  it("en producción NO inventa una URL", () => {
    // El fallback silencioso era a la URL del deployment (que cambia en cada
    // push, y rompe el redirect_uri de Google que tiene que ser exacto) y de
    // ahí a localhost, que quedaría horneado dentro de un correo a un cliente.
    // Los tres fallan callados: nadie se entera hasta que alguien pregunta.
    delete process.env.APP_URL;
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "cowork-abc123.vercel.app";
    expect(() => getAppUrl()).toThrow(/APP_URL/);
  });

  it("fuera de producción sigue degradando, para no romper dev", () => {
    delete process.env.APP_URL;
    delete process.env.VERCEL_ENV;
    process.env.VERCEL_URL = "cowork-abc123.vercel.app";
    expect(getAppUrl()).toBe("https://cowork-abc123.vercel.app");

    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});

/**
 * Saca comentarios antes de mirar.
 *
 * Sin esto el test se disparaba con los comentarios que EXPLICAN el bug —los
 * que dicen "leía el header Origin"— y no con el código. Un test que no
 * distingue la prosa del código obliga a no poder escribir por qué se arregló
 * algo, que es justo lo contrario de lo que queremos.
 */
const soloCodigo = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("ningún correo arma su URL desde los headers del request", () => {
  // Los tres archivos que tenían el helper. Si vuelve a aparecer en
  // cualquiera, es la misma toma de cuenta otra vez.
  const RUTAS = [
    ["app", "api", "auth", "forgot-password", "route.ts"],
    ["app", "api", "users", "route.ts"],
    ["app", "api", "users", "[userId]", "reset-link", "route.ts"],
  ];

  for (const rel of RUTAS) {
    it(`${rel.join("/")} usa getAppUrl`, () => {
      const raw = fs.readFileSync(path.join(SRC, ...rel), "utf8");
      const src = soloCodigo(raw);
      expect(raw).toContain("getAppUrl()");
      expect(
        /headers\.get\(\s*["']origin["']\s*\)/i.test(src),
        `${rel.join("/")} volvió a leer el header Origin para armar un link de correo. ` +
          `Lo elige quien llama: es toma de cuenta.`
      ).toBe(false);
      expect(
        /x-forwarded-host/i.test(src),
        `${rel.join("/")} volvió a leer X-Forwarded-Host para armar un link de correo.`
      ).toBe(false);
    });
  }
});
