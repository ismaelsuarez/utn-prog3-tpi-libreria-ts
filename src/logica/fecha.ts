import type { FechaIso } from "../types/primitivos";

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}

/**
 * La fecha guardada representa un instante; sus componentes locales se usan solo
 * para presentación (`16/10/2026 14:30`), sin escribir ni reinterpretar el ISO
 * almacenado.
 */
export function formatearFecha(iso: FechaIso): string {
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) return "Fecha no válida";
  return (
    `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/` +
    `${String(fecha.getFullYear()).padStart(4, "0")} ` +
    `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`
  );
}
