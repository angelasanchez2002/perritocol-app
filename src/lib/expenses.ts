import { prisma } from "@/lib/prisma";

export async function getExpenseSummary(from: Date, to: Date) {
  const locations = await prisma.location.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    include: { location: true },
    orderBy: { date: "desc" },
  });

  const localTotals = new Map<string, number>(locations.map((l) => [l.id, 0]));
  let bodegaCompartidoTotal = 0;
  for (const e of expenses) {
    if (e.scope === "LOCAL" && e.locationId) {
      localTotals.set(e.locationId, (localTotals.get(e.locationId) ?? 0) + e.amount);
    } else {
      bodegaCompartidoTotal += e.amount;
    }
  }

  const bodegaShare = locations.length > 0 ? bodegaCompartidoTotal / locations.length : 0;
  const totals = locations.map((l) => {
    const localAmount = localTotals.get(l.id) ?? 0;
    return {
      location: l,
      localAmount,
      bodegaShare,
      total: localAmount + bodegaShare,
    };
  });

  return { expenses, totals, bodegaCompartidoTotal, locations };
}
