import { prisma } from "@/lib/prisma";
import { getExpenseSummary } from "@/lib/expenses";
import { createExpense, deleteExpense } from "./actions";

function currency(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function GastosPage({ searchParams }: PageProps<"/gastos">) {
  const sp = await searchParams;
  const fromStr = (typeof sp.from === "string" && sp.from) || firstDayOfMonth();
  const toStr = (typeof sp.to === "string" && sp.to) || todayStr();
  const from = new Date(`${fromStr}T00:00:00.000Z`);
  const to = new Date(`${toStr}T23:59:59.999Z`);

  const [locations, { expenses, totals, bodegaCompartidoTotal }] = await Promise.all([
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getExpenseSummary(from, to),
  ]);

  const granTotal = totals.reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Gastos</h1>
        <p className="text-sm text-neutral-500">
          Gastos por local y gastos compartidos de bodega (se reparten en partes iguales entre los locales activos).
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Desde</label>
          <input type="date" name="from" defaultValue={fromStr} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Hasta</label>
          <input type="date" name="to" defaultValue={toStr} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
          Filtrar
        </button>
      </form>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Registrar gasto</h2>
        <form action={createExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col gap-1 text-sm">
            Fecha
            <input type="date" name="date" defaultValue={todayStr()} required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select name="scope" className="rounded border border-neutral-300 px-2 py-1.5">
              <option value="LOCAL">Gasto de un local</option>
              <option value="BODEGA_COMPARTIDO">Gasto de bodega (se reparte)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Local (si aplica)
            <select name="locationId" className="rounded border border-neutral-300 px-2 py-1.5">
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Categoría
            <input type="text" name="category" placeholder="PUBLICIDAD, GASOLINA, ARRIENDO..." required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Monto
            <input type="number" name="amount" min={1} required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Descripción (opcional)
            <input type="text" name="description" className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <button type="submit" className="self-end rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 sm:col-span-2 lg:col-span-1">
            Agregar
          </button>
        </form>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Resumen {fromStr} a {toStr}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-1">Local</th>
              <th className="py-1 text-right">Gastos propios</th>
              <th className="py-1 text-right">Parte de bodega</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((t) => (
              <tr key={t.location.id} className="border-b border-neutral-100">
                <td className="py-1">{t.location.name}</td>
                <td className="py-1 text-right">{currency(t.localAmount)}</td>
                <td className="py-1 text-right">{currency(t.bodegaShare)}</td>
                <td className="py-1 text-right font-medium">{currency(t.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="pt-2">Total general</td>
              <td></td>
              <td className="pt-2 text-right">Bodega: {currency(bodegaCompartidoTotal)}</td>
              <td className="pt-2 text-right">{currency(granTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Detalle de gastos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-1">Fecha</th>
              <th className="py-1">Local</th>
              <th className="py-1">Categoría</th>
              <th className="py-1">Descripción</th>
              <th className="py-1 text-right">Monto</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100">
                <td className="py-1">{e.date.toISOString().slice(0, 10)}</td>
                <td className="py-1">{e.location?.name ?? "Bodega (compartido)"}</td>
                <td className="py-1">{e.category}</td>
                <td className="py-1 text-neutral-500">{e.description ?? ""}</td>
                <td className="py-1 text-right">{currency(e.amount)}</td>
                <td className="py-1 text-right">
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      eliminar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-neutral-400">
                  Sin gastos registrados en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
