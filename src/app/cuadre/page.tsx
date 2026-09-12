import { prisma } from "@/lib/prisma";
import { getActiveProductsWithPriceAt } from "@/lib/pricing";
import { saveDailyClosing } from "./actions";
import type { CajaTipo } from "@/generated/prisma/client";

const CAJA_LABELS: Record<CajaTipo, string> = {
  PRINCIPAL: "Caja principal",
  WHATSAPP: "Caja WhatsApp",
};

const CATEGORY_LABELS: Record<string, string> = {
  PERRO: "Perritos",
  AMERICANO: "Americanos",
  SALCHIPAPA: "Salchipapas",
  BEBIDA: "Bebidas",
  ADICIONAL: "Adicionales",
  EMPAQUE: "Empaque",
  OTRO: "Otros",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currency(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default async function CuadrePage({
  searchParams,
}: PageProps<"/cuadre">) {
  const sp = await searchParams;
  const locations = await prisma.location.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const locationId =
    (typeof sp.locationId === "string" && sp.locationId) || locations[0]?.id || "";
  const dateStr = (typeof sp.date === "string" && sp.date) || todayStr();
  const cajaTipo: CajaTipo =
    (typeof sp.cajaTipo === "string" && sp.cajaTipo === "WHATSAPP") ? "WHATSAPP" : "PRINCIPAL";
  const guardado = sp.guardado === "1";

  const date = new Date(`${dateStr}T00:00:00.000Z`);

  const [products, existingSales, transfers, closing, gastosVarios, cena] = await Promise.all([
    getActiveProductsWithPriceAt(date),
    prisma.dailySale.findMany({ where: { locationId, date, cajaTipo } }),
    prisma.bankTransfer.findMany({ where: { locationId, date, cajaTipo } }),
    prisma.cashClosing.findUnique({
      where: { locationId_date_cajaTipo: { locationId, date, cajaTipo } },
    }),
    prisma.expense.findFirst({
      where: { locationId, date, scope: "LOCAL", category: "GASTOS VARIOS" },
    }),
    prisma.expense.findFirst({
      where: { locationId, date, scope: "LOCAL", category: "CENA EMPLEADOS" },
    }),
  ]);

  const qtyByProduct = new Map(existingSales.map((s) => [s.productId, s.quantity]));
  const totalVentas = existingSales.reduce((sum, s) => sum + s.amount, 0);
  const totalTransferencias = transfers.reduce((sum, t) => sum + t.amount, 0);
  const gastosVariosMonto = gastosVarios?.amount ?? 0;
  const cenaMonto = cena?.amount ?? 0;
  const efectivoEsperado =
    totalVentas - totalTransferencias - (cajaTipo === "PRINCIPAL" ? gastosVariosMonto + cenaMonto : 0);

  const productsByCategory = products.reduce<Record<string, typeof products>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Cuadre diario</h1>
        <p className="text-sm text-neutral-500">
          Registra las ventas del día y cuadra el efectivo por caja.
        </p>
      </div>

      {guardado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Cuadre guardado correctamente.
        </div>
      )}

      <form method="GET" className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 ring-1 ring-neutral-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Local</label>
          <select name="locationId" defaultValue={locationId} className="rounded border border-neutral-300 px-2 py-1.5 text-sm">
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Fecha</label>
          <input type="date" name="date" defaultValue={dateStr} className="rounded border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Caja</label>
          <select name="cajaTipo" defaultValue={cajaTipo} className="rounded border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="PRINCIPAL">Caja principal</option>
            <option value="WHATSAPP">Caja WhatsApp</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
          Ver / cambiar
        </button>
      </form>

      <form action={saveDailyClosing} className="flex flex-col gap-6">
        <input type="hidden" name="locationId" value={locationId} />
        <input type="hidden" name="date" value={dateStr} />
        <input type="hidden" name="cajaTipo" value={cajaTipo} />

        <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            {CAJA_LABELS[cajaTipo]} — {locations.find((l) => l.id === locationId)?.name}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {Object.entries(productsByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-400">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <div className="flex flex-col gap-1">
                  {items.map((p) => (
                    <label key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>
                        {p.name}{" "}
                        <span className="text-neutral-400">({currency(p.price)})</span>
                      </span>
                      <input
                        type="number"
                        min={0}
                        name={`qty_${p.id}`}
                        defaultValue={qtyByProduct.get(p.id) ?? 0}
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">Transferencias y efectivo</h2>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                Total transferencias del día (banco, Nequi, QR)
                <input
                  type="number"
                  min={0}
                  name="transferencias"
                  defaultValue={totalTransferencias}
                  className="rounded border border-neutral-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Efectivo contado (lo que entregó la cajera)
                <input
                  type="number"
                  min={0}
                  name="efectivoContado"
                  defaultValue={closing?.countedCash ?? 0}
                  className="rounded border border-neutral-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Nota del descuadre (opcional)
                <textarea
                  name="nota"
                  defaultValue={closing?.note ?? ""}
                  rows={2}
                  className="rounded border border-neutral-300 px-2 py-1.5"
                />
              </label>
            </div>
          </div>

          {cajaTipo === "PRINCIPAL" && (
            <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">Gastos del local (hoy)</h2>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Gastos varios (cuaderno, herramientas, vales, etc.)
                  <input
                    type="number"
                    min={0}
                    name="gastosVarios"
                    defaultValue={gastosVariosMonto}
                    className="rounded border border-neutral-300 px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Cena de empleados
                  <input
                    type="number"
                    min={0}
                    name="cena"
                    defaultValue={cenaMonto}
                    className="rounded border border-neutral-300 px-2 py-1.5"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">Resumen (con lo guardado hasta ahora)</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-4">
            <dt className="text-neutral-500">Total ventas</dt>
            <dd className="text-right font-medium sm:text-left">{currency(totalVentas)}</dd>
            <dt className="text-neutral-500">Transferencias</dt>
            <dd className="text-right font-medium sm:text-left">{currency(totalTransferencias)}</dd>
            {cajaTipo === "PRINCIPAL" && (
              <>
                <dt className="text-neutral-500">Gastos + cena</dt>
                <dd className="text-right font-medium sm:text-left">
                  {currency(gastosVariosMonto + cenaMonto)}
                </dd>
              </>
            )}
            <dt className="text-neutral-500">Efectivo esperado</dt>
            <dd className="text-right font-medium sm:text-left">{currency(efectivoEsperado)}</dd>
          </dl>
          {closing && (
            <p
              className={`mt-3 text-sm font-medium ${
                closing.difference === 0
                  ? "text-neutral-600"
                  : closing.difference > 0
                    ? "text-green-600"
                    : "text-red-600"
              }`}
            >
              Última diferencia guardada: {currency(closing.difference)}{" "}
              {closing.difference === 0 ? "(cuadrado)" : closing.difference > 0 ? "(sobró)" : "(faltó)"}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="self-start rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
        >
          Guardar cuadre del día
        </button>
      </form>
    </div>
  );
}
