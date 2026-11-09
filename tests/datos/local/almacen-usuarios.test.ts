import { describe, expect, test } from "vitest";
import {
  CLAVE_SESION,
  CLAVE_USUARIOS,
  crearAlmacenUsuarios,
} from "../../../src/datos/local/almacen-usuarios";
import { usuariosIniciales } from "../../../src/datos/local/usuarios-iniciales";
import { ErrorDeAlmacenamiento } from "../../../src/datos/errores";
import type { UsuarioRegistrado } from "../../../src/types/usuario";

interface StorageSimulado {
  /** Claves escritas con `setItem`, en orden. */
  escrituras: string[];
  /** Claves quitadas con `removeItem`, en orden. */
  borrados: string[];
  contenido: Record<string, string>;
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
  removeItem: (clave: string) => void;
}

function crearStorage(contenidoInicial: Record<string, string> = {}): StorageSimulado {
  const claves: Record<string, string> = { ...contenidoInicial };
  const storage: StorageSimulado = {
    escrituras: [],
    borrados: [],
    contenido: claves,
    getItem: (clave) => (Object.hasOwn(claves, clave) ? (claves[clave] as string) : null),
    setItem: (clave, valor) => {
      storage.escrituras.push(clave);
      claves[clave] = String(valor);
    },
    removeItem: (clave) => {
      storage.borrados.push(clave);
      Reflect.deleteProperty(claves, clave);
    },
  };
  return storage;
}

const laura: UsuarioRegistrado = {
  email: "laura@correo.test",
  role: "client",
  contrasena: {
    algoritmo: "PBKDF2-SHA-256",
    iteraciones: 1000,
    sal: "00112233445566778899aabbccddeeff",
    huella: "cd".repeat(32),
  },
  creadoEn: "2026-11-09T17:00:00.000Z",
};

const nuevo: UsuarioRegistrado = { ...laura, email: "nuevo@correo.test" };

function usuariosGuardados(storage: StorageSimulado): unknown {
  return JSON.parse(storage.contenido[CLAVE_USUARIOS] as string);
}

describe("claves", () => {
  test("las fija la consigna, sin el prefijo de la aplicación", () => {
    expect(CLAVE_USUARIOS).toBe("users");
    expect(CLAVE_SESION).toBe("userData");
  });
});

describe("inicializar", () => {
  test("siembra users con el administrador solo si falta, sin tocar userData", () => {
    const storage = crearStorage();
    crearAlmacenUsuarios(storage).inicializar();
    expect(storage.escrituras).toEqual(["users"]);
    expect(usuariosGuardados(storage)).toEqual(usuariosIniciales);
  });

  test("no duplica al administrador al inicializar otra vez", () => {
    const storage = crearStorage();
    const almacen = crearAlmacenUsuarios(storage);
    almacen.inicializar();
    almacen.inicializar();
    crearAlmacenUsuarios(storage).inicializar();
    expect(storage.escrituras).toEqual(["users"]);
    expect(usuariosGuardados(storage)).toHaveLength(1);
  });

  test("respeta usuarios existentes sin agregar ni reemplazar", () => {
    const existente = JSON.stringify([laura]);
    const storage = crearStorage({ users: existente });
    crearAlmacenUsuarios(storage).inicializar();
    expect(storage.escrituras).toEqual([]);
    expect(storage.contenido.users).toBe(existente);
  });

  test("respeta un contenido ilegible sin sobrescribirlo", () => {
    const storage = crearStorage({ users: "{no es json" });
    crearAlmacenUsuarios(storage).inicializar();
    expect(storage.escrituras).toEqual([]);
    expect(storage.contenido.users).toBe("{no es json");
  });

  test("no lanza sin almacenamiento, con setItem que lanza ni con getItem que lanza", () => {
    expect(() => crearAlmacenUsuarios(null).inicializar()).not.toThrow();
    expect(() => crearAlmacenUsuarios({}).inicializar()).not.toThrow();
    const sinEscritura = { ...crearStorage(), setItem: () => { throw new Error("cuota"); } };
    expect(() => crearAlmacenUsuarios(sinEscritura).inicializar()).not.toThrow();
    const sinLectura = { ...crearStorage(), getItem: () => { throw new Error("bloqueado"); } };
    expect(() => crearAlmacenUsuarios(sinLectura).inicializar()).not.toThrow();
  });
});

describe("obtenerUsuarios", () => {
  test("devuelve los usuarios guardados", () => {
    const storage = crearStorage({ users: JSON.stringify([usuariosIniciales[0], laura]) });
    expect(crearAlmacenUsuarios(storage).obtenerUsuarios()).toEqual([usuariosIniciales[0], laura]);
  });

  test("ignora los elementos inválidos y conserva los válidos", () => {
    const storage = crearStorage({
      users: JSON.stringify([laura, { email: "x@y.test" }, null, "texto", { ...laura, role: "root" }]),
    });
    expect(crearAlmacenUsuarios(storage).obtenerUsuarios()).toEqual([laura]);
  });

  test("con la clave ausente usa la semilla sin escribir", () => {
    const storage = crearStorage();
    expect(crearAlmacenUsuarios(storage).obtenerUsuarios()).toEqual(usuariosIniciales);
    expect(storage.escrituras).toEqual([]);
  });

  test("con contenido ilegible o que no es un arreglo usa la semilla sin escribir", () => {
    for (const crudo of ["{no es json", "{\"a\":1}", "\"texto\"", "null"]) {
      const storage = crearStorage({ users: crudo });
      expect(crearAlmacenUsuarios(storage).obtenerUsuarios()).toEqual(usuariosIniciales);
      expect(storage.escrituras).toEqual([]);
      expect(storage.contenido.users).toBe(crudo);
    }
  });

  test("sin almacenamiento o con lectura que lanza usa la semilla", () => {
    expect(crearAlmacenUsuarios(null).obtenerUsuarios()).toEqual(usuariosIniciales);
    const sinLectura = { ...crearStorage(), getItem: () => { throw new Error("bloqueado"); } };
    expect(crearAlmacenUsuarios(sinLectura).obtenerUsuarios()).toEqual(usuariosIniciales);
  });

  test("devuelve copias: modificarlas no cambia lo guardado", () => {
    const storage = crearStorage({ users: JSON.stringify([laura]) });
    const almacen = crearAlmacenUsuarios(storage);
    const [copia] = almacen.obtenerUsuarios();
    expect(copia).toBeDefined();
    if (copia === undefined) return;
    copia.email = "otro@correo.test";
    copia.contrasena.huella = "00";
    expect(almacen.obtenerUsuarios()).toEqual([laura]);
  });
});

describe("agregarUsuario", () => {
  test("agrega al final y conserva los anteriores sin cambios", () => {
    const storage = crearStorage({ users: JSON.stringify([usuariosIniciales[0], laura]) });
    crearAlmacenUsuarios(storage).agregarUsuario(nuevo);
    expect(usuariosGuardados(storage)).toEqual([usuariosIniciales[0], laura, nuevo]);
    expect(storage.escrituras).toEqual(["users"]);
  });

  test("con la clave ausente escribe la semilla más el nuevo", () => {
    const storage = crearStorage();
    crearAlmacenUsuarios(storage).agregarUsuario(nuevo);
    expect(usuariosGuardados(storage)).toEqual([...usuariosIniciales, nuevo]);
  });

  test("al escribir descarta los elementos inválidos y conserva los válidos", () => {
    const storage = crearStorage({ users: JSON.stringify([laura, { email: "x@y.test" }]) });
    crearAlmacenUsuarios(storage).agregarUsuario(nuevo);
    expect(usuariosGuardados(storage)).toEqual([laura, nuevo]);
  });

  test("sin almacenamiento lanza ErrorDeAlmacenamiento", () => {
    expect(() => crearAlmacenUsuarios(null).agregarUsuario(nuevo)).toThrow(ErrorDeAlmacenamiento);
  });

  test("si setItem lanza, lanza ErrorDeAlmacenamiento con el mensaje del spec y no guarda", () => {
    const storage = crearStorage({ users: JSON.stringify([laura]) });
    const rechazante = { ...storage, setItem: () => { throw new Error("cuota"); } };
    const accion = (): void => crearAlmacenUsuarios(rechazante).agregarUsuario(nuevo);
    expect(accion).toThrow(ErrorDeAlmacenamiento);
    expect(accion).toThrow(
      "No se pudo acceder al almacenamiento del navegador. Revisá que no esté bloqueado e intentá nuevamente.",
    );
    expect(storage.contenido.users).toBe(JSON.stringify([laura]));
  });
});

describe("sesión", () => {
  test("leerSesion devuelve null sin clave, sin almacenamiento o con JSON ilegible", () => {
    expect(crearAlmacenUsuarios(crearStorage()).leerSesion()).toBeNull();
    expect(crearAlmacenUsuarios(null).leerSesion()).toBeNull();
    expect(crearAlmacenUsuarios(crearStorage({ userData: "no es json" })).leerSesion()).toBeNull();
    const sinLectura = { ...crearStorage(), getItem: () => { throw new Error("bloqueado"); } };
    expect(crearAlmacenUsuarios(sinLectura).leerSesion()).toBeNull();
  });

  test("leerSesion devuelve lo guardado sin validarlo", () => {
    const valor = { email: "a@b.test", loggedIn: true, role: "superusuario" };
    const storage = crearStorage({ userData: JSON.stringify(valor) });
    expect(crearAlmacenUsuarios(storage).leerSesion()).toEqual(valor);
  });

  test("guardarSesion escribe solo userData, con exactamente los tres campos", () => {
    const storage = crearStorage({ users: JSON.stringify([laura]) });
    const sesion = { email: "laura@correo.test", loggedIn: true as const, role: "client" as const };
    crearAlmacenUsuarios(storage).guardarSesion(sesion);
    expect(storage.escrituras).toEqual(["userData"]);
    expect(JSON.parse(storage.contenido.userData as string)).toEqual(sesion);
    expect(storage.contenido.users).toBe(JSON.stringify([laura]));
  });

  test("guardarSesion no copia campos de más", () => {
    const storage = crearStorage();
    const conExtra = { email: "a@b.test", loggedIn: true as const, role: "client" as const, contrasena: "x" };
    crearAlmacenUsuarios(storage).guardarSesion(conExtra);
    expect(Object.keys(JSON.parse(storage.contenido.userData as string) as object).sort()).toEqual([
      "email",
      "loggedIn",
      "role",
    ]);
  });

  test("guardarSesion sin almacenamiento o con setItem que lanza lanza ErrorDeAlmacenamiento", () => {
    const sesion = { email: "a@b.test", loggedIn: true as const, role: "client" as const };
    expect(() => crearAlmacenUsuarios(null).guardarSesion(sesion)).toThrow(ErrorDeAlmacenamiento);
    const rechazante = { ...crearStorage(), setItem: () => { throw new Error("cuota"); } };
    expect(() => crearAlmacenUsuarios(rechazante).guardarSesion(sesion)).toThrow(ErrorDeAlmacenamiento);
  });

  test("eliminarSesion quita userData y deja users", () => {
    const storage = crearStorage({
      users: JSON.stringify([laura]),
      userData: JSON.stringify({ email: "a@b.test", loggedIn: true, role: "client" }),
    });
    crearAlmacenUsuarios(storage).eliminarSesion();
    expect(storage.borrados).toEqual(["userData"]);
    expect(storage.contenido).toEqual({ users: JSON.stringify([laura]) });
  });

  test("eliminarSesion sin almacenamiento no hace nada; si no puede quitar, lanza", () => {
    expect(() => crearAlmacenUsuarios(null).eliminarSesion()).not.toThrow();
    const rechazante = { ...crearStorage(), removeItem: () => { throw new Error("bloqueado"); } };
    expect(() => crearAlmacenUsuarios(rechazante).eliminarSesion()).toThrow(ErrorDeAlmacenamiento);
    const sinRemover = { getItem: () => null, setItem: () => undefined };
    expect(() => crearAlmacenUsuarios(sinRemover).eliminarSesion()).toThrow(ErrorDeAlmacenamiento);
  });
});
