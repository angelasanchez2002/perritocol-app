import { getGananciaSummary } from "@/lib/ganancia";

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

export default async function GananciaPage({ searchParams }: PageProps<"/ganancia">) {
  const sp = await searchParams;
  const fromStr = (typeof sp.from === "string" && sp.from) || firstDayOfMonth();
  const toStr = (typeof sp.to === "string" && sp.to) || todayStr();
  const from = new Date(`${fromStr}T00:00:00.000Z`);
  const to = new Date(`${toStr}T23:59:59.999Z`);

  const { rows, grand } = await getGananciaSummary(from, to);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ganancia consolidada</h1>
        <p className="text-sm text-neutral-500">
          Ventas − gastos (propios + parte de bodega) − nómina (local + parte de bodega), calculado
          automáticamente. La nómina solo cuenta semanas completas dentro del rango elegido.
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
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">
          Resumen {fromStr} a {toStr}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="py-1">Local</th>
              <th className="py-1 text-right">Ventas</th>
              <th className="py-1 text-right">Gastos</th>
              <th className="py-1 text-right">Nómina</th>
              <th className="py-1 text-right">Ganancia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.location.id} className="border-b border-neutral-100">
                <td className="py-1">{r.location.name}</td>
                <td className="py-1 text-right">{currency(r.ventas)}</td>
                <td className="py-1 text-right">{currency(r.gastos)}</td>
                <td className="py-1 text-right">{currency(r.nomina)}</td>
                <td className={`py-1 text-right font-medium ${r.ganancia >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {currency(r.ganancia)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className="pt-2">Total general</td>
              <td className="pt-2 text-right">{currency(grand.ventas)}</td>
              <td className="pt-2 text-right">{currency(grand.gastos)}</td>
              <td className="pt-2 text-right">{currency(grand.nomina)}</td>
              <td className={`pt-2 text-right ${grand.ganancia >= 0 ? "text-green-700" : "text-red-600"}`}>
                {currency(grand.ganancia)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
