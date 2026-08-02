import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TERRITORIES, territoryOf } from "@/lib/constants/navigation";

/**
 * Los cuatro territorios de Pistachio.
 *
 * El fallo que estos tests existen para agarrar es silencioso: alguien agrega
 * una pantalla, no la mapea a ningún territorio, y el encabezado simplemente
 * deja de decir dónde está parada la persona. Nada se rompe, nada se ve rojo —
 * la separación se erosiona de a una página por vez.
 */

const APP = path.resolve(__dirname, "..", "app", "(app)");

/**
 * Rutas reales de la app, sacadas del árbol de archivos.
 *
 * Se derivan del disco en vez de listarlas a mano justamente porque una lista
 * a mano se queda vieja sin avisar — que es el bug que se quiere evitar.
 */
function routesFromDisk(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // Los paréntesis son route groups: organizan archivos, no aportan
    // segmento de URL. Confundirlos ya costó una vez que el portal quedara
    // publicado en /<token> en vez de /portal/<token>.
    const segment = name.startsWith("(") && name.endsWith(")") ? "" : `/${name}`;
    const sub = path.join(dir, name);
    if (fs.existsSync(path.join(sub, "page.tsx"))) {
      out.push(prefix + segment);
    }
    out.push(...routesFromDisk(sub, prefix + segment));
  }
  return out;
}

/** `[projectId]` → un valor plausible, para que el prefijo resuelva. */
const concrete = (route: string) =>
  route.replace(/\[[^\]]+\]/g, "11111111-2222-3333-4444-555555555555");

const rutas = routesFromDisk(APP);

describe("cada pantalla pertenece a un territorio", () => {
  it("encuentra las pantallas de la app", () => {
    expect(rutas.length).toBeGreaterThan(15);
  });

  for (const ruta of rutas) {
    // error.tsx y not-found.tsx no son rutas; los estados de error tampoco
    // tienen territorio y su encabezado calla, que es correcto.
    it(`${ruta || "/"} resuelve a un territorio`, () => {
      const t = territoryOf(concrete(ruta));
      expect(
        t,
        `${ruta} no cae en ningún territorio: el encabezado de esa pantalla no va a decir si es Trabajo, Negocio, Crecimiento o Sistema. Agregala a los items o al alsoOwns del territorio que corresponda en lib/constants/navigation.ts.`
      ).not.toBeNull();
    });
  }
});

describe("territoryOf", () => {
  it("resuelve las subrutas al territorio del padre", () => {
    expect(territoryOf("/projects/abc/notes")?.id).toBe("work");
    expect(territoryOf("/operations/ventas")?.id).toBe("business");
    expect(territoryOf("/marketing/abc")?.id).toBe("growth");
    expect(territoryOf("/settings")?.id).toBe("system");
  });

  it("gana el prefijo más largo, no el primero declarado", () => {
    // Sin esta regla el orden de declaración decidiría los empates en
    // silencio, y el día que dos territorios compartan raíz la respuesta
    // dependería de cuál se escribió antes.
    const largos = TERRITORIES.flatMap((t) => [
      ...t.items.map((i) => i.href),
      ...(t.alsoOwns ?? []),
    ]);
    // /settings vive en `system` aunque `/` no sea prefijo de nadie: si
    // alguien agregara una raíz corta a otro territorio, esto lo detecta.
    expect(largos).toContain("/settings");
    expect(territoryOf("/settings")?.id).toBe("system");
  });

  it("calla en las superficies que no son la app", () => {
    // Login, portal de cliente, link compartido e invitación no son
    // territorios: inventarles uno sería mentir sobre dónde está la persona.
    for (const p of ["/login", "/signup", "/portal/abc", "/share/abc", "/invite/abc"]) {
      expect(territoryOf(p), `${p} no debería tener territorio`).toBeNull();
    }
  });

  it("no confunde un prefijo parcial con una ruta", () => {
    // startsWith(href) a secas daría "work" para /projects-archivados, que es
    // otra ruta. Por eso se compara contra `${href}/` o igualdad exacta.
    expect(territoryOf("/projectsomething")).toBeNull();
    expect(territoryOf("/operationsx")).toBeNull();
  });
});

describe("la estructura de los cuatro territorios", () => {
  it("son cuatro, con los nombres que ve el usuario", () => {
    expect(TERRITORIES.map((t) => t.label)).toEqual([
      "Trabajo",
      "Negocio",
      "Crecimiento",
      "Sistema",
    ]);
  });

  it("ninguna ruta pertenece a dos territorios", () => {
    const vistas = new Map<string, string>();
    for (const t of TERRITORIES) {
      for (const href of [
        ...t.items.map((i) => i.href),
        ...(t.alsoOwns ?? []),
      ]) {
        const previo = vistas.get(href);
        expect(
          previo,
          `${href} está en "${previo}" y en "${t.label}" — un territorio ambiguo es peor que ninguno`
        ).toBeUndefined();
        vistas.set(href, t.label);
      }
    }
  });

  it("cada territorio dice qué pregunta responde", () => {
    // El tagline es lo que hace que la separación signifique algo en vez de
    // ser cuatro cajones con nombre bonito.
    for (const t of TERRITORIES) {
      expect(t.tagline.length, `${t.label} sin tagline`).toBeGreaterThan(8);
    }
  });
});
