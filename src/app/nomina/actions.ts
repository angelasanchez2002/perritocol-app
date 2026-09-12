"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OPERATIONAL_DAYS, applyLoanPayment } from "@/lib/payroll";

export async function saveNomina(formData: FormData) {
  const weekStartStr = String(formData.get("weekStart"));
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const employeeIds = formData.getAll("employeeId").map(String);

  for (const employeeId of employeeIds) {
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const basePay = employee.payPerShift * OPERATIONAL_DAYS.length;

    const payrollWeek = await prisma.payrollWeek.upsert({
      where: { employeeId_weekStart: { employeeId, weekStart } },
      update: { basePay },
      create: { employeeId, weekStart, basePay },
    });

    await prisma.payrollDay.deleteMany({ where: { payrollWeekId: payrollWeek.id } });
    await prisma.payrollDay.createMany({
      data: OPERATIONAL_DAYS.map((d) => ({
        payrollWeekId: payrollWeek.id,
        dayOfWeek: d.value,
        worked: formData.get(`worked_${employeeId}_${d.value}`) === "on",
        valeAmount: Number(formData.get(`vale_${employeeId}_${d.value}`) ?? 0) || 0,
      })),
    });

    // Reiniciar los abonos a préstamos hechos desde esta semana antes de re-aplicar.
    await prisma.loanPayment.deleteMany({ where: { payrollWeekId: payrollWeek.id } });
    const loanPaymentAmount = Number(formData.get(`loanPayment_${employeeId}`) ?? 0) || 0;
    await applyLoanPayment(employeeId, payrollWeek.id, loanPaymentAmount);
  }

  revalidatePath("/nomina");
  redirect(`/nomina?weekStart=${weekStartStr}&guardado=1`);
}
