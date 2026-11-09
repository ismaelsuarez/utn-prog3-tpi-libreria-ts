import { describe, expect, test } from "vitest";
import { esRolDeAutoria, libroNuevoDesdeBorrador, validarLibro, type BorradorLibro } from "../../src/logica/libros";
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
    stock: 5,
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

// Reglas nuevas de `operaciones-contra-api`: la API exige `stock` y no valida las
// longitudes ni la precisión, de modo que un exceso fallaría en el servidor.
describe("validarLibro: stock", () => {
  test.each([[""], ["   "], ["-1"], ["2,5"], ["2.5"], ["abc"], ["1e3"], [-1], [2.5], [Number.NaN]])(
    "rechaza el stock %j y lo señala",
    (stock) => {
      unicoError({ ...datosValidos(), stock }, "stock");
    },
  );

  test("el stock vacío informa que es obligatorio", () => {
    expect(unicoError({ ...datosValidos(), stock: "" }, "stock")?.mensaje).toBe("El stock es obligatorio.");
  });

  test("el stock no entero o negativo informa que debe ser un entero desde cero", () => {
    expect(unicoError({ ...datosValidos(), stock: "-1" }, "stock")?.mensaje).toBe(
      "El stock debe ser un número entero mayor o igual que cero.",
    );
    expect(unicoError({ ...datosValidos(), stock: "abc" }, "stock")?.mensaje).toBe(
      "El stock debe ser un número entero mayor o igual que cero.",
    );
  });

  test("el stock cero es válido, como texto y como número", () => {
    expect(validar({ ...datosValidos(), stock: "0" })).toEqual([]);
    expect(validar({ ...datosValidos(), stock: 0 })).toEqual([]);
  });

  test("acepta el máximo 2 147 483 647 y rechaza el siguiente", () => {
    expect(validar({ ...datosValidos(), stock: "2147483647" })).toEqual([]);
    expect(validar({ ...datosValidos(), stock: 2147483647 })).toEqual([]);
    const e = unicoError({ ...datosValidos(), stock: "2147483648" }, "stock");
    expect(e?.mensaje).toBe("El stock no puede superar 2 147 483 647.");
    unicoError({ ...datosValidos(), stock: 2147483648 }, "stock");
  });

  test("un entero escrito con ceros a la izquierda o espacios es válido", () => {
    expect(validar({ ...datosValidos(), stock: " 007 " })).toEqual([]);
  });
});

describe("validarLibro: longitudes que la API no valida", () => {
  test("acepta un título de 200 caracteres y rechaza uno de 201", () => {
    expect(validar({ ...datosValidos(), titulo: "t".repeat(200) })).toEqual([]);
    const e = unicoError({ ...datosValidos(), titulo: "t".repeat(201) }, "titulo");
    expect(e?.mensaje).toBe("El título no puede superar los 200 caracteres.");
  });

  test("acepta un ISBN de 20 caracteres y rechaza uno de 21", () => {
    expect(validar({ ...datosValidos(), isbn: "9".repeat(20) })).toEqual([]);
    const e = unicoError({ ...datosValidos(), isbn: "9".repeat(21) }, "isbn");
    expect(e?.mensaje).toBe("El ISBN no puede superar los 20 caracteres.");
  });

  test("los espacios de los extremos no cuentan para la longitud", () => {
    expect(validar({ ...datosValidos(), titulo: ` ${"t".repeat(200)} `, isbn: ` ${"9".repeat(20)} ` })).toEqual([]);
  });

  test("un título vacío sigue informando que es obligatorio y no el límite", () => {
    expect(unicoError({ ...datosValidos(), titulo: "" }, "titulo")?.mensaje).toBe("El título es obligatorio.");
  });
});

describe("validarLibro: precio máximo", () => {
  test("acepta 99 999 999,99 y rechaza lo que lo supera", () => {
    expect(validar({ ...datosValidos(), precio: 99999999.99 })).toEqual([]);
    expect(validar({ ...datosValidos(), precio: "99999999.99" })).toEqual([]);
    const e = unicoError({ ...datosValidos(), precio: "100000000" }, "precio");
    expect(e?.mensaje).toBe("El precio no puede superar 99 999 999,99.");
    unicoError({ ...datosValidos(), precio: 100000000.5 }, "precio");
  });

  test("se compara el precio ya redondeado al centavo, que es el que se envía", () => {
    unicoError({ ...datosValidos(), precio: "99999999.995" }, "precio");
    expect(validar({ ...datosValidos(), precio: "99999999.994" })).toEqual([]);
  });

  test("un precio con más de dos decimales dentro del límite es válido", () => {
    expect(validar({ ...datosValidos(), precio: "1500.125" })).toEqual([]);
  });
});

describe("validarLibro: rol de autoría", () => {
  test.each(["autor", "coautor", "traductor", "ilustrador"])("acepta el rol %s", (rol) => {
    expect(validar({ ...datosValidos(), autores: [{ autor_id: 1, rol, orden: 1 }] })).toEqual([]);
  });

  test("rechaza un rol fuera de los cuatro y lo señala en autores", () => {
    const e = unicoError({ ...datosValidos(), autores: [{ autor_id: 1, rol: "editor", orden: 1 }] }, "autores");
    expect(e?.mensaje).toBe("Hay autores con un rol que no es válido.");
    unicoError({ ...datosValidos(), autores: [{ autor_id: 1, rol: "", orden: 1 }] }, "autores");
  });

  test("autor desconocido y rol inválido a la vez producen un solo error de autores", () => {
    const errores = validar({
      ...datosValidos(),
      autores: [
        { autor_id: 99, rol: "editor", orden: 1 },
      ],
    });
    expect(errores.filter((error) => error.campo === "autores")).toHaveLength(1);
  });

  test("esRolDeAutoria reconoce solo los cuatro roles de la API", () => {
    expect(esRolDeAutoria("traductor")).toBe(true);
    expect(esRolDeAutoria("Autor")).toBe(false);
    expect(esRolDeAutoria("")).toBe(false);
  });
});

describe("libroNuevoDesdeBorrador: cuerpo del alta", () => {
  test("arma el libro con stock numérico, textos recortados y autores con rol y orden", () => {
    const libro = libroNuevoDesdeBorrador({
      titulo: "  El taller  ",
      isbn: " 978-987-000-099-9 ",
      precio: "1490",
      stock: " 12 ",
      editorial_id: 2,
      genero_id: 3,
      autores: [
        { autor_id: 2, rol: "autor", orden: 1 },
        { autor_id: 3, rol: "traductor", orden: 2 },
      ],
    });
    expect(libro).toEqual({
      titulo: "El taller",
      isbn: "978-987-000-099-9",
      precio: 1490,
      stock: 12,
      editorial_id: 2,
      genero_id: 3,
      autores: [
        { autor_id: 2, rol: "autor", orden: 1 },
        { autor_id: 3, rol: "traductor", orden: 2 },
      ],
    });
  });

  test("el stock cero es válido y se envía como 0", () => {
    expect(libroNuevoDesdeBorrador({ ...datosValidos(), stock: "0" })?.stock).toBe(0);
  });

  test("sin género asignado envía null", () => {
    expect(libroNuevoDesdeBorrador({ ...datosValidos(), genero_id: null })?.genero_id).toBeNull();
    const { genero_id: _omitido, ...sinGenero } = datosValidos();
    expect(libroNuevoDesdeBorrador(sinGenero)?.genero_id).toBeNull();
  });

  test("el precio con más de dos decimales conserva el valor escrito: el redondeo al centavo es del adaptador", () => {
    expect(libroNuevoDesdeBorrador({ ...datosValidos(), precio: "1500.125" })?.precio).toBe(1500.125);
  });

  test("sin editorial o con un rol que la API no admite no hay libro que enviar", () => {
    expect(libroNuevoDesdeBorrador({ ...datosValidos(), editorial_id: null })).toBeNull();
    expect(
      libroNuevoDesdeBorrador({ ...datosValidos(), autores: [{ autor_id: 1, rol: "editor", orden: 1 }] }),
    ).toBeNull();
  });
});
