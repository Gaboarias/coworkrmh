/**
 * Resolución de segmentos del Email Blaster.
 *
 * 🔧 Punto único de acoplamiento al CRM. Hoy los destinatarios salen de la
 * tabla `clients` (company_name, contact_name, email, status). Si en el futuro
 * se crea una tabla de contactos individuales con tags, este es el archivo a
 * cambiar — nada más se rompe.
 *
 * Mapeo de merge tags:
 *   {{nombre}}  → contact_name (fallback company_name)
 *   {{empresa}} → company_name
 *
 * Excluye automáticamente los emails en `suppressions` del mismo bucket
 * (bajas, hard bounces, quejas).
 */

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { DEFAULT_BUCKET } from "./constants";

export type SegmentFilter = {
  bucketId?: string;
  status?: string; // active | inactive | prospect
  search?: string; // busca en empresa / contacto / email
};

export type Recipient = {
  contactId: string;
  email: string;
  mergeData: { nombre: string; empresa: string | null };
};

function buildQuery(filter: SegmentFilter) {
  const bucket = filter.bucketId ?? DEFAULT_BUCKET;
  const where = [sql`c.email IS NOT NULL AND c.email <> ''`];

  if (filter.status) where.push(sql`c.status = ${filter.status}`);
  if (filter.search) {
    const q = `%${filter.search}%`;
    where.push(
      sql`(c.company_name ILIKE ${q} OR c.contact_name ILIKE ${q} OR c.email ILIKE ${q})`
    );
  }

  return sql`
    SELECT c.id, c.email, c.company_name, c.contact_name
    FROM clients c
    WHERE ${sql.join(where, sql` AND `)}
    AND NOT EXISTS (
      SELECT 1 FROM suppressions s
      WHERE s.bucket_id = ${bucket}
      AND lower(s.email) = lower(c.email)
    )
  `;
}

/** Cuántos contactos califican (para el preview del builder). */
export async function countSegment(filter: SegmentFilter): Promise<number> {
  const base = buildQuery(filter);
  const res = await db.execute(sql`SELECT count(*)::int AS n FROM (${base}) q`);
  return (res.rows[0] as { n: number }).n;
}

/** Lista completa de destinatarios lista para encolar. */
export async function resolveSegment(
  filter: SegmentFilter
): Promise<Recipient[]> {
  const res = await db.execute(buildQuery(filter));
  return (
    res.rows as Array<{
      id: string;
      email: string;
      company_name: string;
      contact_name: string | null;
    }>
  ).map((r) => ({
    contactId: r.id,
    email: r.email,
    mergeData: {
      nombre: r.contact_name ?? r.company_name ?? "",
      empresa: r.company_name ?? null,
    },
  }));
}
