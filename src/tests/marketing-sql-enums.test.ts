import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  sendStatusEnum,
  campaignStatusEnum,
  emailEventTypeEnum,
  suppressionReasonEnum,
} from "@/lib/db/schema";

/**
 * SQL escrito a mano contra columnas de tipo enum.
 *
 * El blaster usa `db.execute(sql\`...\`)` en varios lugares porque necesita
 * `FOR UPDATE SKIP LOCKED` y `count(*) FILTER`, cosas que el query builder no
 * expresa. El precio es que TypeScript no ve esos literales: escribir
 * `status = 'opened'` compila igual de bien que `status = 'sent'`.
 *
 * Y no falla en desarrollo, falla en Postgres, en runtime, con `22P02 invalid
 * input value for enum`. Eso fue exactamente lo que pasó: el endpoint de
 * métricas filtraba `status IN ('sent','delivered','opened','clicked')` sobre
 * `send_status`, que no tiene ninguno de esos dos últimos —viven en
 * `email_event_type`, otro enum— y la pantalla de detalle de campaña devolvía
 * 500 desde el día que se escribió.
 *
 * Este test lee el SQL del código y compara cada literal contra el enum real.
 */

const SRC = path.resolve(__dirname, "..");

/** Columna → valores que el enum admite de verdad. */
const COLUMNAS: Record<string, { enumName: string; valores: readonly string[] }> = {
  // `campaign_sends.status` y `campaigns.status` se escriben las dos como
  // `status` en el SQL, así que se resuelve por tabla (ver tablaDe).
  "campaign_sends.status": {
    enumName: "send_status",
    valores: sendStatusEnum.enumValues,
  },
  "campaigns.status": {
    enumName: "campaign_status",
    valores: campaignStatusEnum.enumValues,
  },
  "email_events.type": {
    enumName: "email_event_type",
    valores: emailEventTypeEnum.enumValues,
  },
  "suppressions.reason": {
    enumName: "suppression_reason",
    valores: suppressionReasonEnum.enumValues,
  },
};

/** Archivos con SQL crudo del blaster. */
const ARCHIVOS = [
  ["lib", "marketing", "processCampaign.ts"],
  ["app", "api", "campaigns", "[id]", "metrics", "route.ts"],
  ["app", "api", "campaigns", "[id]", "route.ts"],
  ["app", "api", "webhooks", "resend", "route.ts"],
];

/**
 * De qué tabla habla un fragmento de SQL.
 *
 * Heurística deliberadamente tonta: mira qué tabla se nombra en el fragmento.
 * Si no puede decidir, no adivina — devuelve null y el test lo salta. Un test
 * que adivina mal es peor que uno que no mira.
 */
function tablaDe(fragmento: string): string | null {
  const tablas = [
    "campaign_sends",
    "campaigns",
    "email_events",
    "suppressions",
  ].filter((t) => new RegExp(`\\b${t}\\b`).test(fragmento));
  // `UPDATE campaigns ... SELECT ... FROM campaign_sends` nombra las dos.
  if (tablas.length !== 1) return null;
  return tablas[0];
}

interface Hallazgo {
  archivo: string;
  columna: string;
  literal: string;
  contexto: string;
}

function literalesDe(src: string, archivo: string): Hallazgo[] {
  const out: Hallazgo[] = [];

  // Cada sentencia SQL, aproximada por bloque entre `sql\`` y su cierre.
  for (const bloque of src.split(/sql`/).slice(1)) {
    const frag = bloque.split("`")[0];
    const tabla = tablaDe(frag);
    if (!tabla) continue;

    // Dos formas, dos expresiones. Una sola que cubriera las dos necesitaba un
    // lookahead, y el primer intento de este test lo tenía: fallaba en
    // `IN ('a','b'))::int` porque después del paréntesis viene `::`, no un
    // espacio. O sea que pasaba en verde con el bug puesto — un test decorativo.
    // Verificado por mutación: ahora muerde.
    const patrones: RegExp[] = [
      // col = 'x'
      /\b(status|type|reason)\s*=\s*('[^']+')/gi,
      // col IN ('x','y', ...)
      /\b(status|type|reason)\s+IN\s*\(([^)]*)\)/gi,
    ];

    for (const re of patrones) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(frag))) {
        const columna = `${tabla}.${m[1].toLowerCase()}`;
        if (!COLUMNAS[columna]) continue;
        for (const lit of m[2].matchAll(/'([^']+)'/g)) {
          out.push({
            archivo,
            columna,
            literal: lit[1],
            contexto: m[0].replace(/\s+/g, " ").slice(0, 70),
          });
        }
      }
    }
  }
  return out;
}

const hallazgos = ARCHIVOS.flatMap((rel) => {
  const p = path.join(SRC, ...rel);
  if (!fs.existsSync(p)) return [];
  return literalesDe(fs.readFileSync(p, "utf8"), rel.join("/"));
});

describe("SQL crudo contra columnas enum", () => {
  it("encuentra literales que revisar", () => {
    // Si esto llega a 0, el parser dejó de ver el SQL y el test se volvió
    // decorativo — que es la forma más silenciosa de perder un test.
    expect(hallazgos.length).toBeGreaterThan(5);
  });

  for (const h of hallazgos) {
    it(`${h.archivo}: '${h.literal}' existe en ${COLUMNAS[h.columna].enumName}`, () => {
      expect(
        COLUMNAS[h.columna].valores as readonly string[],
        `En ${h.archivo}, \`${h.contexto}\` compara ${h.columna} contra '${h.literal}', ` +
          `que NO está en el enum ${COLUMNAS[h.columna].enumName} ` +
          `(${COLUMNAS[h.columna].valores.join(", ")}). ` +
          `Postgres castea el literal al tipo de la columna y tira 22P02 en runtime.`
      ).toContain(h.literal);
    });
  }
});

describe("los estados que el código necesita están en el enum", () => {
  // Cada uno se agregó por una razón concreta; si alguien los saca del enum,
  // el SQL que los usa empieza a tirar 22P02.
  it("send_status cubre el ciclo completo", () => {
    for (const v of [
      "queued",
      "sending",
      "sent",
      "failed",
      // Baja registrada entre el lanzamiento y el envío.
      "suppressed",
      // Retenido por una pausa. Sin esto, pausar tendría que dejar los envíos
      // en `sending` y el reaper los reencolaría.
      "paused",
    ]) {
      expect(sendStatusEnum.enumValues).toContain(v);
    }
  });

  it("las aperturas y clics viven en email_event_type, no en send_status", () => {
    // El origen del bug: son eventos del correo, no estados del envío.
    for (const v of ["opened", "clicked"]) {
      expect(emailEventTypeEnum.enumValues).toContain(v);
      expect(sendStatusEnum.enumValues).not.toContain(v);
    }
  });
});
