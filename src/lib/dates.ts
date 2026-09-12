/** Normaliza cualquier fecha al miércoles de esa semana operativa (miércoles a domingo). */
export function normalizeToWednesday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const dow = d.getUTCDay(); // 0=domingo ... 6=sábado
  const daysSinceWednesday = (dow - 3 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceWednesday);
  return d.toISOString().slice(0, 10);
}
