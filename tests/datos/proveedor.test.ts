import { afterEach, describe, expect, test, vi } from "vitest";
import { obtenerAlmacenamientoDelNavegador } from "../../src/datos/local/almacen-local";
import { autenticacion, crearServicioDeAutenticacion } from "../../src/datos/proveedor";
import { listadoDeEditoriales, listadoDeGeneros } from "../fixtures/api/catalogos";
import {
  altaDeCliente,
  altaDeVenta,
  clienteCreado,
  detalleDelAutor1,
  detalleDelAutor5,
  libroCreado,
  perfilCreado,
  ventaCreada,
} from "../fixtures/api/escrituras";
import { detalleDelLibro1, detalleDelLibro2, listadoDeLibros } from "../fixtures/api/libros";
import { detalleDelCliente1, listadoDeVentas } from "../fixtures/api/ventas";

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

describe("composición: todos los repositorios sobre la API", () => {
  const encabezados = { "content-type": "application/json" };

  interface Llamada {
    metodo: string;
    url: string;
  }

  /** `fetch` simulado: responde por «MÉTODO url» y registra cada llamada; lo demás es 404. */
  function simularFetch() {
    const rutas: Record<string, { estado: number; cuerpo: unknown }> = {
      "GET /api/libros/?limit=100&offset=0": { estado: 200, cuerpo: listadoDeLibros },
      "GET /api/libros/1": { estado: 200, cuerpo: detalleDelLibro1 },
      "GET /api/libros/2": { estado: 200, cuerpo: detalleDelLibro2 },
      "GET /api/editoriales/?limit=100&offset=0": { estado: 200, cuerpo: listadoDeEditoriales },
      "GET /api/generos/?limit=100&offset=0": { estado: 200, cuerpo: listadoDeGeneros },
      "GET /api/autores/1": { estado: 200, cuerpo: detalleDelAutor1 },
      "GET /api/autores/5": { estado: 200, cuerpo: detalleDelAutor5 },
      "GET /api/ventas/?limit=100&offset=0": { estado: 200, cuerpo: listadoDeVentas },
      "GET /api/clientes/1": { estado: 200, cuerpo: detalleDelCliente1 },
      "POST /api/libros/": { estado: 201, cuerpo: libroCreado },
      "POST /api/clientes/": { estado: 201, cuerpo: clienteCreado },
      "POST /api/clientes/4/perfil": { estado: 201, cuerpo: perfilCreado },
      "POST /api/ventas/": { estado: 201, cuerpo: ventaCreada },
    };
    const llamadas: Llamada[] = [];
    const falso = vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? "GET";
      llamadas.push({ metodo, url });
      const ruta = rutas[`${metodo} ${url}`];
      return ruta === undefined
        ? new Response(JSON.stringify({ detail: "No encontrado" }), { status: 404, headers: encabezados })
        : new Response(JSON.stringify(ruta.cuerpo), { status: ruta.estado, headers: encabezados });
    });
    vi.stubGlobal("fetch", falso);
    return { falso, llamadas, firmas: (): string[] => llamadas.map((l) => `${l.metodo} ${l.url}`) };
  }

  async function importarProveedor(): Promise<typeof import("../../src/datos/proveedor")> {
    vi.resetModules();
    return import("../../src/datos/proveedor");
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(globalThis, "window");
  });

  test("importar el proveedor no hace ninguna solicitud", async () => {
    const { falso } = simularFetch();
    await importarProveedor();
    expect(falso).not.toHaveBeenCalled();
  });

  test("repositorioCatalogo.listar pide el listado y el detalle de cada libro a /api", async () => {
    const { falso, llamadas } = simularFetch();
    const { repositorioCatalogo } = await importarProveedor();

    const libros = await repositorioCatalogo.listar();

    expect(falso.mock.calls.map((llamada) => llamada[0])).toEqual([
      "/api/libros/?limit=100&offset=0",
      "/api/libros/1",
      "/api/libros/2",
    ]);
    expect(new Set(llamadas.map((llamada) => llamada.metodo))).toEqual(new Set(["GET"]));
    expect(libros.map((libro) => libro.titulo)).toEqual(["Rayuela", "Ficciones"]);
    expect(libros[0]?.autores[0]?.nombre).toBe("Julio Cortázar");
    expect(libros[0]?.precio).toBe("25000.00");
  });

  test("la base de las solicitudes sale de VITE_API_BASE y, si falta, es /api", async () => {
    const { falso } = simularFetch();
    vi.stubEnv("VITE_API_BASE", "/servicio/");
    const { repositorioCatalogo, repositorioLibros } = await importarProveedor();
    await repositorioCatalogo.listar().catch(() => undefined);
    await repositorioLibros.listar().catch(() => undefined);
    expect(falso.mock.calls[0]?.[0]).toBe("/servicio/libros/?limit=100&offset=0");
    expect(falso.mock.calls.every((llamada) => llamada[0].startsWith("/servicio/"))).toBe(true);
  });

  test("repositorioCatalogo es solo de lectura", async () => {
    simularFetch();
    const { repositorioCatalogo } = await importarProveedor();
    expect(Object.keys(repositorioCatalogo).sort()).toEqual(["listar", "obtener"]);
  });

  test("las lecturas de gestión van a /api y entregan lo que devuelve la API, no ejemplos locales", async () => {
    const { firmas } = simularFetch();
    const p = await importarProveedor();

    expect((await p.repositorioLibros.listar()).map((l) => l.titulo)).toEqual(["Rayuela", "Ficciones"]);
    expect((await p.repositorioEditoriales.listar()).map((e) => e.nombre)).toEqual(["Emecé", "Sudamericana"]);
    expect((await p.repositorioGeneros.listar()).map((g) => g.nombre)).toEqual(["Policial", "Novela"]);
    expect((await p.repositorioAutores.listar()).map((a) => a.id)).toEqual([1, 5]);
    expect((await p.repositorioClientes.listar()).map((c) => c.id)).toEqual([1]);
    expect((await p.repositorioVentas.listar()).map((v) => v.id)).toEqual([1]);

    expect(firmas()).toEqual(expect.arrayContaining([
      "GET /api/editoriales/?limit=100&offset=0",
      "GET /api/generos/?limit=100&offset=0",
      "GET /api/autores/1",
      "GET /api/clientes/1",
      "GET /api/ventas/?limit=100&offset=0",
    ]));
    expect(firmas().every((firma) => firma.includes(" /api/"))).toBe(true);
  });

  test("las altas de gestión se envían con POST a /api y entregan la respuesta del servidor", async () => {
    const { llamadas } = simularFetch();
    const p = await importarProveedor();

    const libro = await p.repositorioLibros.crear({ isbn: "x", titulo: "t", precio: "1", stock: 0, editorial_id: 1 });
    const cliente = await p.repositorioClientes.crear(altaDeCliente);
    const perfil = await p.repositorioClientes.crearPerfil(4, { telefono: "1155550104" });
    const venta = await p.repositorioVentas.crear(altaDeVenta);

    expect([libro, cliente, perfil, venta]).toEqual([libroCreado, clienteCreado, perfilCreado, ventaCreada]);
    expect(llamadas).toEqual([
      { metodo: "POST", url: "/api/libros/" },
      { metodo: "POST", url: "/api/clientes/" },
      { metodo: "POST", url: "/api/clientes/4/perfil" },
      { metodo: "POST", url: "/api/ventas/" },
    ]);
  });

  describe("las claves libreria.* del navegador", () => {
    const previas = {
      "libreria.libros": JSON.stringify([{ id: "lib-77", titulo: "Guardado" }]),
      "libreria.clientes": JSON.stringify([{ id: "cli-77", nombreCompleto: "Guardado" }]),
      "libreria.ventas": JSON.stringify([{ id: "ven-77" }]),
    };

    function instalarVentana(storage: StorageSimulado & { lecturas: string[] }): void {
      Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
    }

    function crearStorageEspiado(contenido: Record<string, string>): StorageSimulado & { lecturas: string[] } {
      const base = crearStorage(contenido);
      const lecturas: string[] = [];
      return {
        ...base,
        lecturas,
        getItem: (clave) => {
          lecturas.push(clave);
          return base.getItem(clave);
        },
        setItem: (clave, valor) => base.setItem(clave, valor),
      };
    }

    async function usarTodo(): Promise<void> {
      const p = await importarProveedor();
      await p.repositorioLibros.listar();
      await p.repositorioEditoriales.listar();
      await p.repositorioGeneros.listar();
      await p.repositorioAutores.listar();
      await p.repositorioClientes.listar();
      await p.repositorioVentas.listar();
      await p.repositorioLibros.crear({ isbn: "x", titulo: "t", precio: "1", stock: 0, editorial_id: 1 });
      await p.repositorioClientes.crear(altaDeCliente);
      await p.repositorioVentas.crear(altaDeVenta);
    }

    test("con claves de la versión anterior, ninguna se lee ni se escribe y su contenido queda intacto", async () => {
      simularFetch();
      const storage = crearStorageEspiado(previas);
      instalarVentana(storage);

      await usarTodo();

      expect(storage.lecturas.filter((clave) => clave.startsWith("libreria."))).toEqual([]);
      expect(storage.escrituras.filter((clave) => clave.startsWith("libreria."))).toEqual([]);
      for (const [clave, valor] of Object.entries(previas)) expect(storage.contenido[clave]).toBe(valor);
    });

    test("en un navegador sin datos anteriores no se crea ninguna clave libreria.*", async () => {
      simularFetch();
      const storage = crearStorageEspiado({});
      instalarVentana(storage);

      await usarTodo();

      expect(Object.keys(storage.contenido).filter((clave) => clave.startsWith("libreria."))).toEqual([]);
    });

    test("la sesión y los usuarios siguen en el navegador: users se siembra y no hay solicitudes por eso", async () => {
      const { falso } = simularFetch();
      const storage = crearStorageEspiado({});
      instalarVentana(storage);

      const p = await importarProveedor();

      expect(typeof p.autenticacion.ingresar).toBe("function");
      expect(storage.escrituras).toEqual(["users"]);
      expect(falso).not.toHaveBeenCalled();
    });
  });
});
