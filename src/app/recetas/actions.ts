"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function saveRecipe(formData: FormData) {
  const productId = String(formData.get("productId"));
  const ingredientIds = formData.getAll("ingredientId").map(String);

  await prisma.$transaction(async (tx) => {
    await tx.recipe.deleteMany({ where: { productId } });
    const lines = ingredientIds
      .map((ingredientId) => {
        const raw = formData.get(`qty_${ingredientId}`);
        const quantityPerUnit = typeof raw === "string" ? Number(raw) : 0;
        return quantityPerUnit > 0 ? { productId, ingredientId, quantityPerUnit } : null;
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
    if (lines.length > 0) {
      await tx.recipe.createMany({ data: lines });
    }
  });

  revalidatePath("/recetas");
  redirect(`/recetas?productId=${productId}&guardado=1`);
}
