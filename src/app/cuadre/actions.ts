"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveProductsWithPriceAt } from "@/lib/pricing";
import type { CajaTipo } from "@/generated/prisma/client";

const GASTOS_VARIOS_CATEGORY = "GASTOS VARIOS";
const CENA_CATEGORY = "CENA EMPLEADOS";

function parseDateInput(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

export async function saveDailyClosing(formData: FormData) {
  const locationId = String(formData.get("locationId"));
  const dateStr = String(formData.get("date"));
  const cajaTipo = String(formData.get("cajaTipo")) as CajaTipo;
  const date = parseDateInput(dateStr);

  const products = await getActiveProductsWithPriceAt(date);

  const saleRows = products
    .map((p) => {
      const quantity = num(formData, `qty_${p.id}`);
      return quantity > 0
        ? {
            date,
            locationId,
            cajaTipo,
            productId: p.id,
            quantity,
            unitPrice: p.price,
            amount: quantity * p.price,
          }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const transferAmount = num(formData, "transferencias");
  const countedCash = num(formData, "efectivoContado");
  const note = String(formData.get("nota") ?? "").trim() || null;

  const gastosVarios = cajaTipo === "PRINCIPAL" ? num(formData, "gastosVarios") : 0;
  const cena = cajaTipo === "PRINCIPAL" ? num(formData, "cena") : 0;

  await prisma.$transaction(async (tx) => {
    await tx.dailySale.deleteMany({ where: { locationId, date, cajaTipo } });
    if (saleRows.length > 0) {
      await tx.dailySale.createMany({ data: saleRows });
    }

    await tx.bankTransfer.deleteMany({ where: { locationId, date, cajaTipo } });
    if (transferAmount > 0) {
      await tx.bankTransfer.create({
        data: { locationId, date, cajaTipo, amount: transferAmount },
      });
    }

    if (cajaTipo === "PRINCIPAL") {
      await tx.expense.deleteMany({
        where: {
          locationId,
          date,
          scope: "LOCAL",
          category: { in: [GASTOS_VARIOS_CATEGORY, CENA_CATEGORY] },
        },
      });
      if (gastosVarios > 0) {
        await tx.expense.create({
          data: { locationId, date, scope: "LOCAL", category: GASTOS_VARIOS_CATEGORY, amount: gastosVarios },
        });
      }
      if (cena > 0) {
        await tx.expense.create({
          data: { locationId, date, scope: "LOCAL", category: CENA_CATEGORY, amount: cena },
        });
      }
    }

    const totalVentas = saleRows.reduce((sum, r) => sum + r.amount, 0);
    const efectivoEsperado = totalVentas - transferAmount - gastosVarios - cena;
    const difference = countedCash - efectivoEsperado;

    await tx.cashClosing.upsert({
      where: { locationId_date_cajaTipo: { locationId, date, cajaTipo } },
      update: { countedCash, difference, note },
      create: { locationId, date, cajaTipo, countedCash, difference, note },
    });
  });

  revalidatePath("/cuadre");
  redirect(
    `/cuadre?locationId=${locationId}&date=${dateStr}&cajaTipo=${cajaTipo}&guardado=1`
  );
}
