import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { config } from "@/middleware";

/**
 * Regresión de C1 — el portal de clientes estuvo inalcanzable en producción.
 *
 * `(portal)` es un route group: los paréntesis NO aportan segmento de URL. La
 * página vivía en `/<token>`, pero la URL que se emailea al cliente y la
 * exclusión del middleware asumían `/portal/<token>`. Resultado: el link del
 * email daba 404 y la ruta real caía en el guard de NextAuth (307 a /login).
 *
 * Es un bug de acuerdo entre tres lugares (archivo, generador de links,
 * matcher) que ni el compilador ni el linter pueden ver. Estos tests fijan
 * los tres.
 */

const SRC = path.resolve(__dirname, "..");
const matcher = (config.matcher as string[])[0];
const re = new RegExp(`^${matcher}$`);

/** ¿El middleware de auth se aplica a este path? */
const isGuarded = (pathname: string) => re.test(pathname);

describe("routing del portal de cliente", () => {
  it("la página vive bajo un segmento /portal real, no sólo en el route group", () => {
    const correcto = path.join(SRC, "app", "(portal)", "portal", "[token]", "page.tsx");
    const viejo = path.join(SRC, "app", "(portal)", "[token]", "page.tsx");

    expect(
      fs.existsSync(correcto),
      "falta src/app/(portal)/portal/[token]/page.tsx — sin el segmento 'portal' la URL queda en /<token>"
    ).toBe(true);
    expect(
      fs.existsSync(viejo),
      "src/app/(portal)/[token]/page.tsx volvió a existir: eso publica el portal en /<token>, que el middleware protege"
    ).toBe(false);
  });

  it("el middleware NO protege /portal/<token>", () => {
    expect(isGuarded("/portal/abc-123")).toBe(false);
    expect(isGuarded("/portal/11111111-2222-3333-4444-555555555555")).toBe(false);
  });

  it("el middleware sigue protegiendo las páginas de la app", () => {
    for (const p of ["/dashboard", "/projects", "/admin", "/operations", "/settings"]) {
      expect(isGuarded(p), `${p} debería requerir auth`).toBe(true);
    }
  });

  it("las rutas públicas de auth quedan fuera del guard", () => {
    for (const p of ["/login", "/signup", "/reset-password"]) {
      expect(isGuarded(p), `${p} debería ser público`).toBe(false);
    }
  });

  it("los links que se generan apuntan a /portal/<token>", () => {
    const actions = fs.readFileSync(
      path.join(SRC, "lib", "actions", "clients.ts"),
      "utf8"
    );
    // Si alguien cambia el formato del link, tiene que cambiar también la
    // ubicación del archivo y el matcher — este test lo obliga a notarlo.
    expect(actions).toContain("/portal/${");
  });
});
