"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buckets,
  bucketMembers,
  products,
  productCategories,
  productCostHistory,
  changelog,
} from "@/lib/db/schema";
import {
  ok,
  fail,
  toMoney,
  fromMoney,
  createProductCategorySchema,
  updateProductCategorySchema,
  createProductSchema,
  updateProductSchema,
  updateProductCostsSchema,
  type ActionResult,
  type Product,
  type ProductCategory,
  type CostHistoryEntry,
} from "@/lib/actions/products-shared";

// ─── Auth + acceso por bucket ─────────────────────────────────────────────────

async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

async function userCanAccessBucket(
  user: { id: string; role?: string | null },
  bucketId: string
): Promise<boolean> {
  if ((user.role ?? "member") === "admin") return true;
  const [row] = await db
    .select({ bucketId: bucketMembers.bucketId })
    .from(bucketMembers)
    .where(
      and(
        eq(bucketMembers.bucketId, bucketId),
        eq(bucketMembers.userId, user.id)
      )
    )
    .limit(1);
  return !!row;
}

async function logChange(
  userId: string,
  action: "product_created" | "product_updated" | "product_archived",
  productId: string,
  description: string
) {
  await db.insert(changelog).values({
    userId,
    action,
    entityType: "product",
    entityId: productId,
    description,
  });
}

function mapProduct(r: typeof products.$inferSelect): Product {
  return {
    id: r.id,
    bucketId: r.bucketId,
    categoryId: r.categoryId,
    name: r.name,
    description: r.description,
    sku: r.sku,
    status: r.status,
    currency: r.currency,
    basePrice: toMoney(r.basePrice),
    defaultMaterialsCost: toMoney(r.defaultMaterialsCost),
    defaultLaborCost: toMoney(r.defaultLaborCost),
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
  };
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function listProductCategories(
  bucketId: string
): Promise<ActionResult<ProductCategory[]>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  if (!(await userCanAccessBucket(user, bucketId)))
    return fail("Sin acceso a este negocio");

  const rows = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.bucketId, bucketId))
    .orderBy(productCategories.sortOrder, productCategories.name);

  return ok(
    rows.map((r) => ({
      id: r.id,
      bucketId: r.bucketId,
      name: r.name,
      color: r.color,
      sortOrder: r.sortOrder,
    }))
  );
}

export async function createProductCategory(
  input: z.infer<typeof createProductCategorySchema>
): Promise<ActionResult<ProductCategory>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const parsed = createProductCategorySchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!(await userCanAccessBucket(user, parsed.data.bucketId)))
    return fail("Sin acceso a este negocio");

  try {
    const [row] = await db
      .insert(productCategories)
      .values({
        bucketId: parsed.data.bucketId,
        name: parsed.data.name,
        color: parsed.data.color ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
      })
      .returning();
    revalidatePath(`/operations/${parsed.data.bucketId}/categories`);
    return ok({
      id: row.id,
      bucketId: row.bucketId,
      name: row.name,
      color: row.color,
      sortOrder: row.sortOrder,
    });
  } catch {
    return fail("Ya existe una categoría con ese nombre en este negocio");
  }
}

export async function updateProductCategory(
  input: z.infer<typeof updateProductCategorySchema>
): Promise<ActionResult<ProductCategory>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const parsed = updateProductCategorySchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const [existing] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, parsed.data.id))
    .limit(1);
  if (!existing) return fail("Categoría no encontrada");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const [row] = await db
    .update(productCategories)
    .set({
      name: parsed.data.name ?? existing.name,
      color: parsed.data.color ?? existing.color,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(productCategories.id, parsed.data.id))
    .returning();

  revalidatePath(`/operations/${existing.bucketId}/categories`);
  return ok({
    id: row.id,
    bucketId: row.bucketId,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
  });
}

export async function deleteProductCategory(
  id: string
): Promise<ActionResult<{ deleted: true; affectedProducts: number }>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");

  const [existing] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1);
  if (!existing) return fail("Categoría no encontrada");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, id));

  await db.delete(productCategories).where(eq(productCategories.id, id));
  revalidatePath(`/operations/${existing.bucketId}/categories`);
  return ok({ deleted: true, affectedProducts: n });
}

// ─── Productos ────────────────────────────────────────────────────────────────

export async function listProducts(input: {
  bucketId: string;
  status?: "active" | "archived" | "out_of_stock";
  categoryId?: string;
  search?: string;
}): Promise<ActionResult<Product[]>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  if (!(await userCanAccessBucket(user, input.bucketId)))
    return fail("Sin acceso a este negocio");

  const conds = [eq(products.bucketId, input.bucketId)];
  if (input.status) conds.push(eq(products.status, input.status));
  if (input.categoryId) conds.push(eq(products.categoryId, input.categoryId));
  if (input.search && input.search.trim()) {
    const term = `%${input.search.trim()}%`;
    const m = or(ilike(products.name, term), ilike(products.sku, term));
    if (m) conds.push(m);
  }

  const rows = await db
    .select()
    .from(products)
    .where(and(...conds))
    .orderBy(desc(products.updatedAt));

  return ok(rows.map(mapProduct));
}

export async function getProductById(
  id: string
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const [row] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!row) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, row.bucketId)))
    return fail("Sin acceso a este negocio");
  return ok(mapProduct(row));
}

export async function createProduct(
  input: z.infer<typeof createProductSchema>
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");
  if (!(await userCanAccessBucket(user, parsed.data.bucketId)))
    return fail("Sin acceso a este negocio");

  try {
    const [row] = await db
      .insert(products)
      .values({
        bucketId: parsed.data.bucketId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        sku: parsed.data.sku ?? null,
        categoryId: parsed.data.categoryId ?? null,
        currency: parsed.data.currency,
        basePrice: fromMoney(parsed.data.basePrice),
        defaultMaterialsCost: fromMoney(parsed.data.defaultMaterialsCost),
        defaultLaborCost: fromMoney(parsed.data.defaultLaborCost),
        imageUrl: parsed.data.imageUrl ?? null,
        createdById: user.id,
      })
      .returning();

    await logChange(
      user.id,
      "product_created",
      row.id,
      `Creó el producto "${row.name}"`
    );
    revalidatePath(`/operations/${parsed.data.bucketId}/products`);
    return ok(mapProduct(row));
  } catch {
    return fail("No se pudo crear (¿SKU duplicado en este negocio?)");
  }
}

export async function updateProduct(
  input: z.infer<typeof updateProductSchema>
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, parsed.data.id))
    .limit(1);
  if (!existing) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const d = parsed.data;
  try {
    const [row] = await db
      .update(products)
      .set({
        name: d.name ?? existing.name,
        description:
          d.description !== undefined ? d.description : existing.description,
        sku: d.sku !== undefined ? d.sku : existing.sku,
        categoryId:
          d.categoryId !== undefined ? d.categoryId : existing.categoryId,
        status: d.status ?? existing.status,
        currency: d.currency ?? existing.currency,
        basePrice:
          d.basePrice !== undefined
            ? fromMoney(d.basePrice)
            : existing.basePrice,
        defaultMaterialsCost:
          d.defaultMaterialsCost !== undefined
            ? fromMoney(d.defaultMaterialsCost)
            : existing.defaultMaterialsCost,
        defaultLaborCost:
          d.defaultLaborCost !== undefined
            ? fromMoney(d.defaultLaborCost)
            : existing.defaultLaborCost,
        imageUrl: d.imageUrl !== undefined ? d.imageUrl : existing.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, d.id))
      .returning();

    await logChange(
      user.id,
      "product_updated",
      row.id,
      `Actualizó el producto "${row.name}"`
    );
    revalidatePath(`/operations/${existing.bucketId}/products`);
    revalidatePath(`/operations/${existing.bucketId}/products/${row.id}`);
    return ok(mapProduct(row));
  } catch {
    return fail("No se pudo actualizar (¿SKU duplicado en este negocio?)");
  }
}

export async function archiveProduct(
  id: string
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const [row] = await db
    .update(products)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  await logChange(
    user.id,
    "product_archived",
    row.id,
    `Archivó el producto "${row.name}"`
  );
  revalidatePath(`/operations/${existing.bucketId}/products`);
  return ok(mapProduct(row));
}

export async function restoreProduct(
  id: string
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  if (!existing) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const [row] = await db
    .update(products)
    .set({ status: "active", archivedAt: null, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();

  await logChange(
    user.id,
    "product_updated",
    row.id,
    `Restauró el producto "${row.name}"`
  );
  revalidatePath(`/operations/${existing.bucketId}/products`);
  return ok(mapProduct(row));
}

export async function updateProductCosts(
  input: z.infer<typeof updateProductCostsSchema>
): Promise<ActionResult<Product>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const parsed = updateProductCostsSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos");

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, parsed.data.id))
    .limit(1);
  if (!existing) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  await db.insert(productCostHistory).values({
    productId: parsed.data.id,
    materialsCost: fromMoney(parsed.data.materialsCost),
    laborCost: fromMoney(parsed.data.laborCost),
    note: parsed.data.note ?? null,
    changedById: user.id,
  });

  const [row] = await db
    .update(products)
    .set({
      defaultMaterialsCost: fromMoney(parsed.data.materialsCost),
      defaultLaborCost: fromMoney(parsed.data.laborCost),
      updatedAt: new Date(),
    })
    .where(eq(products.id, parsed.data.id))
    .returning();

  await logChange(
    user.id,
    "product_updated",
    row.id,
    `Actualizó costos de "${row.name}"`
  );
  revalidatePath(`/operations/${existing.bucketId}/products/${row.id}`);
  revalidatePath(`/operations/${existing.bucketId}/products/${row.id}/costs`);
  return ok(mapProduct(row));
}


export async function listProductCostHistory(
  productId: string
): Promise<ActionResult<CostHistoryEntry[]>> {
  const user = await getSessionUser();
  if (!user) return fail("No autenticado");
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!existing) return fail("Producto no encontrado");
  if (!(await userCanAccessBucket(user, existing.bucketId)))
    return fail("Sin acceso a este negocio");

  const rows = await db
    .select()
    .from(productCostHistory)
    .where(eq(productCostHistory.productId, productId))
    .orderBy(desc(productCostHistory.changedAt));

  return ok(
    rows.map((r) => ({
      id: r.id,
      materialsCost: toMoney(r.materialsCost),
      laborCost: toMoney(r.laborCost),
      note: r.note,
      changedAt: r.changedAt.toISOString(),
    }))
  );
}

// Helper de lectura para páginas server (no es action de mutación).
export async function getBucketName(
  bucketId: string
): Promise<string | null> {
  const [b] = await db
    .select({ name: buckets.name })
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .limit(1);
  return b?.name ?? null;
}
