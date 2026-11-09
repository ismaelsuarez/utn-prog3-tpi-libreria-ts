import { describe, expect, test } from "vitest";
import {
  CAMPOS_DE_LIBRO,
  CAMPOS_DE_VENTA,
  describirFallo,
  erroresDeFormulario,
} from "../../src/logica/errores-de-formulario";

const sinCampos = {};

describe("erroresDeFormulario: 422 con campos", () => {
  test("traduce los campos de la API a los nombres de los controles de libros", () => {
    const resultado = erroresDeFormulario(
      {
        message: "Field required; Input should be a valid integer",
        estado: 422,
        errores: [
          { campo: "stock", mensaje: "Field required" },
          { campo: "editorial_id", mensaje: "Input should be a valid integer" },
          { campo: "genero_id", mensaje: "g" },
          { campo: "autor_id", mensaje: "a" },
          { campo: "rol", mensaje: "r" },
          { campo: "orden", mensaje: "o" },
          { campo: "autores", mensaje: "l" },
        ],
      },
      CAMPOS_DE_LIBRO,
    );
    expect(resultado.porCampo).toEqual([
      { campo: "stock", mensaje: "Field required" },
      { campo: "editorial", mensaje: "Input should be a valid integer" },
      { campo: "genero", mensaje: "g" },
      { campo: "autores", mensaje: "a" },
      { campo: "autores", mensaje: "r" },
      { campo: "autores", mensaje: "o" },
      { campo: "autores", mensaje: "l" },
    ]);
    expect(resultado.deLaOperacion).toBeNull();
  });

  test("traduce los campos de ventas", () => {
    const resultado = erroresDeFormulario(
      {
        message: "x",
        estado: 422,
        errores: [
          { campo: "cliente_id", mensaje: "c" },
          { campo: "libro_id", mensaje: "l" },
          { campo: "cantidad", mensaje: "n" },
          { campo: "renglones", mensaje: "r" },
        ],
      },
      CAMPOS_DE_VENTA,
    );
    expect(resultado.porCampo.map((e) => e.campo)).toEqual(["cliente", "renglones", "renglones", "renglones"]);
  });

  test("un campo sin traducción conserva su nombre", () => {
    const resultado = erroresDeFormulario(
      { message: "x", estado: 422, errores: [{ campo: "titulo", mensaje: "Field required" }] },
      CAMPOS_DE_LIBRO,
    );
    expect(resultado.porCampo).toEqual([{ campo: "titulo", mensaje: "Field required" }]);
  });

  test("un error sin campo identificable pasa a la operación y los demás quedan junto a su campo", () => {
    const resultado = erroresDeFormulario(
      {
        message: "Value error; Field required",
        estado: 422,
        errores: [
          { campo: "", mensaje: "Value error" },
          { campo: "stock", mensaje: "Field required" },
        ],
      },
      sinCampos,
    );
    expect(resultado.porCampo).toEqual([{ campo: "stock", mensaje: "Field required" }]);
    expect(resultado.deLaOperacion).toBe("Value error");
  });

  test("no modifica el error recibido", () => {
    const errores = [{ campo: "editorial_id", mensaje: "m" }];
    const error = { message: "m", estado: 422, errores };
    erroresDeFormulario(error, CAMPOS_DE_LIBRO);
    expect(errores).toEqual([{ campo: "editorial_id", mensaje: "m" }]);
  });
});

describe("erroresDeFormulario: 409", () => {
  const conflicto = { message: "Ya existe un cliente con ese email", estado: 409, errores: [] };

  test("con campo de conflicto (alta de cliente) lo ubica junto al email", () => {
    const resultado = erroresDeFormulario(conflicto, sinCampos, "email");
    expect(resultado.porCampo).toEqual([{ campo: "email", mensaje: "Ya existe un cliente con ese email" }]);
    expect(resultado.deLaOperacion).toBeNull();
  });

  test("sin campo de conflicto (libros y ventas) es un error de la operación con el detail del servidor", () => {
    const libro = erroresDeFormulario(
      { message: "No se pudo crear el libro: editorial, genero, autor o isbn invalidos", estado: 409, errores: [] },
      CAMPOS_DE_LIBRO,
    );
    expect(libro.porCampo).toEqual([]);
    expect(libro.deLaOperacion).toBe("No se pudo crear el libro: editorial, genero, autor o isbn invalidos");
  });

  test("el campo de conflicto solo se usa para el 409, no para otros estados", () => {
    const resultado = erroresDeFormulario({ message: "Error interno", estado: 500, errores: [] }, sinCampos, "email");
    expect(resultado.porCampo).toEqual([]);
    expect(resultado.deLaOperacion).toBe("Error interno");
  });
});

describe("erroresDeFormulario: otros errores", () => {
  test("un error sin respuesta (resultado incierto) es un error de la operación con su mensaje", () => {
    const mensaje = "No se pudo confirmar si el servidor registró la operación. Revisá los datos antes de reintentar.";
    const resultado = erroresDeFormulario({ message: mensaje, estado: null, errores: [] }, CAMPOS_DE_LIBRO, "email");
    expect(resultado).toEqual({ porCampo: [], deLaOperacion: mensaje });
  });

  test("un error común sin estado ni campos es un error de la operación", () => {
    expect(erroresDeFormulario({ message: "El precio no es un importe válido.", errores: [] }, sinCampos)).toEqual({
      porCampo: [],
      deLaOperacion: "El precio no es un importe válido.",
    });
  });
});

describe("describirFallo", () => {
  const MENSAJE_INCIERTO =
    "No se pudo confirmar si el servidor registró la operación. Revisá los datos antes de reintentar.";

  test("un rechazo 422 queda junto a sus campos, igual que erroresDeFormulario", () => {
    const resultado = describirFallo(
      { message: "Field required", estado: 422, errores: [{ campo: "stock", mensaje: "Field required" }] },
      CAMPOS_DE_LIBRO,
    );
    expect(resultado).toEqual({
      porCampo: [{ campo: "stock", mensaje: "Field required" }],
      deLaOperacion: null,
      resultadoIncierto: false,
    });
  });

  test("un 409 con campo de conflicto queda junto a ese campo", () => {
    const resultado = describirFallo(
      { message: "Ya existe un cliente con ese email", estado: 409, errores: [] },
      sinCampos,
      "email",
    );
    expect(resultado.porCampo).toEqual([{ campo: "email", mensaje: "Ya existe un cliente con ese email" }]);
    expect(resultado.resultadoIncierto).toBe(false);
  });

  test("un resultado incierto lo declara y conserva el mensaje de la operación", () => {
    const resultado = describirFallo(
      { message: MENSAJE_INCIERTO, estado: null, errores: [], resultadoIncierto: true },
      CAMPOS_DE_LIBRO,
      "email",
    );
    expect(resultado).toEqual({ porCampo: [], deLaOperacion: MENSAJE_INCIERTO, resultadoIncierto: true });
  });

  test("un Error común es un error de la operación con su mensaje", () => {
    expect(describirFallo(new Error("El precio no es un importe válido."), sinCampos)).toEqual({
      porCampo: [],
      deLaOperacion: "El precio no es un importe válido.",
      resultadoIncierto: false,
    });
  });

  test("un valor que no es un error produce el mensaje genérico", () => {
    for (const valor of ["texto", 42, null, undefined, {}]) {
      expect(describirFallo(valor, sinCampos)).toEqual({
        porCampo: [],
        deLaOperacion: "Ocurrió un error inesperado.",
        resultadoIncierto: false,
      });
    }
  });
});
