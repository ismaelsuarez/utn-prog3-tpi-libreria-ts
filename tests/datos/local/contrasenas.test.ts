import { describe, expect, test } from "vitest";
import {
  ITERACIONES_POR_DEFECTO,
  protegerContrasena,
  verificarContrasena,
} from "../../../src/datos/local/contrasenas";
import { ErrorDeCriptografia } from "../../../src/datos/errores";

// Pocas iteraciones: estas pruebas no miden el costo del algoritmo.
const RAPIDO = { iteraciones: 1000 };

describe("protegerContrasena", () => {
  test("devuelve el algoritmo, las iteraciones de la política y valores hexadecimales", async () => {
    const guardada = await protegerContrasena("Faro-2026");
    expect(guardada.algoritmo).toBe("PBKDF2-SHA-256");
    expect(guardada.iteraciones).toBe(100000);
    expect(ITERACIONES_POR_DEFECTO).toBe(100000);
    expect(guardada.sal).toMatch(/^[0-9a-f]{32}$/);
    expect(guardada.huella).toMatch(/^[0-9a-f]{64}$/);
  });

  test("el resultado serializado no contiene la contraseña", async () => {
    const guardada = await protegerContrasena("Faro-2026", RAPIDO);
    expect(JSON.stringify(guardada)).not.toContain("Faro-2026");
  });

  test("dos llamadas con la misma contraseña dan sal y huella distintas", async () => {
    const primera = await protegerContrasena("Faro-2026", RAPIDO);
    const segunda = await protegerContrasena("Faro-2026", RAPIDO);
    expect(primera.sal).not.toBe(segunda.sal);
    expect(primera.huella).not.toBe(segunda.huella);
  });

  test("las iteraciones indicadas quedan guardadas", async () => {
    const guardada = await protegerContrasena("Faro-2026", RAPIDO);
    expect(guardada.iteraciones).toBe(1000);
  });

  test("admite contraseñas con espacios, acentos y símbolos", async () => {
    const guardada = await protegerContrasena("  Contraseña ñandú 🔒  ", RAPIDO);
    expect(await verificarContrasena("  Contraseña ñandú 🔒  ", guardada)).toBe(true);
    expect(await verificarContrasena("Contraseña ñandú 🔒", guardada)).toBe(false);
  });
});

describe("verificarContrasena", () => {
  test("acepta la correcta y rechaza otra", async () => {
    const guardada = await protegerContrasena("Faro-2026", RAPIDO);
    expect(await verificarContrasena("Faro-2026", guardada)).toBe(true);
    expect(await verificarContrasena("Faro-2027", guardada)).toBe(false);
    expect(await verificarContrasena("faro-2026", guardada)).toBe(false);
    expect(await verificarContrasena("", guardada)).toBe(false);
  });

  test("usa los parámetros guardados, no los de política", async () => {
    const guardada = await protegerContrasena("Faro-2026", { iteraciones: 500 });
    expect(await verificarContrasena("Faro-2026", guardada)).toBe(true);
    expect(await verificarContrasena("Faro-2026", { ...guardada, iteraciones: 501 })).toBe(false);
  });

  test("una sal o una huella alteradas no verifican", async () => {
    const guardada = await protegerContrasena("Faro-2026", RAPIDO);
    expect(await verificarContrasena("Faro-2026", { ...guardada, sal: "00".repeat(16) })).toBe(false);
    expect(await verificarContrasena("Faro-2026", { ...guardada, huella: "00".repeat(32) })).toBe(false);
    expect(await verificarContrasena("Faro-2026", { ...guardada, huella: "00" })).toBe(false);
  });
});

describe("Crypto no disponible", () => {
  test("proteger con un Crypto sin subtle lanza un error con mensaje en texto", async () => {
    const sinSubtle = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) };
    const error: unknown = await protegerContrasena("Faro-2026", { crypto: sinSubtle }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ErrorDeCriptografia);
    expect((error as Error).message).toMatch(/localhost o HTTPS/);
  });

  test("verificar con un Crypto sin subtle lanza el mismo error", async () => {
    const guardada = await protegerContrasena("Faro-2026", RAPIDO);
    await expect(verificarContrasena("Faro-2026", guardada, { crypto: {} })).rejects.toBeInstanceOf(
      ErrorDeCriptografia,
    );
  });
});
