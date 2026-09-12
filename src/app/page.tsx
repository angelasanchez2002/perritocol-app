import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cuadre administrativo — Perrito Col</h1>
      <p className="text-sm text-neutral-600">
        Módulo inicial: registro diario de ventas y cuadre de caja por local.
      </p>
      <Link
        href="/cuadre"
        className="self-start rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500"
      >
        Ir al cuadre diario →
      </Link>
    </div>
  );
}
