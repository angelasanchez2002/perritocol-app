"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { EmployeeGroup } from "@/generated/prisma/client";

export async function createEmployee(formData: FormData) {
  const name = String(formData.get("name")).trim();
  const group = String(formData.get("group")) as EmployeeGroup;
  const role = String(formData.get("role")).trim();
  const locationId = group === "LOCAL" ? String(formData.get("locationId")) : null;
  const payPerShift = Number(formData.get("payPerShift"));

  if (!name || !role || !Number.isFinite(payPerShift) || payPerShift <= 0) {
    throw new Error("Nombre, rol y pago por turno son obligatorios.");
  }

  await prisma.employee.create({
    data: { name, group, role, locationId, payPerShift },
  });

  revalidatePath("/empleados");
  revalidatePath("/nomina");
}

export async function toggleEmployeeActive(formData: FormData) {
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await prisma.employee.update({ where: { id }, data: { active: !active } });
  revalidatePath("/empleados");
  revalidatePath("/nomina");
}

export async function createLoan(formData: FormData) {
  const employeeId = String(formData.get("employeeId"));
  const dateStr = String(formData.get("date"));
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!employeeId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Empleado y monto del préstamo son obligatorios.");
  }

  await prisma.loan.create({
    data: { employeeId, date: new Date(`${dateStr}T00:00:00.000Z`), amount, note },
  });

  revalidatePath("/empleados");
  revalidatePath("/nomina");
}
