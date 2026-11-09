import { describe, expect, test } from "vitest";
import { validarCliente, type BorradorCliente } from "../../src/logica/clientes";

const guardadosDeEjemplo = [
  { id: 1, email: "laura.mendoza@correo.test" },
  { id: 2, email: "ricardo.soria@correo.test" },
  { id: 3, email: "nina.podesta@correo.test" },
];

/** Registro completo y válido: su email no coincide con ningún ejemplo. */
function datosValidos(): BorradorCliente {
  return {
    nombre: "Ana Sosa",
    email: "ana.sosa@correo.test",
    telefono: "11 5555-0123",
  };
}

function validar(
  registro: BorradorCliente,
  guardados: readonly { id: number; email: string }[] = guardadosDeEjemplo,
  idEnEdicion?: number,
) {
  return validarCliente(registro, guardados, idEnEdicion);
}

/**
 * Exige UN SOLO error, en el campo esperado y con la forma {campo, mensaje}: así
 * cada rechazo queda aislado (un error por campo) y sin colaterales.
 */
function unicoError(
  registro: BorradorCliente,
  campo: string,
  guardados?: readonly { id: number; email: string }[],
) {
  const errores = validar(registro, guardados);
  expect(errores, JSON.stringify(errores)).toHaveLength(1);
  const [error] = errores;
  expect(error?.campo).toBe(campo);
  expect(Object.keys(error ?? {}).sort()).toEqual(["campo", "mensaje"]);
  expect(error?.mensaje.trim()).not.toBe("");
  return error;
}

// Los 15 casos de la suite anterior fallaban porque sus datos de prueba no
// incluían el teléfono, obligatorio desde la regla vigente: cada uno conserva su
// aserción y su dato de prueba suma un teléfono válido (`datosValidos`).
describe("validarCliente: nombre", () => {
  test("rechaza el nombre vacío", () => {
    const e = unicoError({ ...datosValidos(), nombre: "" }, "nombre");
    expect(e?.mensaje).toBe("El nombre completo es obligatorio.");
  });

  test("rechaza el nombre formado solo por espacios", () => {
    unicoError({ ...datosValidos(), nombre: "     " }, "nombre");
  });
});

describe("validarCliente: email", () => {
  test("rechaza el email vacío", () => {
    const e = unicoError({ ...datosValidos(), email: "" }, "email");
    expect(e?.mensaje).toBe("El email es obligatorio.");
  });

  test("rechaza un email sin arroba", () => {
    const e = unicoError({ ...datosValidos(), email: "ana.sosacorreo.test" }, "email");
    expect(e?.mensaje).toBe("El email no tiene un formato válido.");
  });

  test("rechaza un email sin punto en el dominio", () => {
    unicoError({ ...datosValidos(), email: "ana@correo" }, "email");
  });

  test("rechaza un email con doble arroba", () => {
    unicoError({ ...datosValidos(), email: "ana@@correo.test" }, "email");
  });

  test("rechaza un email con espacios intermedios", () => {
    unicoError({ ...datosValidos(), email: "ana sosa@correo.test" }, "email");
  });

  test("rechaza un email repetido aunque cambien mayúsculas y espacios exteriores", () => {
    const e = unicoError({ ...datosValidos(), email: " Laura.Mendoza@Correo.Test " }, "email");
    expect(e?.mensaje).toBe("Ese email ya está registrado.");
  });

  test("rechaza el email formado solo por espacios", () => {
    unicoError({ ...datosValidos(), email: "   " }, "email");
  });

  test("rechaza un email repetido solo por mayúsculas", () => {
    unicoError({ ...datosValidos(), email: "RICARDO.SORIA@CORREO.TEST" }, "email");
  });

  test("rechaza un email repetido solo por espacios de los extremos", () => {
    unicoError({ ...datosValidos(), email: "  nina.podesta@correo.test  " }, "email");
  });

  test("rechaza un email repetido dentro del conjunto recibido en este envío", () => {
    unicoError({ ...datosValidos(), email: "OTRO.MENSAJE@CORREO.TEST" }, "email", [
      { id: 88, email: " Otro.Mensaje@Correo.Test " },
    ]);
  });

  test("acepta un email nuevo escrito con mayúsculas y espacios exteriores", () => {
    expect(validar({ ...datosValidos(), email: "  Ana.Sosa@Correo.Test  " })).toEqual([]);
  });

  test("al editar, el cliente puede conservar su propio email", () => {
    const propio = { ...datosValidos(), email: "RICARDO.SORIA@correo.test" };
    expect(validar(propio, guardadosDeEjemplo, 2)).toEqual([]);
    // Pero no el de otro cliente.
    const ajeno = validar(propio, guardadosDeEjemplo, 1);
    expect(ajeno.map((error) => error.campo)).toEqual(["email"]);
  });
});

describe("validarCliente: teléfono", () => {
  test("rechaza el teléfono faltante, vacío o solo espacios", () => {
    const { telefono: _omitido, ...sinTelefono } = datosValidos();
    const e = unicoError(sinTelefono, "telefono");
    expect(e?.mensaje).toBe("El teléfono es obligatorio.");
    unicoError({ ...datosValidos(), telefono: "" }, "telefono");
    unicoError({ ...datosValidos(), telefono: "    " }, "telefono");
  });

  test("rechaza un teléfono con menos de 7 o más de 15 dígitos", () => {
    const mensaje = "Ingresá un teléfono válido (entre 7 y 15 dígitos).";
    expect(unicoError({ ...datosValidos(), telefono: "123456" }, "telefono")?.mensaje).toBe(mensaje);
    expect(unicoError({ ...datosValidos(), telefono: "1234567890123456" }, "telefono")?.mensaje).toBe(mensaje);
  });

  test("rechaza un teléfono con letras", () => {
    unicoError({ ...datosValidos(), telefono: "11 5555-abcd" }, "telefono");
  });

  test("acepta los límites de 7 y 15 dígitos y el formato internacional", () => {
    expect(validar({ ...datosValidos(), telefono: "1234567" })).toEqual([]);
    expect(validar({ ...datosValidos(), telefono: "123456789012345" })).toEqual([]);
    expect(validar({ ...datosValidos(), telefono: "+54 (11) 5555-0101" })).toEqual([]);
  });
});

describe("validarCliente: conjunto", () => {
  test("un cliente válido no produce ningún error ni altera sus datos", () => {
    const registro = datosValidos();
    const antes = structuredClone(registro);
    expect(validar(registro)).toEqual([]);
    expect(registro).toEqual(antes);
  });

  test("acumula un error por cada campo rechazado sin registrar nada", () => {
    const errores = validar({
      ...datosValidos(),
      nombre: "",
      email: "ana.sosacorreo.test",
    });
    expect(errores, JSON.stringify(errores)).toHaveLength(2);
    expect(errores.map((error) => error.campo).sort()).toEqual(["email", "nombre"]);
  });
});
