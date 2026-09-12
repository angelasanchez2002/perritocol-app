import { prisma } from "@/lib/prisma";

export async function getPreviousLocalClosing(
  locationId: string,
  ingredientId: string,
  weekStart: Date
): Promise<number> {
  const prev = await prisma.localInventoryCount.findFirst({
    where: { locationId, ingredientId, weekStart: { lt: weekStart } },
    orderBy: { weekStart: "desc" },
  });
  return prev?.closingQty ?? 0;
}

/** Consumo teórico por insumo, según las ventas del local en la semana y las recetas definidas. */
export async function getTheoreticalConsumption(
  locationId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<Map<string, number>> {
  const sales = await prisma.dailySale.findMany({
    where: { locationId, date: { gte: weekStart, lte: weekEnd } },
    include: { product: { include: { recipe: true } } },
  });

  const map = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.product.recipe) {
      map.set(line.ingredientId, (map.get(line.ingredientId) ?? 0) + line.quantityPerUnit * sale.quantity);
    }
  }
  return map;
}

export function addDays(dateStr: string, days: number): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
