import { prisma } from "@/lib/prisma";
import { normalizeToWednesday } from "@/lib/dates";
import { getPreviousWeekClosing } from "@/lib/warehouse";
import { saveWarehouseWeek, createIngredient } from "./actions";

function currency(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function qty(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

export default async function BodegaPage({ searchParams }: PageProps<"/bodega">) {
  const sp = await searchParams;
  const rawDate = (typeof sp.weekStart === "string" && sp.weekStart) || new Date().toISOString().slice(0, 10);
  const weekStartStr = normalizeToWednesday(rawDate);
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const guardado = sp.guardado === "1";

  const [ingredients, locations] = await Promise.all([
    prisma.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = await Promise.all(
    ingredients.map(async (ing) => {
      const existingWeek = await prisma.warehouseWeek.findUnique({
        where: { ingredientId_weekStart: { ingredientId: ing.id, weekStart } },
        include: { dispatches: true },
      });
      const stockTarget = await prisma.stockTarget.findUnique({ where: { ingredientId: ing.id } });

      const opening = existingWeek
        ? { openingQty: existingWeek.openingQty, openingAvgCost: existingWeek.openingAvgCost }
        : await getPreviousWeekClosing(ing.id, weekStart);

      const dispatchByLocation = new Map(existingWeek?.dispatches.map((d) => [d.locationId, d.quantity]) ?? []);
      const suggestion = Math.max((stockTarget?.targetQty ?? 0) - opening.openingQty, 0);

      return { ingredient: ing, opening, existingWeek, dispatchByLocation, stockTarget, suggestion };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Bodega — compras y despacho</h1>
        <p className="text-sm text-neutral-500">
          Costo promedio ponderado por insumo. El despacho se registra como total semanal por local
          (no día a día todavía) y actualiza automáticamente el gasto &quot;BODEGA $&quot; de cada local.
        </p>
      </div>

      {guardado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Bodega guardada correctamente.
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

      <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Nuevo insumo</h2>
        <form action={createIngredient} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input type="text" name="name" required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Unidad
            <input type="text" name="unit" placeholder="unidad, libra, galón..." required className="rounded border border-neutral-300 px-2 py-1.5" />
          </label>
          <button type="submit" className="rounded bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            Agregar insumo
          </button>
        </form>
      </div>

      <form action={saveWarehouseWeek} className="flex flex-col gap-4">
        <input type="hidden" name="weekStart" value={weekStartStr} />
        <div className="overflow-x-auto rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1">Insumo</th>
                <th className="py-1 text-right">Quedó</th>
                <th className="py-1 text-right">Costo prom. anterior</th>
                <th className="py-1 text-right">Compró</th>
                <th className="py-1 text-right">Costo compra</th>
                <th className="py-1 text-right">Uso interno (tártara)</th>
                {locations.map((l) => (
                  <th key={l.id} className="py-1 text-right">
                    Despachó {l.name}
                  </th>
                ))}
                <th className="py-1 text-right">Conteo físico (opcional)</th>
                <th className="py-1 text-right">Stock objetivo</th>
                <th className="py-1 text-right">Sugerencia compra</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ ingredient: ing, opening, existingWeek, dispatchByLocation, stockTarget, suggestion }) => (
                <tr key={ing.id} className="border-b border-neutral-100">
                  <td className="py-1">
                    <input type="hidden" name="ingredientId" value={ing.id} />
                    <input type="hidden" name={`openingQty_${ing.id}`} value={opening.openingQty} />
                    <input type="hidden" name={`openingAvgCost_${ing.id}`} value={opening.openingAvgCost} />
                    <div className="font-medium">{ing.name}</div>
                    <div className="text-xs text-neutral-400">{ing.unit}</div>
                  </td>
                  <td className="py-1 text-right">{qty(opening.openingQty)}</td>
                  <td className="py-1 text-right">{currency(opening.openingAvgCost)}</td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      name={`purchasedQty_${ing.id}`}
                      defaultValue={existingWeek?.purchasedQty ?? 0}
                      className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      name={`purchaseUnitCost_${ing.id}`}
                      defaultValue={existingWeek?.purchaseUnitCost ?? ""}
                      className="w-24 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      name={`internalUseQty_${ing.id}`}
                      defaultValue={existingWeek?.internalUseQty ?? 0}
                      className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                    />
                  </td>
                  {locations.map((l) => (
                    <td key={l.id} className="py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        name={`dispatch_${ing.id}_${l.id}`}
                        defaultValue={dispatchByLocation.get(l.id) ?? 0}
                        className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                      />
                    </td>
                  ))}
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      name={`physicalCount_${ing.id}`}
                      defaultValue={existingWeek?.closingQtyCounted ?? ""}
                      placeholder={qty(existingWeek?.closingQtyCalc ?? 0)}
                      className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      name={`stockTarget_${ing.id}`}
                      defaultValue={stockTarget?.targetQty ?? ""}
                      className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                    />
                  </td>
                  <td className="py-1 text-right text-neutral-500">{qty(suggestion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="self-start rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Guardar bodega de la semana
        </button>
      </form>
    </div>
  );
}
