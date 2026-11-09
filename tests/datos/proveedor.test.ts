import { afterEach, describe, expect, test, vi } from "vitest";
import { obtenerAlmacenamientoDelNavegador } from "../../src/datos/local/almacen-local";
import { autenticacion, crearProveedor, crearServicioDeAutenticacion } from "../../src/datos/proveedor";
import { datosIniciales } from "../../src/datos/local/datos-iniciales";
import { detalleDelLibro1, detalleDelLibro2, listadoDeLibros } from "../fixtures/api/libros";

interface StorageSimulado {
  escrituras: string[];
  contenido: Record<string, string>;
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
}

function crearStorage(contenidoInicial: Record<string, string> = {}): StorageSimulado {
  const claves: Record<string, string> = { ...contenidoInicial };
  const storage: StorageSimulado = {
    escrituras: [],
    contenido: claves,
    getItem: (clave) => (Object.hasOwn(claves, clave) ? (claves[clave] as string) : null),
    setItem: (clave, valor) => {
      storage.escrituras.push(clave);
      claves[clave] = String(valor);
    },
  };
  return storage;
}

describe("crearProveedor", () => {
  test("siembra una sola vez las claves ausentes", () => {
    const storage = crearStorage();
    crearProveedor(storage);

    expect(storage.escrituras).toEqual(["libreria.libros", "libreria.clientes", "libreria.ventas"]);
    expect(JSON.parse(storage.contenido["libreria.libros"] as string)).toEqual(datosIniciales.libros);
    expect(storage.contenido["libreria.ventas"]).toBe("[]");

    // Una segunda composición sobre el mismo almacenamiento no vuelve a sembrar.
    crearProveedor(storage);
    expect(storage.escrituras).toHaveLength(3);
  });

  test("respeta las claves presentes", () => {
    const libros = JSON.stringify([
      { id: "lib-77", titulo: "Guardado", isbn: "1", precio: 10, editorialId: "edi-01", generoId: null, autorIds: ["aut-01"] },
    ]);
    const storage = crearStorage({ "libreria.libros": libros });
    crearProveedor(storage);

    expect(storage.escrituras).toEqual(["libreria.clientes", "libreria.ventas"]);
    expect(storage.contenido["libreria.libros"]).toBe(libros);
  });

  test("entrega los seis repositorios, que ven lo sembrado", async () => {
    const repos = crearProveedor(crearStorage());
    expect(Object.keys(repos).sort()).toEqual(["autores", "clientes", "editoriales", "generos", "libros", "ventas"]);
    expect(await repos.libros.listar()).toHaveLength(6);
    expect(await repos.ventas.listar()).toEqual([]);
  });

  test("sin almacenamiento sigue funcionando con los ejemplos", async () => {
    const repos = crearProveedor(null);
    expect(await repos.libros.listar()).toHaveLength(6);
    expect(await repos.clientes.listar()).toHaveLength(3);
  });
});

describe("crearServicioDeAutenticacion", () => {
  test("sobre un almacenamiento vacío siembra users una sola vez y no toca userData", () => {
    const storage = crearStorage();
    crearServicioDeAutenticacion(storage);

    expect(storage.escrituras).toEqual(["users"]);
    const usuarios = JSON.parse(storage.contenido.users as string) as { email: string; role: string }[];
    expect(usuarios.map((u) => [u.email, u.role])).toEqual([["admin@libreria.test", "admin"]]);

    crearServicioDeAutenticacion(storage);
    expect(storage.escrituras).toEqual(["users"]);
  });

  test("respeta un users existente", () => {
    const existente = "[]";
    const storage = crearStorage({ users: existente });
    crearServicioDeAutenticacion(storage);
    expect(storage.escrituras).toEqual([]);
    expect(storage.contenido.users).toBe(existente);
  });

  test("expone el servicio de autenticación, sin sesión al iniciar", () => {
    const servicio = crearServicioDeAutenticacion(crearStorage());
    expect(servicio.obtenerSesion()).toBeNull();
    expect(Object.keys(servicio).sort()).toEqual(["cerrarSesion", "ingresar", "obtenerSesion", "registrar"]);
  });

  test("sin almacenamiento el servicio se crea y la sesión es nula", () => {
    expect(crearServicioDeAutenticacion(null).obtenerSesion()).toBeNull();
  });

  test("el módulo exporta el servicio ya compuesto", () => {
    expect(typeof autenticacion.ingresar).toBe("function");
    expect(autenticacion.obtenerSesion()).toBeNull();
  });
});

describe("obtenerAlmacenamientoDelNavegador", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  test("fuera de un navegador devuelve null", () => {
    expect(obtenerAlmacenamientoDelNavegador()).toBeNull();
  });

  test("devuelve el almacenamiento de la ventana", () => {
    const storage = crearStorage();
    Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
    expect(obtenerAlmacenamientoDelNavegador()).toBe(storage);
  });

  test("si el acceso está bloqueado devuelve null en lugar de lanzar", () => {
    const ventana = {};
    Object.defineProperty(ventana, "localStorage", {
      get: () => {
        throw new Error("Acceso al almacenamiento bloqueado");
      },
    });
    Object.defineProperty(globalThis, "window", { value: ventana, configurable: true });
    expect(obtenerAlmacenamientoDelNavegador()).toBeNull();
  });
});

describe("composición de orígenes de datos (Catálogo sobre la API, gestión local)", () => {
  const encabezados = { "content-type": "application/json" };

  function simularFetch(): ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>> {
    const rutas: Record<string, unknown> = {
      "/api/libros/?limit=100&offset=0": listadoDeLibros,
      "/api/libros/1": detalleDelLibro1,
      "/api/libros/2": detalleDelLibro2,
    };
    const falso = vi.fn(async (url: string, _init?: RequestInit) =>
      Object.hasOwn(rutas, url)
        ? new Response(JSON.stringify(rutas[url]), { status: 200, headers: encabezados })
        : new Response(JSON.stringify({ detail: "Libro no encontrado" }), { status: 404, headers: encabezados }),
    );
    vi.stubGlobal("fetch", falso);
    return falso;
  }

  async function importarProveedor(): Promise<typeof import("../../src/datos/proveedor")> {
    vi.resetModules();
    return import("../../src/datos/proveedor");
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("importar el proveedor no hace ninguna solicitud", async () => {
    const falso = simularFetch();
    await importarProveedor();
    expect(falso).not.toHaveBeenCalled();
  });

  test("repositorioCatalogo.listar pide el listado y el detalle de cada libro a /api", async () => {
    const falso = simularFetch();
    const { repositorioCatalogo } = await importarProveedor();

    const libros = await repositorioCatalogo.listar();

    expect(falso.mock.calls.map((llamada) => llamada[0])).toEqual([
      "/api/libros/?limit=100&offset=0",
      "/api/libros/1",
      "/api/libros/2",
    ]);
    expect(new Set(falso.mock.calls.map((llamada) => llamada[1]?.method))).toEqual(new Set(["GET"]));
    expect(libros.map((libro) => libro.titulo)).toEqual(["Rayuela", "Ficciones"]);
    expect(libros[0]?.autores[0]?.nombre).toBe("Julio Cortázar");
    expect(libros[0]?.precio).toBe("25000.00");
  });

  test("la base de las solicitudes sale de VITE_API_BASE y, si falta, es /api", async () => {
    const falso = simularFetch();
    vi.stubEnv("VITE_API_BASE", "/servicio/");
    const { repositorioCatalogo } = await importarProveedor();
    await repositorioCatalogo.listar().catch(() => undefined);
    expect(falso.mock.calls[0]?.[0]).toBe("/servicio/libros/?limit=100&offset=0");
  });

  test("repositorioCatalogo es solo de lectura", async () => {
    simularFetch();
    const { repositorioCatalogo } = await importarProveedor();
    expect(Object.keys(repositorioCatalogo).sort()).toEqual(["listar", "obtener"]);
  });

  test("repositorioLibros sigue entregando los seis libros de ejemplo del almacén local, sin llamar a fetch", async () => {
    const falso = simularFetch();
    const { repositorioLibros } = await importarProveedor();

    const libros = await repositorioLibros.listar();

    expect(libros).toHaveLength(6);
    expect(libros.map((libro) => libro.titulo)).toEqual(datosIniciales.libros.map((libro) => libro.titulo));
    expect(falso).not.toHaveBeenCalled();
  });

  test("los demás repositorios de gestión tampoco usan la red", async () => {
    const falso = simularFetch();
    const proveedor = await importarProveedor();
    await proveedor.repositorioClientes.listar();
    await proveedor.repositorioEditoriales.listar();
    await proveedor.repositorioGeneros.listar();
    await proveedor.repositorioAutores.listar();
    expect(falso).not.toHaveBeenCalled();
  });
});
