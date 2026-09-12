"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function saveLocalInventory(formData: FormData) {
  const locationId = String(formData.get("locationId"));
  const weekStartStr = String(formData.get("weekStart"));
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const ingredientIds = formData.getAll("ingredientId").map(String);

  for (const ingredientId of ingredientIds) {
    const raw = formData.get(`closingQty_${ingredientId}`);
    if (typeof raw !== "string" || raw === "") continue;
    const closingQty = Number(raw);
    if (!Number.isFinite(closingQty)) continue;

    await prisma.localInventoryCount.upsert({
      where: { locationId_ingredientId_weekStart: { locationId, ingredientId, weekStart } },
      update: { closingQty },
      create: { locationId, ingredientId, weekStart, closingQty },
    });
  }

  revalidatePath("/consumo");
  redirect(`/consumo?locationId=${locationId}&weekStart=${weekStartStr}&guardado=1`);
}
