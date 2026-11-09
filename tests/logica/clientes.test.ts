import { describe, expect, test } from "vitest";
import {
  mensajeDePerfilFallido,
  perfilNuevoDesdeBorrador,
  registrarClienteConPerfil,
  validarCliente,
  validarPerfil,
  type BorradorCliente,
} from "../../src/logica/clientes";
import type { ClienteNuevo, PerfilNuevo } from "../../src/types/cliente";

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

// Reglas nuevas de `operaciones-contra-api`: dirección opcional y límites que la
// API no valida (nombre 100, email 255, teléfono 30, dirección 255).
describe("validarCliente: dirección", () => {
  test("la dirección es opcional: ausente, vacía o con espacios no producen errores", () => {
    expect(validar(datosValidos())).toEqual([]);
    expect(validar({ ...datosValidos(), direccion: "" })).toEqual([]);
    expect(validar({ ...datosValidos(), direccion: "   " })).toEqual([]);
  });

  test("acepta una dirección de 255 caracteres y rechaza una de 256", () => {
    expect(validar({ ...datosValidos(), direccion: "d".repeat(255) })).toEqual([]);
    const e = unicoError({ ...datosValidos(), direccion: "d".repeat(256) }, "direccion");
    expect(e?.mensaje).toBe("La dirección no puede superar los 255 caracteres.");
  });
});

describe("validarCliente: límites del servidor", () => {
  test("acepta un nombre de 100 caracteres y rechaza uno de 101", () => {
    expect(validar({ ...datosValidos(), nombre: "n".repeat(100) })).toEqual([]);
    const e = unicoError({ ...datosValidos(), nombre: "n".repeat(101) }, "nombre");
    expect(e?.mensaje).toBe("El nombre no puede superar los 100 caracteres.");
  });

  test("acepta un email de 255 caracteres y rechaza uno de 256", () => {
    const conLargo = (largo: number): string => `${"a".repeat(largo - "@correo.test".length)}@correo.test`;
    expect(validar({ ...datosValidos(), email: conLargo(255) })).toEqual([]);
    const e = unicoError({ ...datosValidos(), email: conLargo(256) }, "email");
    expect(e?.mensaje).toBe("El email no puede superar los 255 caracteres.");
  });

  test("acepta un teléfono válido de 30 caracteres y rechaza uno válido de 31", () => {
    const conLargo = (largo: number): string => `11${" ".repeat(largo - 10)}55550123`;
    expect(conLargo(30)).toHaveLength(30);
    expect(validar({ ...datosValidos(), telefono: conLargo(30) })).toEqual([]);
    expect(conLargo(31)).toHaveLength(31);
    const e = unicoError({ ...datosValidos(), telefono: conLargo(31) }, "telefono");
    expect(e?.mensaje).toBe("El teléfono no puede superar los 30 caracteres.");
  });

  test("un teléfono de 31 caracteres y letras informa el formato, un solo error", () => {
    const e = unicoError({ ...datosValidos(), telefono: "a".repeat(31) }, "telefono");
    expect(e?.mensaje).toBe("Ingresá un teléfono válido (entre 7 y 15 dígitos).");
  });

  test("el teléfono con 6 dígitos o con letras sigue rechazándose", () => {
    unicoError({ ...datosValidos(), telefono: "555-012" }, "telefono");
    unicoError({ ...datosValidos(), telefono: "11 5555-01ab" }, "telefono");
  });
});

describe("validarPerfil (para «Completar perfil»)", () => {
  test("acepta teléfono válido con o sin dirección", () => {
    expect(validarPerfil({ telefono: "11 5555-0123" })).toEqual([]);
    expect(validarPerfil({ telefono: "11 5555-0123", direccion: "Calle 1" })).toEqual([]);
  });

  test("exige el teléfono y limita la dirección con las mismas reglas del alta", () => {
    expect(validarPerfil({ telefono: "" })).toEqual([{ campo: "telefono", mensaje: "El teléfono es obligatorio." }]);
    expect(validarPerfil({})).toEqual([{ campo: "telefono", mensaje: "El teléfono es obligatorio." }]);
    expect(validarPerfil({ telefono: "123456" }).map((e) => e.campo)).toEqual(["telefono"]);
    expect(validarPerfil({ telefono: "11 5555-0123", direccion: "d".repeat(256) }).map((e) => e.campo)).toEqual([
      "direccion",
    ]);
  });

  test("no valida nombre ni email", () => {
    expect(validarPerfil({ telefono: "11 5555-0123" })).toEqual([]);
  });

  test("validarCliente y validarPerfil dan el mismo error de teléfono", () => {
    const delAlta = validar({ ...datosValidos(), telefono: "12" }).filter((e) => e.campo === "telefono");
    expect(validarPerfil({ telefono: "12" })).toEqual(delAlta);
  });
});

describe("perfilNuevoDesdeBorrador", () => {
  test("recorta el teléfono, junta sus espacios y envía la dirección recortada", () => {
    expect(perfilNuevoDesdeBorrador({ telefono: "  +54  9 261   123 4567 ", direccion: "  Calle 1, Mendoza " })).toEqual({
      telefono: "+54 9 261 123 4567",
      direccion: "Calle 1, Mendoza",
    });
  });

  test("una dirección vacía, en blanco o ausente se envía como null", () => {
    expect(perfilNuevoDesdeBorrador({ telefono: "11 5555-0123", direccion: "" }).direccion).toBeNull();
    expect(perfilNuevoDesdeBorrador({ telefono: "11 5555-0123", direccion: "   " }).direccion).toBeNull();
    expect(perfilNuevoDesdeBorrador({ telefono: "11 5555-0123" }).direccion).toBeNull();
  });
});

describe("registrarClienteConPerfil: alta en dos escrituras", () => {
  /** Repositorio simulado: registra cada llamada y responde (o rechaza) a pedido. */
  function repositorio(opciones: { rechazarCliente?: Error; rechazarPerfil?: Error } = {}) {
    const clientes: ClienteNuevo[] = [];
    const perfiles: { id: number; perfil: PerfilNuevo }[] = [];
    return {
      clientes,
      perfiles,
      crear: (cliente: ClienteNuevo) => {
        clientes.push(cliente);
        return opciones.rechazarCliente
          ? Promise.reject(opciones.rechazarCliente)
          : Promise.resolve({ id: 7, nombre: cliente.nombre, email: cliente.email, perfil: null });
      },
      crearPerfil: (id: number, perfil: PerfilNuevo) => {
        perfiles.push({ id, perfil });
        return opciones.rechazarPerfil
          ? Promise.reject(opciones.rechazarPerfil)
          : Promise.resolve({ id: 1, cliente_id: id, telefono: perfil.telefono ?? null, direccion: perfil.direccion ?? null });
      },
    };
  }

  const datos = { nombre: "  Ana Sosa ", email: " Ana.Sosa@Correo.Test ", telefono: " 11  5555-0123", direccion: " Calle 1 " };

  test("registra el cliente y, con su identificador, el perfil", async () => {
    const repo = repositorio();
    const resultado = await registrarClienteConPerfil(repo, datos);
    expect(resultado.tipo).toBe("completo");
    expect(repo.clientes).toEqual([{ nombre: "Ana Sosa", email: "ana.sosa@correo.test" }]);
    expect(repo.perfiles).toEqual([{ id: 7, perfil: { telefono: "11 5555-0123", direccion: "Calle 1" } }]);
    if (resultado.tipo === "completo") expect(resultado.cliente.id).toBe(7);
  });

  test("con la dirección vacía el perfil se envía con dirección null", async () => {
    const repo = repositorio();
    await registrarClienteConPerfil(repo, { ...datos, direccion: "" });
    expect(repo.perfiles[0]?.perfil.direccion).toBeNull();
  });

  test("si el cliente se rechaza no se envía el perfil y se devuelve el error", async () => {
    const error = new Error("Ya existe un cliente con ese email");
    const repo = repositorio({ rechazarCliente: error });
    const resultado = await registrarClienteConPerfil(repo, datos);
    expect(resultado).toEqual({ tipo: "rechazado", error });
    expect(repo.clientes).toHaveLength(1);
    expect(repo.perfiles).toHaveLength(0);
  });

  test("si el perfil falla el cliente queda registrado y no se repite ningún alta", async () => {
    const error = new Error("El servidor respondió con un error (500).");
    const repo = repositorio({ rechazarPerfil: error });
    const resultado = await registrarClienteConPerfil(repo, datos);
    expect(resultado.tipo).toBe("sin-perfil");
    if (resultado.tipo === "sin-perfil") {
      expect(resultado.cliente.id).toBe(7);
      expect(resultado.error).toBe(error);
    }
    expect(repo.clientes).toHaveLength(1);
    expect(repo.perfiles).toHaveLength(1);
  });
});

describe("mensajeDePerfilFallido", () => {
  test("informa que el cliente se registró, el motivo y cómo completar el perfil", () => {
    expect(mensajeDePerfilFallido(new Error("El servidor respondió con un error (500)."))).toBe(
      "El cliente se registró, pero no se pudo guardar su teléfono y dirección: El servidor respondió con un error (500). " +
        "Podés completarlos con «Completar perfil».",
    );
  });

  test("un motivo sin punto final recibe uno, y nunca queda un doble punto", () => {
    expect(mensajeDePerfilFallido(new Error("Sin conexión"))).toContain("dirección: Sin conexión. Podés");
  });

  test("un valor que no es un error usa el mensaje genérico como motivo", () => {
    expect(mensajeDePerfilFallido("x")).toContain("Ocurrió un error inesperado.");
  });
});
