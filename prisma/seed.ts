import { ProductCategory } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const LOCATIONS = ["Torcoroma", "Avenida Libertadores", "Chapinero"];

const PRODUCTS: {
  name: string;
  category: ProductCategory;
  sausageCount: number | null;
  price: number;
}[] = [
  { name: "Perrito 2 Salchichas", category: "PERRO", sausageCount: 2, price: 7500 },
  { name: "Perrito 3 Salchichas", category: "PERRO", sausageCount: 3, price: 8000 },
  { name: "Perrito 4 Salchichas", category: "PERRO", sausageCount: 4, price: 8500 },
  { name: "Perrito 5 Salchichas", category: "PERRO", sausageCount: 5, price: 9000 },
  { name: "Perrito 6 Salchichas", category: "PERRO", sausageCount: 6, price: 9500 },
  { name: "Americano 1 Salchicha", category: "AMERICANO", sausageCount: 1, price: 10000 },
  { name: "Americano 2 Salchichas", category: "AMERICANO", sausageCount: 2, price: 12000 },
  { name: "Gaseosa 1.5L", category: "BEBIDA", sausageCount: null, price: 8000 },
  { name: "Gaseosa PET 400", category: "BEBIDA", sausageCount: null, price: 4000 },
  { name: "Agua", category: "BEBIDA", sausageCount: null, price: 2000 },
  { name: "Porción Huevos de Codorniz", category: "ADICIONAL", sausageCount: null, price: 3000 },
  { name: "Tártara Grande", category: "ADICIONAL", sausageCount: null, price: 1500 },
  { name: "Tártara Pequeña", category: "ADICIONAL", sausageCount: null, price: 1000 },
  { name: "Empaque Adicional", category: "EMPAQUE", sausageCount: null, price: 1000 },
];

const INGREDIENTS: { name: string; unit: string }[] = [
  { name: "PAN", unit: "unidad" },
  { name: "SALCHICHA", unit: "unidad" },
  { name: "SALCHICHA AMERICANA", unit: "unidad" },
  { name: "QUESO", unit: "libra" },
  { name: "HUEVOS DE CODORNIZ", unit: "unidad" },
  { name: "CEBOLLA", unit: "libra" },
  { name: "PAPA CLARA", unit: "libra" },
  { name: "PAPA OSCURA", unit: "libra" },
  { name: "PIÑA", unit: "unidad" },
  { name: "TOMATE", unit: "unidad" },
  { name: "PAPRIKA", unit: "libra" },
  { name: "MOSTAZA", unit: "galón" },
  { name: "MOSTAZA OCA", unit: "galón" },
  { name: "TARTARA", unit: "galón" },
  { name: "MAYONESA OCA", unit: "galón" },
  { name: "LECHE", unit: "litro" },
  { name: "NATUCAMPO INST", unit: "unidad" },
];

async function main() {
  for (const name of LOCATIONS) {
    await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const effectiveFrom = new Date("2026-01-01T00:00:00Z");
  for (const p of PRODUCTS) {
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          category: p.category,
          sausageCount: p.sausageCount ?? undefined,
        },
      });
    }

    const existingPrice = await prisma.productPrice.findFirst({
      where: { productId: product.id },
      orderBy: { effectiveFrom: "desc" },
    });
    if (!existingPrice || existingPrice.price !== p.price) {
      await prisma.productPrice.create({
        data: { productId: product.id, price: p.price, effectiveFrom },
      });
    }
  }

  for (const ing of INGREDIENTS) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {},
      create: { name: ing.name, unit: ing.unit },
    });
  }

  console.log("Seed listo: locales, productos con precios e insumos base.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
