import { prisma } from "@/lib/prisma";
import type { DayOfWeek } from "@/generated/prisma/client";

export const OPERATIONAL_DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "LUN_FESTIVO", label: "Lunes festivo" },
  { value: "MIE", label: "Miércoles" },
  { value: "JUE", label: "Jueves" },
  { value: "VIE", label: "Viernes" },
  { value: "SAB", label: "Sábado" },
  { value: "DOM", label: "Domingo" },
];

export async function getLoanBalance(employeeId: string): Promise<number> {
  const loans = await prisma.loan.findMany({
    where: { employeeId },
    include: { payments: true },
  });
  return loans.reduce((sum, loan) => {
    const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
    return sum + (loan.amount - paid);
  }, 0);
}

/** Reparte un abono entre los préstamos activos del empleado, del más viejo al más nuevo. */
export async function applyLoanPayment(
  employeeId: string,
  payrollWeekId: string,
  amount: number
) {
  if (amount <= 0) return;

  const loans = await prisma.loan.findMany({
    where: { employeeId },
    include: { payments: true },
    orderBy: { date: "asc" },
  });

  let remaining = amount;
  for (const loan of loans) {
    if (remaining <= 0) break;
    const paid = loan.payments.reduce((s, p) => s + p.amount, 0);
    const balance = loan.amount - paid;
    if (balance <= 0) continue;
    const toApply = Math.min(balance, remaining);
    await prisma.loanPayment.create({
      data: { loanId: loan.id, payrollWeekId, amount: toApply },
    });
    remaining -= toApply;
  }
}
