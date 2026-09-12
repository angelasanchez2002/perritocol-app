import { prisma } from "@/lib/prisma";

export async function getActiveProductsWithPriceAt(date: Date) {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: {
        where: { effectiveFrom: { lte: date } },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.prices[0]?.price ?? 0,
  }));
}
