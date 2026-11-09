import { describe, expect, test } from "vitest";
import {
  normalizarEmail,
  normalizarIsbn,
  normalizarTexto,
} from "../../src/logica/texto";

describe("normalizarTexto", () => {
  test("recorta los extremos y pasa a minúsculas", () => {
    expect(normalizarTexto("  El FARO ")).toBe("el faro");
    expect(normalizarTexto("CARTAS")).toBe("cartas");
    expect(normalizarTexto("sin-espacios")).toBe("sin-espacios");
  });

  test("con texto vacío o solo espacios devuelve vacío", () => {
    expect(normalizarTexto("")).toBe("");
    expect(normalizarTexto("   ")).toBe("");
  });
});

describe("normalizarIsbn", () => {
  test("quita espacios y guiones", () => {
    expect(normalizarIsbn(" 978-987-000-001-1 ")).toBe("9789870000011");
    expect(normalizarIsbn("978 987 000 002 8")).toBe("9789870000028");
    expect(normalizarIsbn("9789870000035")).toBe("9789870000035");
  });

  test("dos ISBN equivalentes con distinto formato normalizan igual", () => {
    expect(normalizarIsbn("978-987-000-001-1")).toBe(
      normalizarIsbn("978 987 000 001 1"),
    );
  });
});

describe("normalizarEmail", () => {
  test("recorta y pasa a minúsculas", () => {
    expect(normalizarEmail("  Laura.Mendoza@Correo.Test ")).toBe(
      "laura.mendoza@correo.test",
    );
    expect(normalizarEmail("nina.podesta@correo.test")).toBe(
      "nina.podesta@correo.test",
    );
  });
});
