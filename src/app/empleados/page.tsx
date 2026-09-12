import { prisma } from "@/lib/prisma";
import { createEmployee, toggleEmployeeActive, createLoan } from "./actions";
import { getLoanBalance } from "@/lib/payroll";

function currency(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default async function EmpleadosPage() {
  const [employees, locations] = await Promise.all([
    prisma.employee.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }], include: { location: true } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const balances = await Promise.all(employees.map((e) => getLoanBalance(e.id)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Empleados</h1>
        <p className="text-sm text-neutral-500">Personal de local y de bodega, y sus préstamos.</p>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Nuevo empleado</h2>
        <form action={createEmployee} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input type="text" name="name" required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Grupo
            <select name="group" className="rounded border border-neutral-300 px-2 py-1.5">
              <option value="LOCAL">Local</option>
              <option value="BODEGA">Bodega</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Rol
            <input type="text" name="role" placeholder="CAJERA_PRINCIPAL, BODEGUERO..." required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Local (si es de local)
            <select name="locationId" className="rounded border border-neutral-300 px-2 py-1.5">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pago por turno
            <input type="number" name="payPerShift" min={1} required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <button type="submit" className="self-end rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500">
            Agregar
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Registrar préstamo</h2>
        <form action={createLoan} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            Empleado
            <select name="employeeId" required className="rounded border border-neutral-300 px-2 py-1.5">
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Fecha
            <input type="date" name="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Monto
            <input type="number" name="amount" min={1} required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Nota
            <input type="text" name="note" className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <button type="submit" className="self-end rounded bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 sm:col-span-2 lg:col-span-1">
            Registrar préstamo
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-1">Nombre</th>
              <th className="py-1">Grupo</th>
              <th className="py-1">Rol</th>
              <th className="py-1">Local</th>
              <th className="py-1 text-right">Pago/turno</th>
              <th className="py-1 text-right">Saldo préstamo</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e, i) => (
              <tr key={e.id} className={`border-b border-neutral-100 ${e.active ? "" : "text-neutral-400"}`}>
                <td className="py-1">{e.name}</td>
                <td className="py-1">{e.group}</td>
                <td className="py-1">{e.role}</td>
                <td className="py-1">{e.location?.name ?? "—"}</td>
                <td className="py-1 text-right">{currency(e.payPerShift)}</td>
                <td className="py-1 text-right">{currency(balances[i])}</td>
                <td className="py-1 text-right">
                  <form action={toggleEmployeeActive}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="active" value={String(e.active)} />
                    <button type="submit" className="text-xs text-neutral-500 hover:underline">
                      {e.active ? "desactivar" : "activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
