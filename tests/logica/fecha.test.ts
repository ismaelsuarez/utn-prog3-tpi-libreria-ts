import { describe, expect, test } from "vitest";
import { formatearFecha } from "../../src/logica/fecha";

describe("formatearFecha", () => {
  test("muestra día/mes/año y hora con los componentes locales del instante", () => {
    const iso = new Date(2026, 9, 16, 14, 30).toISOString();
    expect(formatearFecha(iso)).toBe("16/10/2026 14:30");
  });

  test("completa con ceros el día, el mes, la hora y los minutos", () => {
    const iso = new Date(2026, 0, 6, 1, 7).toISOString();
    expect(formatearFecha(iso)).toBe("06/01/2026 01:07");
  });

  test("una fecha que no se puede interpretar se informa sin lanzar", () => {
    expect(formatearFecha("no es una fecha")).toBe("Fecha no válida");
    expect(formatearFecha("")).toBe("Fecha no válida");
  });

  test("no modifica ni reinterpreta el texto recibido", () => {
    const iso = "2026-10-16T23:45:00.000Z";
    formatearFecha(iso);
    expect(iso).toBe("2026-10-16T23:45:00.000Z");
  });
});
