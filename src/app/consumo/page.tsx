import { prisma } from "@/lib/prisma";
import { normalizeToWednesday } from "@/lib/dates";
import { getPreviousLocalClosing, getTheoreticalConsumption, addDays } from "@/lib/consumption";
import { saveLocalInventory } from "./actions";

function qty(n: number) {
  return n.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

export default async function ConsumoPage({ searchParams }: PageProps<"/consumo">) {
  const sp = await searchParams;
  const locations = await prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const locationId = (typeof sp.locationId === "string" && sp.locationId) || locations[0]?.id || "";
  const rawDate = (typeof sp.weekStart === "string" && sp.weekStart) || new Date().toISOString().slice(0, 10);
  const weekStartStr = normalizeToWednesday(rawDate);
  const weekStart = new Date(`${weekStartStr}T00:00:00.000Z`);
  const weekEnd = addDays(weekStartStr, 4); // miércoles a domingo
  const guardado = sp.guardado === "1";

  const ingredients = await prisma.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  const [theoretical, dispatches, existingCounts] = await Promise.all([
    getTheoreticalConsumption(locationId, weekStart, weekEnd),
    prisma.warehouseDispatch.findMany({
      where: { locationId, warehouseWeek: { weekStart } },
      include: { warehouseWeek: true },
    }),
    prisma.localInventoryCount.findMany({ where: { locationId, weekStart } }),
  ]);

  const dispatchByIngredient = new Map<string, number>();
  for (const d of dispatches) {
    const key = d.warehouseWeek.ingredientId;
    dispatchByIngredient.set(key, (dispatchByIngredient.get(key) ?? 0) + d.quantity);
  }
  const closingByIngredient = new Map(existingCounts.map((c) => [c.ingredientId, c.closingQty]));

  const rows = await Promise.all(
    ingredients.map(async (ing) => {
      const opening = await getPreviousLocalClosing(locationId, ing.id, weekStart);
      const dispatched = dispatchByIngredient.get(ing.id) ?? 0;
      const closing = closingByIngredient.get(ing.id);
      const real = closing !== undefined ? opening + dispatched - closing : null;
      const teorico = theoretical.get(ing.id) ?? 0;
      return { ingredient: ing, opening, dispatched, closing, real, teorico };
    })
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Consumo: teórico vs. real</h1>
        <p className="text-sm text-neutral-500">
          Teórico = ventas de la semana × receta. Real = lo que quedó la semana pasada + lo que llegó
          de bodega − el conteo físico que hagas este domingo.
        </p>
      </div>

      {guardado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Conteo guardado correctamente.
        </div>
      )}

      <form method="GET" className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Local</label>
          <select name="locationId" defaultValue={locationId} className="rounded border border-neutral-300 px-2 py-1.5 text-sm">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Cualquier día de la semana</label>
          <input type="date" name="weekStart" defaultValue={weekStartStr} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
          Ver semana
        </button>
        <span className="text-sm text-neutral-500">Semana del {weekStartStr}</span>
      </form>

      <form action={saveLocalInventory} className="flex flex-col gap-4">
        <input type="hidden" name="locationId" value={locationId} />
        <input type="hidden" name="weekStart" value={weekStartStr} />
        <div className="overflow-x-auto rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-1">Insumo</th>
                <th className="py-1 text-right">Quedó semana pasada</th>
                <th className="py-1 text-right">Llegó de bodega</th>
                <th className="py-1 text-right">Conteo físico (domingo)</th>
                <th className="py-1 text-right">Consumo real</th>
                <th className="py-1 text-right">Consumo teórico</th>
                <th className="py-1 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ ingredient: ing, opening, dispatched, closing, real, teorico }) => {
                const diff = real !== null ? real - teorico : null;
                const diffAbs = diff !== null ? Math.abs(diff) : 0;
                const diffPct = diff !== null && teorico > 0 ? diffAbs / teorico : 0;
                const flag = diff !== null && diffPct > 0.1;
                return (
                  <tr key={ing.id} className="border-b border-neutral-100">
                    <td className="py-1">
                      <input type="hidden" name="ingredientId" value={ing.id} />
                      <div className="font-medium">{ing.name}</div>
                      <div className="text-xs text-neutral-400">{ing.unit}</div>
                    </td>
                    <td className="py-1 text-right">{qty(opening)}</td>
                    <td className="py-1 text-right">{qty(dispatched)}</td>
                    <td className="py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        name={`closingQty_${ing.id}`}
                        defaultValue={closing ?? ""}
                        className="w-20 rounded border border-neutral-300 px-1 py-1 text-right text-xs"
                      />
                    </td>
                    <td className="py-1 text-right">{real !== null ? qty(real) : "—"}</td>
                    <td className="py-1 text-right">{qty(teorico)}</td>
                    <td className={`py-1 text-right font-medium ${flag ? "text-red-600" : "text-neutral-500"}`}>
                      {diff !== null ? qty(diff) : "—"}
                    </td>
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
          Guardar conteo físico
        </button>
      </form>
    </div>
  );
}
