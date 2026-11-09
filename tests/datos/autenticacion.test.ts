import { describe, expect, test } from "vitest";
import {
  crearServicioAutenticacion,
  type ServicioDeContrasenas,
} from "../../src/datos/autenticacion";
import { ErrorDeAlmacenamiento, ErrorDeCriptografia } from "../../src/datos/errores";
import { crearAlmacenUsuarios } from "../../src/datos/local/almacen-usuarios";
import {
  protegerContrasena,
  verificarContrasena,
} from "../../src/datos/local/contrasenas";
import { esUsuarioRegistrado } from "../../src/logica/sesion";

// Costo reducido: estas pruebas verifican el servicio, no el algoritmo.
const contrasenasRapidas: ServicioDeContrasenas = {
  proteger: (contrasena) => protegerContrasena(contrasena, { iteraciones: 1000 }),
  verificar: verificarContrasena,
};

interface StorageSimulado {
  escrituras: string[];
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

const AHORA = new Date("2026-11-09T17:30:00.000Z");

function crearServicio(storage: StorageSimulado | null = crearStorage()) {
  const almacen = crearAlmacenUsuarios(storage);
  almacen.inicializar();
  return crearServicioAutenticacion(almacen, contrasenasRapidas, { ahora: () => AHORA });
}

const borrador = (cambios: Partial<{ email: string; contrasena: string; repeticion: string }> = {}) => ({
  email: "nuevo@correo.test",
  contrasena: "Faro-2026",
  repeticion: "Faro-2026",
  ...cambios,
});

function usuarios(storage: StorageSimulado): unknown[] {
  return JSON.parse(storage.contenido.users as string) as unknown[];
}

describe("registrar", () => {
  test("un registro válido agrega un usuario client con el email normalizado y la fecha de alta", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);

    const errores = await servicio.registrar(borrador({ email: "  Nuevo@Correo.TEST " }));

    expect(errores).toEqual([]);
    const guardados = usuarios(storage);
    expect(guardados).toHaveLength(2); // administrador sembrado + nuevo
    const agregado = guardados[1];
    expect(esUsuarioRegistrado(agregado)).toBe(true);
    expect(agregado).toMatchObject({
      email: "nuevo@correo.test",
      role: "client",
      creadoEn: "2026-11-09T17:30:00.000Z",
    });
  });

  test("ningún valor guardado contiene la contraseña y userData no se toca", async () => {
    const storage = crearStorage();
    await crearServicio(storage).registrar(borrador({ contrasena: "Faro-2026", repeticion: "Faro-2026" }));
    for (const valor of Object.values(storage.contenido)) {
      expect(valor).not.toContain("Faro-2026");
    }
    expect(storage.escrituras).not.toContain("userData");
    expect(storage.contenido.userData).toBeUndefined();
  });

  test("conserva los usuarios anteriores sin cambios", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    const antes = usuarios(storage);
    await servicio.registrar(borrador());
    expect(usuarios(storage).slice(0, 1)).toEqual(antes);
  });

  test("dos usuarios con la misma contraseña tienen huellas distintas", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    await servicio.registrar(borrador({ email: "uno@correo.test" }));
    await servicio.registrar(borrador({ email: "dos@correo.test" }));
    const [, uno, dos] = usuarios(storage) as { contrasena: { huella: string; sal: string } }[];
    expect(uno?.contrasena.huella).not.toBe(dos?.contrasena.huella);
    expect(uno?.contrasena.sal).not.toBe(dos?.contrasena.sal);
  });

  test("un duplicado con otra capitalización devuelve el error de email y deja users igual", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    await servicio.registrar(borrador({ email: "laura@correo.test" }));
    const antes = storage.contenido.users;
    const escriturasAntes = storage.escrituras.length;

    const errores = await servicio.registrar(borrador({ email: "  LAURA@Correo.TEST " }));

    expect(errores).toEqual([{ campo: "email", mensaje: "Ese email ya está registrado." }]);
    expect(storage.contenido.users).toBe(antes);
    expect(storage.escrituras).toHaveLength(escriturasAntes);
  });

  test("el email del administrador sembrado se rechaza como duplicado", async () => {
    const storage = crearStorage();
    const errores = await crearServicio(storage).registrar(borrador({ email: "ADMIN@libreria.test" }));
    expect(errores).toEqual([{ campo: "email", mensaje: "Ese email ya está registrado." }]);
    expect(usuarios(storage)).toHaveLength(1);
  });

  test("los datos inválidos devuelven los errores y no escriben", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    const escriturasAntes = storage.escrituras.length;
    const errores = await servicio.registrar({ email: "ana@", contrasena: "corta", repeticion: "otra" });
    expect(errores.map((e) => e.campo)).toEqual(["email", "contrasena", "repeticion"]);
    expect(storage.escrituras).toHaveLength(escriturasAntes);
  });

  test("sin almacenamiento lanza ErrorDeAlmacenamiento y no anuncia el alta", async () => {
    await expect(crearServicio(null).registrar(borrador())).rejects.toBeInstanceOf(ErrorDeAlmacenamiento);
  });

  test("si el almacenamiento rechaza la escritura lanza ErrorDeAlmacenamiento", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    storage.setItem = () => {
      throw new Error("cuota");
    };
    await expect(servicio.registrar(borrador())).rejects.toBeInstanceOf(ErrorDeAlmacenamiento);
  });

  test("sin criptografía lanza ErrorDeCriptografia y no guarda nada", async () => {
    const storage = crearStorage();
    const almacen = crearAlmacenUsuarios(storage);
    almacen.inicializar();
    const servicio = crearServicioAutenticacion(almacen, {
      proteger: (c) => protegerContrasena(c, { crypto: {} }),
      verificar: verificarContrasena,
    });
    await expect(servicio.registrar(borrador())).rejects.toBeInstanceOf(ErrorDeCriptografia);
    expect(usuarios(storage)).toHaveLength(1);
  });

  test("si el mismo email se registró mientras se calculaba la huella, no se duplica", async () => {
    const storage = crearStorage();
    const almacen = crearAlmacenUsuarios(storage);
    almacen.inicializar();
    const servicio = crearServicioAutenticacion(
      almacen,
      {
        proteger: async (contrasena) => {
          const guardada = await protegerContrasena(contrasena, { iteraciones: 1000 });
          // Otra pestaña registra el mismo email antes de que termine la derivación.
          almacen.agregarUsuario({
            email: "nuevo@correo.test",
            role: "client",
            contrasena: guardada,
            creadoEn: AHORA.toISOString(),
          });
          return guardada;
        },
        verificar: verificarContrasena,
      },
      { ahora: () => AHORA },
    );
    const errores = await servicio.registrar(borrador());
    expect(errores).toEqual([{ campo: "email", mensaje: "Ese email ya está registrado." }]);
    expect(usuarios(storage)).toHaveLength(2);
  });
});

describe("ingresar", () => {
  async function conCliente() {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    await servicio.registrar(borrador({ email: "laura@correo.test" }));
    return { storage, servicio };
  }

  test("el administrador, con el email en mayúsculas, guarda en userData exactamente email, loggedIn y role", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    // La huella del administrador usa 100000 iteraciones: se verifica con el algoritmo real.
    const sesion = await servicio.ingresar({ email: "  ADMIN@Libreria.TEST ", contrasena: "Faro-Admin-2026" });

    expect(sesion).toEqual({ email: "admin@libreria.test", loggedIn: true, role: "admin" });
    expect(JSON.parse(storage.contenido.userData as string)).toEqual({
      email: "admin@libreria.test",
      loggedIn: true,
      role: "admin",
    });
    expect(storage.contenido.userData).not.toContain("Faro-Admin-2026");
    expect(storage.contenido.userData).not.toContain("huella");
    expect(servicio.obtenerSesion()).toEqual(sesion);
  });

  test("un cliente registrado ingresa con rol client", async () => {
    const { storage, servicio } = await conCliente();
    const sesion = await servicio.ingresar({ email: "LAURA@correo.test", contrasena: "Faro-2026" });
    expect(sesion).toEqual({ email: "laura@correo.test", loggedIn: true, role: "client" });
    expect(JSON.parse(storage.contenido.userData as string)).toEqual(sesion);
  });

  test("contraseña equivocada devuelve null sin tocar userData", async () => {
    const { storage, servicio } = await conCliente();
    expect(await servicio.ingresar({ email: "laura@correo.test", contrasena: "Faro-2027" })).toBeNull();
    expect(storage.escrituras).not.toContain("userData");
    expect(storage.contenido.userData).toBeUndefined();
  });

  test("email inexistente devuelve null sin tocar userData", async () => {
    const { storage, servicio } = await conCliente();
    expect(await servicio.ingresar({ email: "nadie@correo.test", contrasena: "Faro-2026" })).toBeNull();
    expect(storage.contenido.userData).toBeUndefined();
  });

  test("un email inexistente también ejecuta una verificación (mismo costo que el fallo de contraseña)", async () => {
    const llamadas: string[] = [];
    const almacen = crearAlmacenUsuarios(crearStorage());
    almacen.inicializar();
    const servicio = crearServicioAutenticacion(almacen, {
      proteger: contrasenasRapidas.proteger,
      verificar: async (contrasena, guardada) => {
        llamadas.push(contrasena);
        return verificarContrasena(contrasena, guardada);
      },
    });
    expect(await servicio.ingresar({ email: "nadie@correo.test", contrasena: "cualquiera" })).toBeNull();
    expect(llamadas).toEqual(["cualquiera"]);
  });

  test("el rol guardado no se puede elevar desde el formulario: se toma de users", async () => {
    const { servicio } = await conCliente();
    const sesion = await servicio.ingresar({ email: "laura@correo.test", contrasena: "Faro-2026" });
    expect(sesion?.role).toBe("client");
  });

  test("si no se puede guardar la sesión lanza ErrorDeAlmacenamiento", async () => {
    const { storage, servicio } = await conCliente();
    storage.setItem = () => {
      throw new Error("cuota");
    };
    await expect(
      servicio.ingresar({ email: "laura@correo.test", contrasena: "Faro-2026" }),
    ).rejects.toBeInstanceOf(ErrorDeAlmacenamiento);
  });
});

describe("obtenerSesion y cerrarSesion", () => {
  test("sin userData devuelve null", () => {
    expect(crearServicio().obtenerSesion()).toBeNull();
  });

  test.each([
    ["JSON ilegible", "{no es json"],
    ["rol desconocido", JSON.stringify({ email: "a@b.test", loggedIn: true, role: "superusuario" })],
    ["loggedIn en falso", JSON.stringify({ email: "a@b.test", loggedIn: false, role: "admin" })],
    ["arreglo", "[]"],
    ["null", "null"],
  ])("userData inválido (%s) se trata como sin sesión", (_nombre, crudo) => {
    const servicio = crearServicio(crearStorage({ userData: crudo }));
    expect(servicio.obtenerSesion()).toBeNull();
  });

  test("una sesión válida se devuelve con sus tres campos", () => {
    const servicio = crearServicio(
      crearStorage({ userData: JSON.stringify({ email: "a@b.test", loggedIn: true, role: "client" }) }),
    );
    expect(servicio.obtenerSesion()).toEqual({ email: "a@b.test", loggedIn: true, role: "client" });
  });

  test("cerrarSesion quita userData y conserva users", async () => {
    const storage = crearStorage();
    const servicio = crearServicio(storage);
    await servicio.registrar(borrador({ email: "laura@correo.test" }));
    await servicio.ingresar({ email: "laura@correo.test", contrasena: "Faro-2026" });
    const usersAntes = storage.contenido.users;

    servicio.cerrarSesion();

    expect(storage.contenido.userData).toBeUndefined();
    expect(storage.contenido.users).toBe(usersAntes);
    expect(servicio.obtenerSesion()).toBeNull();
  });
});
