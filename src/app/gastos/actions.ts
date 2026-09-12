"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ExpenseScope } from "@/generated/prisma/client";

function parseDateInput(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function createExpense(formData: FormData) {
  const dateStr = String(formData.get("date"));
  const scope = String(formData.get("scope")) as ExpenseScope;
  const locationId = scope === "LOCAL" ? String(formData.get("locationId")) : null;
  const category = String(formData.get("category")).trim();
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!category || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Categoría y monto son obligatorios.");
  }

  await prisma.expense.create({
    data: {
      date: parseDateInput(dateStr),
      scope,
      locationId,
      category,
      amount,
      description,
    },
  });

  revalidatePath("/gastos");
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/gastos");
}
