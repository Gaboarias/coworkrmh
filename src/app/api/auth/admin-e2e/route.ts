import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  workspaces,
  workspaceMembers,
  erpProducts,
  erpQuotes,
  erpQuoteItems,
  erpSales,
  erpExpenses,
  erpTeam,
} from "@/lib/db/schema";
import { toMoney, fromMoney, fromRate } from "@/lib/utils/money";
import { computeQuoteTotals } from "@/lib/actions/erp";

// TEMP guarded — e2e del ciclo Entornos+ERP contra la DB real. Borrar tras usar.
const GUARD = "rmh-e2e-c4f9a72e15";

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== GUARD) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;
  let wsId: string | null = null;

  try {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .orderBy(users.createdAt)
      .limit(1);
    checks.push({
      name: "user-exists",
      ok: !!admin,
      detail: admin ? admin.id : "no users",
    });
    if (!admin) throw new Error("no users");

    // 1. Crear entorno temporal + miembro
    const [ws] = await db
      .insert(workspaces)
      .values({
        name: `E2E_${Date.now()}`,
        color: "#0E7A4E",
        createdBy: admin.id,
      })
      .returning();
    wsId = ws.id;
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: ws.id, userId: admin.id })
      .onConflictDoNothing();
    const mem = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, ws.id),
          eq(workspaceMembers.userId, admin.id)
        )
      );
    checks.push({
      name: "workspace+member",
      ok: mem.length === 1,
      detail: `ws=${ws.id} members=${mem.length}`,
    });

    // 2. Catálogo: producto + margen derivado
    const [p] = await db
      .insert(erpProducts)
      .values({
        workspaceId: ws.id,
        name: "Mesa comedor 4 puestos",
        category: "Muebles",
        materialsCost: fromMoney(45000),
        laborCost: fromMoney(55000),
        price: fromMoney(200000),
      })
      .returning();
    const totalCost = toMoney(p.materialsCost) + toMoney(p.laborCost);
    const profit = toMoney(p.price) - totalCost;
    const margin = toMoney(p.price) > 0 ? profit / toMoney(p.price) : 0;
    checks.push({
      name: "catalogo-derivados",
      ok: near(totalCost, 100000) && near(profit, 100000) && near(margin, 0.5),
      detail: `total=${totalCost} profit=${profit} margin=${margin}`,
    });

    // 3. Cotizador: items + totales con IVA 13% (verifica fix C1: rate 4 dec)
    const [q] = await db
      .insert(erpQuotes)
      .values({
        workspaceId: ws.id,
        title: "Pedido E2E",
        ivaRate: fromRate(0.13),
        createdById: admin.id,
      })
      .returning();
    await db.insert(erpQuoteItems).values([
      {
        quoteId: q.id,
        description: "Mesa",
        qty: fromMoney(1),
        unitCost: fromMoney(100000),
        unitPrice: fromMoney(200000),
        sortOrder: 0,
      },
      {
        quoteId: q.id,
        description: "Banco",
        qty: fromMoney(2),
        unitCost: fromMoney(12000),
        unitPrice: fromMoney(27000),
        sortOrder: 1,
      },
    ]);
    const storedRate = toMoney(q.ivaRate);
    const totals = await computeQuoteTotals(
      [
        { description: "Mesa", qty: 1, unitCost: 100000, unitPrice: 200000 },
        { description: "Banco", qty: 2, unitCost: 12000, unitPrice: 27000 },
      ],
      storedRate
    );
    // prod=100000+24000=124000 ; net=200000+54000=254000 ; iva=254000*0.13=33020
    checks.push({
      name: "cotizador-totales+IVA(C1)",
      ok:
        near(storedRate, 0.13) &&
        near(totals.productionCost, 124000) &&
        near(totals.netSales, 254000) &&
        near(totals.ivaAmount, 33020) &&
        near(totals.totalWithIva, 287020),
      detail: `rate=${storedRate} prod=${totals.productionCost} net=${totals.netSales} iva=${totals.ivaAmount} total=${totals.totalWithIva}`,
    });

    // 4. Ventas: total y ganancia derivados
    const [s] = await db
      .insert(erpSales)
      .values({
        workspaceId: ws.id,
        saleDate: "2025-05-16",
        description: "Set 4 vasos",
        category: "Vidrio",
        qty: fromMoney(2),
        unitCost: fromMoney(3200),
        unitPrice: fromMoney(8500),
        createdById: admin.id,
      })
      .returning();
    const sQty = toMoney(s.qty);
    const sTotal = sQty * toMoney(s.unitPrice);
    const sProfit = sTotal - sQty * toMoney(s.unitCost);
    checks.push({
      name: "ventas-derivados",
      ok: near(sTotal, 17000) && near(sProfit, 10600),
      detail: `total=${sTotal} profit=${sProfit}`,
    });

    // 5. Gastos: punto de equilibrio = fijos / margen (margen 4 dec)
    await db.insert(erpExpenses).values([
      {
        workspaceId: ws.id,
        kind: "fixed",
        concept: "Transporte",
        amount: fromMoney(160000),
        createdById: admin.id,
      },
      {
        workspaceId: ws.id,
        kind: "investment",
        concept: "Cortadora",
        amount: fromMoney(400000),
        priority: "alta",
        createdById: admin.id,
      },
    ]);
    await db
      .update(workspaces)
      .set({ breakEvenMargin: fromRate(0.45) })
      .where(eq(workspaces.id, ws.id));
    const [wsRow] = await db
      .select({ m: workspaces.breakEvenMargin })
      .from(workspaces)
      .where(eq(workspaces.id, ws.id))
      .limit(1);
    const mrg = toMoney(wsRow.m);
    const breakEven = mrg > 0 ? 160000 / mrg : 0;
    checks.push({
      name: "gastos-equilibrio",
      ok: near(mrg, 0.45) && near(breakEven, 355555.56, 0.5),
      detail: `margin=${mrg} breakEven=${breakEven.toFixed(2)}`,
    });

    // 6. Equipo
    const [tm] = await db
      .insert(erpTeam)
      .values({
        workspaceId: ws.id,
        name: "Gabriel",
        role: "Fundador",
        status: "active",
      })
      .returning();
    checks.push({
      name: "equipo-insert",
      ok: !!tm?.id,
      detail: tm?.id ?? "fail",
    });

    // 7. Scoping: el producto pertenece SOLO a este entorno
    const scoped = await db
      .select()
      .from(erpProducts)
      .where(eq(erpProducts.workspaceId, ws.id));
    const otherScope = await db
      .select()
      .from(erpProducts)
      .where(eq(erpProducts.workspaceId, admin.id)); // id que no es ws → 0
    checks.push({
      name: "scoping-aislado",
      ok: scoped.length === 1 && otherScope.length === 0,
      detail: `thisWs=${scoped.length} otherScope=${otherScope.length}`,
    });

    // 8. Cleanup: borrar entorno → cascade borra todo el ERP
    await db.delete(workspaces).where(eq(workspaces.id, ws.id));
    wsId = null;
    const leftover = await db
      .select()
      .from(erpProducts)
      .where(eq(erpProducts.workspaceId, ws.id));
    checks.push({
      name: "cascade-cleanup",
      ok: leftover.length === 0,
      detail: `leftoverProducts=${leftover.length}`,
    });
  } catch (e) {
    checks.push({
      name: "exception",
      ok: false,
      detail: (e as Error).message,
    });
  } finally {
    if (wsId) {
      await db.delete(workspaces).where(eq(workspaces.id, wsId)).catch(() => {});
    }
  }

  const passed = checks.filter((c) => c.ok).length;
  return NextResponse.json({
    ok: checks.every((c) => c.ok),
    passed: `${passed}/${checks.length}`,
    checks,
  });
}
