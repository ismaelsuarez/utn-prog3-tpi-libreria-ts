import { describe, expect, test } from "vitest";
import {
  FORMATO_EMAIL,
  conPuntoFinal,
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

describe("FORMATO_EMAIL", () => {
  test.each(["ana@correo.test", "a@b.c", "nombre.apellido@dominio.com.ar"])(
    "acepta %s",
    (email) => {
      expect(FORMATO_EMAIL.test(email)).toBe(true);
    },
  );

  test.each(["", "ana", "ana@", "@correo.test", "ana@correo", "ana @correo.test", "a@@b.c"])(
    "rechaza %j",
    (email) => {
      expect(FORMATO_EMAIL.test(email)).toBe(false);
    },
  );
});

describe("conPuntoFinal", () => {
  test("agrega el punto a un mensaje del servidor que no lo trae", () => {
    expect(conPuntoFinal("El cliente ya tiene un perfil")).toBe("El cliente ya tiene un perfil.");
  });

  test("no duplica un punto, ni cambia otra puntuación final", () => {
    expect(conPuntoFinal("No se pudo conectar con el servidor.")).toBe("No se pudo conectar con el servidor.");
    expect(conPuntoFinal("¿Seguro?")).toBe("¿Seguro?");
    expect(conPuntoFinal("Listo!")).toBe("Listo!");
  });

  test("recorta los espacios de los extremos y deja vacío el texto vacío", () => {
    expect(conPuntoFinal("  Error de datos  ")).toBe("Error de datos.");
    expect(conPuntoFinal("   ")).toBe("");
  });
});
