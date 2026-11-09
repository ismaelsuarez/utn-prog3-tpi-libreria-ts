import { describe, expect, test } from "vitest";
import { validarLibro, type BorradorLibro } from "../../src/logica/libros";
import type { Libro } from "../../src/types/libro";
import {
  autoresDeEjemplo,
  editorialesDeEjemplo,
  generosDeEjemplo,
  librosDeEjemplo,
} from "../fixtures/libros-de-ejemplo";

const catalogos = {
  editoriales: editorialesDeEjemplo,
  generos: generosDeEjemplo,
  autores: autoresDeEjemplo,
};

/** Registro completo y válido: ninguno de sus datos coincide con los ejemplos. */
function datosValidos(): BorradorLibro {
  return {
    titulo: "El taller de las traducciones",
    isbn: "978-987-000-099-9",
    precio: 1490,
    editorial_id: 2,
    genero_id: 2,
    autores: [
      { autor_id: 2, rol: "autor", orden: 1 },
      { autor_id: 3, rol: "autor", orden: 2 },
    ],
  };
}

function validar(registro: BorradorLibro, guardados: readonly Libro[] = librosDeEjemplo) {
  return validarLibro(registro, guardados, catalogos);
}

/**
 * Exige UN SOLO error, en el campo esperado y con la forma {campo, mensaje}: así
 * cada rechazo queda aislado (un error por campo) y sin colaterales.
 */
function unicoError(registro: BorradorLibro, campo: string, guardados?: readonly Libro[]) {
  const errores = validar(registro, guardados);
  expect(errores, JSON.stringify(errores)).toHaveLength(1);
  const [error] = errores;
  expect(error?.campo).toBe(campo);
  expect(Object.keys(error ?? {}).sort()).toEqual(["campo", "mensaje"]);
  expect(error?.mensaje.trim()).not.toBe("");
  return error;
}

describe("validarLibro: título", () => {
  test("rechaza el título vacío", () => {
    const e = unicoError({ ...datosValidos(), titulo: "" }, "titulo");
    expect(e?.mensaje).toBe("El título es obligatorio.");
  });

  test("rechaza el título formado solo por espacios", () => {
    unicoError({ ...datosValidos(), titulo: "     " }, "titulo");
  });
});

describe("validarLibro: ISBN", () => {
  test("rechaza el ISBN vacío", () => {
    const e = unicoError({ ...datosValidos(), isbn: "" }, "isbn");
    expect(e?.mensaje).toBe("El ISBN es obligatorio.");
  });

  test("rechaza un ISBN existente escrito con separadores distintos", () => {
    // Mismo ISBN que el ejemplo 1 (978-987-000-001-1), solo con espacios.
    const e = unicoError({ ...datosValidos(), isbn: "978 987 000 001 1" }, "isbn");
    expect(e?.mensaje).toBe("Ese ISBN ya está registrado.");
  });

  test("rechaza el ISBN formado solo por separadores", () => {
    unicoError({ ...datosValidos(), isbn: "   -  - " }, "isbn");
  });

  test("rechaza un ISBN existente con el mismo formato que el guardado", () => {
    unicoError({ ...datosValidos(), isbn: "978-987-000-003-5" }, "isbn");
  });

  test("detecta el duplicado aunque el ISBN guardado tenga espacios y el nuevo guiones", () => {
    const guardado: Libro = {
      ...(librosDeEjemplo[0] as Libro),
      id: 88,
      isbn: "978 987 000 005 9",
    };
    unicoError({ ...datosValidos(), isbn: "978-987-000-005-9" }, "isbn", [guardado]);
  });
});

describe("validarLibro: precio", () => {
  test("rechaza un precio no numérico", () => {
    const e = unicoError({ ...datosValidos(), precio: "mil quinientos" }, "precio");
    expect(e?.mensaje).toBe("El precio debe ser un valor numérico.");
  });

  test("rechaza un precio igual a cero", () => {
    const e = unicoError({ ...datosValidos(), precio: 0 }, "precio");
    expect(e?.mensaje).toBe("El precio debe ser mayor que cero.");
  });

  test("rechaza un precio negativo", () => {
    unicoError({ ...datosValidos(), precio: -250 }, "precio");
  });

  test("rechaza un precio vacío y uno con coma decimal", () => {
    unicoError({ ...datosValidos(), precio: "" }, "precio");
    unicoError({ ...datosValidos(), precio: "14,90" }, "precio");
  });

  test("acepta un precio escrito como texto decimal", () => {
    expect(validar({ ...datosValidos(), precio: "1490.50" })).toEqual([]);
  });
});

describe("validarLibro: editorial", () => {
  test("rechaza la editorial vacía", () => {
    const e = unicoError({ ...datosValidos(), editorial_id: null }, "editorial");
    expect(e?.mensaje).toBe("Debes elegir una editorial.");
  });

  test("rechaza una editorial desconocida", () => {
    const e = unicoError({ ...datosValidos(), editorial_id: 99 }, "editorial");
    expect(e?.mensaje).toBe("La editorial elegida no existe en los datos.");
  });

  test("rechaza una editorial que no es un número (texto vacío convertido en la vista)", () => {
    unicoError({ ...datosValidos(), editorial_id: Number.NaN }, "editorial");
  });
});

describe("validarLibro: autores", () => {
  test("rechaza un libro sin autores seleccionados", () => {
    const e = unicoError({ ...datosValidos(), autores: [] }, "autores");
    expect(e?.mensaje).toBe("Debes seleccionar al menos un autor.");
  });

  test("rechaza un autor desconocido sin señalar también los autores válidos", () => {
    const e = unicoError(
      {
        ...datosValidos(),
        autores: [
          { autor_id: 1, rol: "autor", orden: 1 },
          { autor_id: 99, rol: "autor", orden: 2 },
        ],
      },
      "autores",
    );
    expect(e?.mensaje).toBe("Hay autores que no existen en los datos.");
  });

  test("rechaza un libro cuya lista de autores no viene en el registro", () => {
    const { autores: _omitido, ...sinAutores } = datosValidos();
    unicoError(sinAutores, "autores");
  });
});

describe("validarLibro: género", () => {
  test("rechaza un género desconocido", () => {
    const e = unicoError({ ...datosValidos(), genero_id: 99 }, "genero");
    expect(e?.mensaje).toBe("El género elegido no existe en los datos.");
  });

  test("el género es opcional: null y ausente no producen errores", () => {
    expect(validar({ ...datosValidos(), genero_id: null })).toEqual([]);
    const { genero_id: _omitido, ...sinGenero } = datosValidos();
    expect(validar(sinGenero)).toEqual([]);
  });
});

describe("validarLibro: conjunto", () => {
  test("un libro válido no produce ningún error ni altera sus datos", () => {
    const registro = datosValidos();
    const antes = structuredClone(registro);
    expect(validar(registro)).toEqual([]);
    expect(registro).toEqual(antes);
  });

  test("acumula un error por cada campo rechazado sin registrar nada", () => {
    const errores = validar({ ...datosValidos(), titulo: "", precio: 0 });
    expect(errores, JSON.stringify(errores)).toHaveLength(2);
    expect(errores.map((error) => error.campo).sort()).toEqual(["precio", "titulo"]);
  });
});
