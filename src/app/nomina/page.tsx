import { prisma } from "@/lib/prisma";
import { OPERATIONAL_DAYS, getLoanBalance } from "@/lib/payroll";
import { normalizeToWednesday } from "@/lib/dates";
import { saveNomina } from "./actions";

function currency(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default async function NominaPage({ searchParams }: PageProps<"/nomina">) {
  const sp = await searchParams;
  const rawDate = (typeof sp.weekStart === "string" && sp.weekStart) || new Date().toISOString().slice(0, 10);
  const weekStartStr = normalizeToWednesday(rawDate);
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const guardado = sp.guardado === "1";

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    include: {
      location: true,
      payrollWeeks: {
        where: { weekStart },
        include: { days: true, loanPayments: true },
      },
    },
  });

  const loanBalances = await Promise.all(employees.map((e) => getLoanBalance(e.id)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Nómina semanal</h1>
        <p className="text-sm text-neutral-500">
          Semana operativa miércoles a domingo (más lunes festivo si aplica).
        </p>
      </div>

      {guardado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Nómina guardada correctamente.
        </div>
      )}

      <form method="GET" className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Cualquier día de la semana</label>
          <input type="date" name="weekStart" defaultValue={weekStartStr} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
          Ver semana
        </button>
        <span className="text-sm text-neutral-500">Semana del {weekStartStr}</span>
      </form>

      <form action={saveNomina} className="flex flex-col gap-4">
        <input type="hidden" name="weekStart" value={weekStartStr} />
        <div className="overflow-x-auto rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1">Empleado</th>
                {OPERATIONAL_DAYS.map((d) => (
                  <th key={d.value} className="py-1 text-center">
                    {d.label}
                  </th>
                ))}
                <th className="py-1 text-right">Préstamo</th>
                <th className="py-1 text-right">Saldo préstamo</th>
                <th className="py-1 text-right">Total a pagar</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e, i) => {
                const existing = e.payrollWeeks[0];
                const dayByType = new Map(existing?.days.map((d) => [d.dayOfWeek, d]));
                const earned = OPERATIONAL_DAYS.reduce((sum, d) => {
                  const day = dayByType.get(d.value);
                  const worked = day ? day.worked : d.value !== "LUN_FESTIVO";
                  return sum + (worked ? e.payPerShift : 0);
                }, 0);
                const vales = OPERATIONAL_DAYS.reduce((sum, d) => sum + (dayByType.get(d.value)?.valeAmount ?? 0), 0);
                const loanPaymentSaved = existing?.loanPayments.reduce((s, p) => s + p.amount, 0) ?? 0;

                return (
                  <tr key={e.id} className="border-b border-neutral-100 align-top">
                    <td className="py-2">
                      <input type="hidden" name="employeeId" value={e.id} />
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-neutral-400">
                        {e.role} · {e.location?.name ?? "Bodega"} · {currency(e.payPerShift)}/turno
                      </div>
                    </td>
                    {OPERATIONAL_DAYS.map((d) => {
                      const day = dayByType.get(d.value);
                      const defaultWorked = day ? day.worked : d.value !== "LUN_FESTIVO";
                      return (
                        <td key={d.value} className="py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="checkbox"
                              name={`worked_${e.id}_${d.value}`}
                              defaultChecked={defaultWorked}
                            />
                            <input
                              type="number"
                              min={0}
                              name={`vale_${e.id}_${d.value}`}
                              defaultValue={day?.valeAmount ?? 0}
                              placeholder="vale"
                              className="w-16 rounded border border-neutral-300 px-1 py-0.5 text-right text-xs"
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        name={`loanPayment_${e.id}`}
                        defaultValue={loanPaymentSaved}
                        className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="py-2 text-right text-xs text-neutral-500">{currency(loanBalances[i])}</td>
                    <td className="py-2 text-right font-medium">{currency(earned - vales - loanPaymentSaved)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="self-start rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Guardar nómina de la semana
        </button>
      </form>
    </div>
  );
}
