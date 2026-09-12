import { prisma } from "@/lib/prisma";

export async function getPreviousWeekClosing(ingredientId: string, weekStart: Date) {
  const prev = await prisma.warehouseWeek.findFirst({
    where: { ingredientId, weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
  });
  if (!prev) return { openingQty: 0, openingAvgCost: 0 };
  const openingQty = prev.closingQtyCounted ?? prev.closingQtyCalc;
  return { openingQty, openingAvgCost: prev.avgUnitCost };
}

/** Costo promedio ponderado: mezcla lo que ya había en bodega con la compra nueva. */
export function computeAvgCost(
  openingQty: number,
  openingAvgCost: number,
  purchasedQty: number,
  purchaseUnitCost: number
): number {
  if (purchasedQty <= 0) return openingAvgCost;
  const totalQty = openingQty + purchasedQty;
  if (totalQty <= 0) return purchaseUnitCost;
  return (openingQty * openingAvgCost + purchasedQty * purchaseUnitCost) / totalQty;
}
