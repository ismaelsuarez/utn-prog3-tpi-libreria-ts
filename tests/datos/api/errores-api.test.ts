import { describe, expect, test } from "vitest";
import { ErrorDeRepositorio } from "../../../src/datos/errores";
import {
  ErrorDeApi,
  MENSAJE_FORMATO,
  MENSAJE_RED,
  MENSAJE_TIEMPO,
  interpretarCuerpoDeError,
} from "../../../src/datos/api/errores-api";

describe("interpretarCuerpoDeError", () => {
  test("un detalle de texto es el mensaje y no genera errores de campo", () => {
    expect(interpretarCuerpoDeError(404, { detail: "Libro no encontrado" })).toEqual({
      mensaje: "Libro no encontrado",
      errores: [],
    });
  });

  test("otro detalle de texto se informa tal cual", () => {
    expect(interpretarCuerpoDeError(409, { detail: "El ISBN ya existe" }).mensaje).toBe("El ISBN ya existe");
  });

  test("la lista de detalles de un 422 une los mensajes con «; » y expone el campo de cada uno", () => {
    const cuerpo = {
      detail: [
        { type: "missing", loc: ["body", "titulo"], msg: "Field required", input: {} },
        { type: "greater_than", loc: ["body", "precio"], msg: "Input should be greater than 0" },
      ],
    };
    expect(interpretarCuerpoDeError(422, cuerpo)).toEqual({
      mensaje: "Field required; Input should be greater than 0",
      errores: [
        { campo: "titulo", mensaje: "Field required" },
        { campo: "precio", mensaje: "Input should be greater than 0" },
      ],
    });
  });

  test("un campo cuyo último elemento de loc es un número se informa como texto", () => {
    const cuerpo = { detail: [{ type: "x", loc: ["body", "autores", 0], msg: "Valor inválido" }] };
    expect(interpretarCuerpoDeError(422, cuerpo).errores).toEqual([{ campo: "0", mensaje: "Valor inválido" }]);
  });

  test("un elemento sin loc usa un campo vacío", () => {
    const cuerpo = { detail: [{ msg: "Valor inválido" }] };
    expect(interpretarCuerpoDeError(422, cuerpo).errores).toEqual([{ campo: "", mensaje: "Valor inválido" }]);
  });

  test.each([
    ["nulo", null],
    ["texto", "<html>Bad Gateway</html>"],
    ["número", 7],
    ["objeto sin detail", { error: "x" }],
    ["detail numérico", { detail: 5 }],
    ["detail arreglo vacío", { detail: [] }],
    ["detail arreglo sin msg de texto", { detail: [{ msg: 3 }] }],
    ["detail arreglo de textos", { detail: ["uno"] }],
  ])("cuerpo %s con 502 usa el texto fijo con el estado", (_nombre, cuerpo) => {
    expect(interpretarCuerpoDeError(502, cuerpo)).toEqual({
      mensaje: "El servidor respondió con un error (502).",
      errores: [],
    });
  });

  test("el estado del texto fijo es el recibido", () => {
    expect(interpretarCuerpoDeError(500, undefined).mensaje).toBe("El servidor respondió con un error (500).");
  });
});

describe("ErrorDeApi", () => {
  test("es un ErrorDeRepositorio y conserva tipo, estado, mensaje y errores", () => {
    const errores = [{ campo: "titulo", mensaje: "Field required" }];
    const error = new ErrorDeApi("Field required", "http", 422, errores);
    expect(error).toBeInstanceOf(ErrorDeRepositorio);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Field required");
    expect(error.tipo).toBe("http");
    expect(error.estado).toBe(422);
    expect(error.errores).toEqual(errores);
    expect(error.name).toBe("ErrorDeApi");
  });

  test("sin estado ni errores usa null y una lista vacía", () => {
    const error = new ErrorDeApi(MENSAJE_RED, "red");
    expect(error.estado).toBeNull();
    expect(error.errores).toEqual([]);
    expect(error.tipo).toBe("red");
  });

  test("los textos fijos son los de la especificación", () => {
    expect(MENSAJE_RED).toBe("No se pudo conectar con el servidor.");
    expect(MENSAJE_TIEMPO).toBe("El servidor tardó demasiado en responder.");
    expect(MENSAJE_FORMATO).toBe("La respuesta del servidor no tiene el formato esperado.");
  });
});
