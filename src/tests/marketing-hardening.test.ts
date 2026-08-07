import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { renderTemplate } from "@/lib/marketing/resend";

/**
 * Las defensas del blaster.
 *
 * Todo lo que se fija acá tiene la misma forma: son cosas que, al romperse, no
 * rompen nada visible. La cola sigue "procesando", la campaña sigue
 * "enviando", el cron sigue devolviendo 200. Se descubren cuando alguien de
 * afuera pregunta por qué no le llegó — o peor, por qué le llegó dos veces
 * después de darse de baja.
 */

const SRC = path.resolve(__dirname, "..");
const read = (...p: string[]) => fs.readFileSync(path.join(SRC, ...p), "utf8");

const QUEUE = read("lib", "marketing", "processCampaign.ts");

describe("la cola no se toca sin estar configurada", () => {
  it("valida ANTES de reclamar el lote", () => {
    // El orden es el bug entero. Reclamar primero marca hasta 100 filas como
    // `sending` y commitea; si después falta una variable, la excepción se
    // lleva la función y esas filas quedan trabadas para siempre, porque el
    // cron sólo levanta `queued`.
    const posValidacion = QUEUE.indexOf("assertMarketingConfigured()");
    const posClaim = QUEUE.indexOf("SET status = 'sending'");
    expect(posValidacion).toBeGreaterThan(-1);
    expect(posClaim).toBeGreaterThan(-1);
    expect(
      posValidacion,
      "assertMarketingConfigured tiene que correr ANTES del UPDATE que reclama el lote"
    ).toBeLessThan(posClaim);
  });

  it("el launch tampoco encola sin configuración", () => {
    // Encolar y no poder procesar deja la campaña en "Enviando" sin que salga
    // un solo correo.
    const launch = read("app", "api", "campaigns", "[id]", "launch", "route.ts");
    const posValidacion = launch.indexOf("assertMarketingConfigured");
    const posInsert = launch.indexOf("insert(campaignSends)");
    expect(posValidacion).toBeGreaterThan(-1);
    expect(posValidacion).toBeLessThan(posInsert);
  });
});

describe("nada queda trabado en sending", () => {
  it("existe el reaper y el cron lo llama", () => {
    // Cubre lo que ninguna validación previa puede: timeout de la función,
    // OOM, un deploy a mitad de ejecución. Ahí no corre código nuestro.
    expect(QUEUE).toContain("export async function reclaimStalledSends");
    const cron = read("app", "api", "cron", "process-campaign", "route.ts");
    expect(
      cron,
      "sin esto, una fila trabada por un timeout no la rescata nadie"
    ).toContain("reclaimStalledSends");
  });

  it("el reaper deja de reintentar en algún momento", () => {
    // Un envío que se corta DESPUÉS de que Resend lo aceptó se reintentaría
    // como copia. Dos copias es tolerable; infinitas no.
    expect(QUEUE).toContain("MAX_ATTEMPTS");
    expect(QUEUE).toMatch(/attempts\s*=\s*attempts\s*\+\s*1/);
  });

  it("el reaper no pisa un lote en vuelo", () => {
    // La ventana tiene que ser holgadamente mayor que el maxDuration de 60s.
    const m = QUEUE.match(/const STALE_MIN\s*=\s*(\d+)/);
    expect(m, "falta STALE_MIN").not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(5);
  });

  it("el try cubre la construcción del payload, no sólo el envío", () => {
    // Antes abría después de armar el payload, así que un fallo construyendo
    // el link de baja escapaba y dejaba el lote entero trabado.
    const posTry = QUEUE.indexOf("      try {");
    const posPayload = QUEUE.indexOf("const payload = group.map");
    expect(posTry).toBeGreaterThan(-1);
    expect(posPayload).toBeGreaterThan(-1);
    expect(posTry).toBeLessThan(posPayload);
  });
});

describe("las bajas se respetan hasta el último momento", () => {
  it("se re-chequean supresiones al enviar, no sólo al lanzar", () => {
    // Una campaña grande se drena por cron durante horas. Entre lanzar y
    // enviar, alguien se puede dar de baja — y la baja promete que no le
    // vuelve a llegar nada.
    expect(QUEUE).toContain("suppressions");
    expect(QUEUE).toContain("'suppressed'");
  });

  it("los destinatarios manuales no saltean el filtro de bajas", () => {
    const launch = read("app", "api", "campaigns", "[id]", "launch", "route.ts");
    // La rama `body.recipients` aceptaba una lista cruda sin pasar por
    // resolveSegment, o sea sin filtrar supresiones. Ahora sólo acota.
    expect(launch).toContain("resolveSegment");
    expect(
      /recipients\s*\?\?\s*\[\]/.test(launch),
      "volvió el bypass: body.recipients tiene que filtrarse contra el segmento"
    ).toBe(false);
  });
});

describe("los fallos no se disfrazan de éxito", () => {
  it("el launch devuelve el error del envío", () => {
    const launch = read("app", "api", "campaigns", "[id]", "launch", "route.ts");
    // El catch estaba vacío y la UI decía "N encolados" igual.
    expect(launch).toContain("sendError");
    expect(
      /catch\s*\{\s*\/\*[^*]*\*\/\s*\}/.test(launch),
      "volvió un catch vacío en el launch"
    ).toBe(false);
  });

  it("el cron sin CRON_SECRET falla en producción en vez de devolver 200", () => {
    // Devolvía {skipped} con 200: Vercel lo marcaba exitoso, la cola no se
    // drenaba nunca y nada lo delataba.
    const cron = read("app", "api", "cron", "process-campaign", "route.ts");
    expect(cron).toContain('VERCEL_ENV === "production"');
    expect(cron).toContain("status: 500");
  });
});

describe("aislamiento del dominio de marketing", () => {
  it("en producción no cae a la key transaccional", () => {
    // Ese `??` significaba mandar miles de correos con la key del dominio que
    // manda los resets de contraseña. Un rebote masivo se llevaba puesta la
    // entregabilidad del transaccional.
    const r = read("lib", "marketing", "resend.ts");
    expect(r).toContain("isProd()");
    expect(
      /const key =\s*\n?\s*process\.env\.RESEND_MARKETING_API_KEY \?\? process\.env\.RESEND_API_KEY;/.test(
        r
      ),
      "volvió el fallback incondicional a la key transaccional"
    ).toBe(false);
  });
});

describe("renderTemplate escapa lo que interpola", () => {
  it("no deja pasar HTML de los datos del CRM", () => {
    // Los valores salen de campos que escribió una persona. Un company_name
    // con un <a href> adentro sería un link real en un correo firmado con
    // nuestro dominio.
    const out = renderTemplate("<p>Hola {{nombre}}</p>", {
      nombre: '<a href="https://malo.com">click</a>',
    });
    expect(out).not.toContain("<a href");
    expect(out).toContain("&lt;a href");
  });

  it("sigue resolviendo los tags normales", () => {
    expect(renderTemplate("Hola {{nombre}}", { nombre: "Ana" })).toBe("Hola Ana");
    expect(renderTemplate("Hola {{ nombre }}", { nombre: "Ana" })).toBe("Hola Ana");
  });

  it("un tag que no existe queda vacío, no literal", () => {
    expect(renderTemplate("Hola {{nadie}}", {})).toBe("Hola ");
  });
});

describe("las rutas de campañas piden rol Y tier", () => {
  it("requireEmailRole chequea los dos ejes", () => {
    // Las páginas usan requireFeature("blaster"), pero el middleware no toca
    // /api/*: un admin de un entorno basic podía lanzar con un fetch.
    const auth = read("lib", "marketing", "auth.ts");
    expect(auth).toContain('session.user.role !== "admin"');
    expect(auth).toContain('hasFeature(ws.tier, "blaster")');
  });

  it("toda ruta de campañas pasa por el guard", () => {
    const dir = path.join(SRC, "app", "api", "campaigns");
    const rutas: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name === "route.ts") rutas.push(p);
      }
    };
    walk(dir);
    expect(rutas.length).toBeGreaterThan(3);
    for (const r of rutas) {
      expect(
        fs.readFileSync(r, "utf8"),
        `${path.relative(SRC, r)} no pasa por requireEmailRole`
      ).toContain("requireEmailRole");
    }
  });
});
