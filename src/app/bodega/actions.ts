"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeAvgCost } from "@/lib/warehouse";

// Simplificación de la primera versión: el despacho se captura como un total
// semanal por local (no desglosado día a día como en el Excel). Se guarda bajo
// un único "día" ancla para reutilizar la tabla WarehouseDispatch tal cual.
const WEEKLY_DISPATCH_DAY = "DOM" as const;

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const value = typeof raw === "string" && raw !== "" ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export async function createIngredient(formData: FormData) {
  const name = String(formData.get("name")).trim().toUpperCase();
  const unit = String(formData.get("unit")).trim();
  if (!name || !unit) throw new Error("Nombre y unidad son obligatorios.");
  await prisma.ingredient.create({ data: { name, unit } });
  revalidatePath("/bodega");
}

export async function saveWarehouseWeek(formData: FormData) {
  const weekStartStr = String(formData.get("weekStart"));
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const ingredientIds = formData.getAll("ingredientId").map(String);
  const locations = await prisma.location.findMany({ where: { active: true } });
  const dispatchValueByLocation = new Map<string, number>(locations.map((l) => [l.id, 0]));

  for (const ingredientId of ingredientIds) {
    const openingQty = num(formData, `openingQty_${ingredientId}`);
    const openingAvgCost = num(formData, `openingAvgCost_${ingredientId}`);
    const purchasedQty = num(formData, `purchasedQty_${ingredientId}`);
    const purchaseUnitCost = num(formData, `purchaseUnitCost_${ingredientId}`);
    const internalUseQty = num(formData, `internalUseQty_${ingredientId}`);

    const dispatchByLocation = locations.map((l) => ({
      locationId: l.id,
      quantity: num(formData, `dispatch_${ingredientId}_${l.id}`),
    }));
    const totalDispatched = dispatchByLocation.reduce((s, d) => s + d.quantity, 0);

    const avgUnitCost = computeAvgCost(openingQty, openingAvgCost, purchasedQty, purchaseUnitCost);
    const closingQtyCalc = openingQty + purchasedQty - internalUseQty - totalDispatched;

    const physicalCountRaw = formData.get(`physicalCount_${ingredientId}`);
    const hasPhysicalCount = typeof physicalCountRaw === "string" && physicalCountRaw !== "";
    const closingQtyCounted = hasPhysicalCount ? Number(physicalCountRaw) : null;

    const week = await prisma.warehouseWeek.upsert({
      where: { ingredientId_weekStart: { ingredientId, weekStart } },
      update: {
        openingQty,
        openingAvgCost,
        purchasedQty,
        purchaseUnitCost: purchasedQty > 0 ? purchaseUnitCost : null,
        avgUnitCost,
        internalUseQty,
        closingQtyCalc,
        closingQtyCounted,
        isPhysicalCount: hasPhysicalCount,
      },
      create: {
        ingredientId,
        weekStart,
        openingQty,
        openingAvgCost,
        purchasedQty,
        purchaseUnitCost: purchasedQty > 0 ? purchaseUnitCost : null,
        avgUnitCost,
        internalUseQty,
        closingQtyCalc,
        closingQtyCounted,
        isPhysicalCount: hasPhysicalCount,
      },
    });

    await prisma.warehouseDispatch.deleteMany({ where: { warehouseWeekId: week.id } });
    const dispatchRows = dispatchByLocation
      .filter((d) => d.quantity > 0)
      .map((d) => ({
        warehouseWeekId: week.id,
        locationId: d.locationId,
        dayOfWeek: WEEKLY_DISPATCH_DAY,
        quantity: d.quantity,
      }));
    if (dispatchRows.length > 0) {
      await prisma.warehouseDispatch.createMany({ data: dispatchRows });
    }

    const targetQty = num(formData, `stockTarget_${ingredientId}`);
    if (targetQty > 0) {
      await prisma.stockTarget.upsert({
        where: { ingredientId },
        update: { targetQty },
        create: { ingredientId, targetQty },
      });
    }

    for (const d of dispatchByLocation) {
      if (d.quantity <= 0) continue;
      dispatchValueByLocation.set(
        d.locationId,
        (dispatchValueByLocation.get(d.locationId) ?? 0) + d.quantity * avgUnitCost
      );
    }
  }

  // Refleja el total despachado esa semana en el gasto "BODEGA $" de cada local,
  // igual que hoy se suma a mano el total de la semana en la hoja de GASTOS.
  for (const [locationId, amount] of dispatchValueByLocation) {
    const existing = await prisma.expense.findFirst({
      where: { locationId, date: weekStart, scope: "LOCAL", category: "BODEGA $" },
    });
    if (amount <= 0) {
      if (existing) await prisma.expense.delete({ where: { id: existing.id } });
      continue;
    }
    if (existing) {
      await prisma.expense.update({ where: { id: existing.id }, data: { amount } });
    } else {
      await prisma.expense.create({
        data: { locationId, date: weekStart, scope: "LOCAL", category: "BODEGA $", amount },
      });
    }
  }

  revalidatePath("/bodega");
  revalidatePath("/gastos");
  redirect(`/bodega?weekStart=${weekStartStr}&guardado=1`);
}
