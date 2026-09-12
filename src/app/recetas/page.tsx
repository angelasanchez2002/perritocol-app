import { prisma } from "@/lib/prisma";
import { saveRecipe } from "./actions";

export default async function RecetasPage({ searchParams }: PageProps<"/recetas">) {
  const sp = await searchParams;
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const productId = (typeof sp.productId === "string" && sp.productId) || products[0]?.id;
  const guardado = sp.guardado === "1";

  const [ingredients, recipeLines] = await Promise.all([
    prisma.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.recipe.findMany({ where: { productId } }),
  ]);
  const qtyByIngredient = new Map(recipeLines.map((r) => [r.ingredientId, r.quantityPerUnit]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Recetas (gramaje por producto)</h1>
        <p className="text-sm text-neutral-500">
          Define cuánto de cada insumo lleva una unidad vendida, para comparar después el consumo
          teórico contra el inventario real.
        </p>
      </div>

      {guardado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
          Receta guardada correctamente.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {products.map((p) => (
          <a
            key={p.id}
            href={`/recetas?productId=${p.id}`}
            className={`rounded-full px-3 py-1 text-sm ${
              p.id === productId ? "bg-orange-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"
            }`}
          >
            {p.name}
          </a>
        ))}
      </div>

      {productId && (
        <form action={saveRecipe} className="rounded-lg bg-white p-4 ring-1 ring-neutral-200">
          <input type="hidden" name="productId" value={productId} />
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            {products.find((p) => p.id === productId)?.name}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ingredients.map((ing) => (
              <label key={ing.id} className="flex items-center justify-between gap-2 text-sm">
                <input type="hidden" name="ingredientId" value={ing.id} />
                <span>
                  {ing.name} <span className="text-neutral-400">({ing.unit})</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  name={`qty_${ing.id}`}
                  defaultValue={qtyByIngredient.get(ing.id) ?? 0}
                  className="w-24 rounded border border-neutral-300 px-2 py-1 text-right text-sm"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="mt-4 rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
          >
            Guardar receta
          </button>
        </form>
      )}
    </div>
  );
}
