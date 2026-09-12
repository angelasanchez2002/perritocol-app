import { prisma } from "@/lib/prisma";
import { getExpenseSummary } from "@/lib/expenses";

export async function getGananciaSummary(from: Date, to: Date) {
  const locations = await prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  const sales = await prisma.dailySale.groupBy({
    by: ["locationId"],
    where: { date: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  const salesByLocation = new Map(sales.map((s) => [s.locationId, s._sum.amount ?? 0]));

  const { totals: expenseTotals } = await getExpenseSummary(from, to);

  const payrollWeeks = await prisma.payrollWeek.findMany({
    where: { weekStart: { gte: from, lte: to } },
    include: { employee: true, days: true, loanPayments: true },
  });

  const nominaByLocation = new Map<string, number>(locations.map((l) => [l.id, 0]));
  let nominaBodegaTotal = 0;
  for (const pw of payrollWeeks) {
    const earned = pw.days.reduce((s, d) => s + (d.worked ? pw.employee.payPerShift : 0), 0);
    const vales = pw.days.reduce((s, d) => s + d.valeAmount, 0);
    const loanPay = pw.loanPayments.reduce((s, p) => s + p.amount, 0);
    const total = earned - vales - loanPay;
    if (pw.employee.group === "LOCAL" && pw.employee.locationId) {
      nominaByLocation.set(pw.employee.locationId, (nominaByLocation.get(pw.employee.locationId) ?? 0) + total);
    } else {
      nominaBodegaTotal += total;
    }
  }
  const nominaBodegaShare = locations.length > 0 ? nominaBodegaTotal / locations.length : 0;

  const rows = locations.map((l) => {
    const ventas = salesByLocation.get(l.id) ?? 0;
    const gastos = expenseTotals.find((t) => t.location.id === l.id)?.total ?? 0;
    const nomina = (nominaByLocation.get(l.id) ?? 0) + nominaBodegaShare;
    const ganancia = ventas - gastos - nomina;
    return { location: l, ventas, gastos, nomina, ganancia };
  });

  const grand = rows.reduce(
    (acc, r) => ({
      ventas: acc.ventas + r.ventas,
      gastos: acc.gastos + r.gastos,
      nomina: acc.nomina + r.nomina,
      ganancia: acc.ganancia + r.ganancia,
    }),
    { ventas: 0, gastos: 0, nomina: 0, ganancia: 0 }
  );

  return { rows, grand };
}
