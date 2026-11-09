import { describe, expect, test } from "vitest";
import { obtenerBaseApi } from "../../../src/datos/api/base";

describe("obtenerBaseApi", () => {
  test("sin valor usa /api", () => {
    expect(obtenerBaseApi()).toBe("/api");
    expect(obtenerBaseApi(undefined)).toBe("/api");
  });

  test("un texto vacío usa /api", () => {
    expect(obtenerBaseApi("")).toBe("/api");
  });

  test("quita la barra final de la base configurada", () => {
    expect(obtenerBaseApi("/servicio/")).toBe("/servicio");
  });

  test("conserva una base sin barra final", () => {
    expect(obtenerBaseApi("/api")).toBe("/api");
    expect(obtenerBaseApi("/servicio")).toBe("/servicio");
  });

  test("quita barras finales repetidas", () => {
    expect(obtenerBaseApi("/servicio//")).toBe("/servicio");
  });

  test("una base formada solo por barras o espacios usa /api", () => {
    expect(obtenerBaseApi("/")).toBe("/api");
    expect(obtenerBaseApi("   ")).toBe("/api");
  });
});
