import { describe, expect, test, vi } from "vitest";
import { crearClienteHttp } from "../../../src/datos/api/cliente-http";
import type { Solicitar } from "../../../src/datos/api/cliente-http";
import { ErrorDeApi } from "../../../src/datos/api/errores-api";
import { crearRepositoriosApi } from "../../../src/datos/api/repositorios-api";
import { listadoDeEditoriales, listadoDeGeneros } from "../../fixtures/api/catalogos";
import { detalleDelLibro1, detalleDelLibro2, listadoDeLibros } from "../../fixtures/api/libros";
import {
  altaDeCliente,
  altaDeVenta,
  clienteCreado,
  detalleDelAutor1,
  detalleDelAutor5,
  detalleDelCliente2SinPerfil,
  libroCreado,
  perfilCreado,
  ventaCreada,
} from "../../fixtures/api/escrituras";
import { detalleDelCliente1, listadoDeVentas } from "../../fixtures/api/ventas";

interface Llamada {
  url: string;
  metodo: string | undefined;
}

/** Cliente sobre una `solicitar` simulada: responde por dirección exacta y registra cada llamada. */
function crearEscenario(rutas: Record<string, unknown>) {
  const llamadas: Llamada[] = [];
  const solicitar = vi.fn<Solicitar>(async (url, init) => {
    llamadas.push({ url, metodo: init.method });
    if (Object.hasOwn(rutas, url)) {
      return new Response(JSON.stringify(rutas[url]), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ detail: "Libro no encontrado" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  });
  const repositorios = crearRepositoriosApi(crearClienteHttp({ base: "/api", solicitar }));
  return { repositorios, llamadas, urls: (): string[] => llamadas.map((l) => l.url) };
}

const rutasBase = {
  "/api/libros/?limit=100&offset=0": listadoDeLibros,
  "/api/libros/1": detalleDelLibro1,
  "/api/libros/2": detalleDelLibro2,
};

describe("libros.listar", () => {
  test("recorre el listado y completa cada libro con su detalle, en orden y con el precio como texto", async () => {
    const { repositorios, urls } = crearEscenario(rutasBase);

    const libros = await repositorios.libros.listar();

    expect(urls()).toEqual(["/api/libros/?limit=100&offset=0", "/api/libros/1", "/api/libros/2"]);
    expect(libros).toEqual([detalleDelLibro1, detalleDelLibro2]);
    expect(libros.map((l) => l.id)).toEqual([1, 2]);
    expect(libros[0]?.precio).toBe("25000.00");
    expect(libros[1]?.precio).toBe("18000.00");
    expect(libros[0]?.autores).toEqual([{ autor_id: 1, nombre: "Julio Cortázar", rol: "autor", orden: 1 }]);
    expect(libros[1]?.autores).toEqual([{ autor_id: 5, nombre: "Jorge Luis Borges", rol: "autor", orden: 1 }]);
  });

  test("con título envía titulo en la consulta", async () => {
    const { repositorios, urls } = crearEscenario({
      "/api/libros/?limit=100&offset=0&titulo=ray": [listadoDeLibros[0]],
      "/api/libros/1": detalleDelLibro1,
    });
    const libros = await repositorios.libros.listar({ titulo: "ray" });
    expect(urls()).toEqual(["/api/libros/?limit=100&offset=0&titulo=ray", "/api/libros/1"]);
    expect(libros).toEqual([detalleDelLibro1]);
  });

  test("con genero_id lo envía en la consulta", async () => {
    const { repositorios, urls } = crearEscenario({
      "/api/libros/?limit=100&offset=0&genero_id=3": [listadoDeLibros[1]],
      "/api/libros/2": detalleDelLibro2,
    });
    await repositorios.libros.listar({ genero_id: 3 });
    expect(urls()).toEqual(["/api/libros/?limit=100&offset=0&genero_id=3", "/api/libros/2"]);
  });

  test("con limit y offset pide solo esa página, con esos valores", async () => {
    const { repositorios, urls } = crearEscenario({
      "/api/libros/?limit=2&offset=0": listadoDeLibros,
      "/api/libros/1": detalleDelLibro1,
      "/api/libros/2": detalleDelLibro2,
    });
    const libros = await repositorios.libros.listar({ limit: 2, offset: 0 });
    expect(urls()).toEqual(["/api/libros/?limit=2&offset=0", "/api/libros/1", "/api/libros/2"]);
    expect(libros).toHaveLength(2);
  });

  test("con solo offset pide una página explícita, sin recorrer las siguientes", async () => {
    const { repositorios, urls } = crearEscenario({ "/api/libros/?offset=100": [] });
    expect(await repositorios.libros.listar({ offset: 100 })).toEqual([]);
    expect(urls()).toEqual(["/api/libros/?offset=100"]);
  });

  test("listado vacío: lista vacía sin pedir detalles", async () => {
    const { repositorios, urls } = crearEscenario({ "/api/libros/?limit=100&offset=0": [] });
    expect(await repositorios.libros.listar()).toEqual([]);
    expect(urls()).toEqual(["/api/libros/?limit=100&offset=0"]);
  });

  test("un detalle que responde 404 rechaza el listado con el mensaje de esa consulta", async () => {
    const { repositorios } = crearEscenario({
      "/api/libros/?limit=100&offset=0": listadoDeLibros,
      "/api/libros/1": detalleDelLibro1,
    });
    const error = await repositorios.libros.listar().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).message).toBe("Libro no encontrado");
    expect((error as ErrorDeApi).estado).toBe(404);
  });

  test("un listado que no es un arreglo es un error de formato", async () => {
    const { repositorios, urls } = crearEscenario({ "/api/libros/?limit=100&offset=0": { items: [] } });
    const error = await repositorios.libros.listar().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).tipo).toBe("formato");
    expect((error as ErrorDeApi).message).toBe("La respuesta del servidor no tiene el formato esperado.");
    expect(urls()).toEqual(["/api/libros/?limit=100&offset=0"]);
  });

  test("10 libros: nunca más de 4 detalles en curso y 10 consultas de detalle en total", async () => {
    const listado = Array.from({ length: 10 }, (_, i) => ({ ...listadoDeLibros[0], id: i + 1 }));
    let enCurso = 0;
    let maximo = 0;
    let detalles = 0;
    const solicitar = vi.fn<Solicitar>(async (url) => {
      const encabezados = { "content-type": "application/json" };
      if (url.startsWith("/api/libros/?")) return new Response(JSON.stringify(listado), { status: 200, headers: encabezados });
      detalles += 1;
      enCurso += 1;
      maximo = Math.max(maximo, enCurso);
      await new Promise((resolver) => setTimeout(resolver, 0));
      enCurso -= 1;
      const id = Number(url.slice("/api/libros/".length));
      return new Response(JSON.stringify({ ...detalleDelLibro1, id }), { status: 200, headers: encabezados });
    });
    const { libros } = crearRepositoriosApi(crearClienteHttp({ base: "/api", solicitar }));

    const entregados = await libros.listar();

    expect(maximo).toBe(4);
    expect(detalles).toBe(10);
    expect(entregados.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("todas las solicitudes registradas usan GET", async () => {
    const { repositorios, llamadas } = crearEscenario({
      ...rutasBase,
      "/api/editoriales/?limit=100&offset=0": listadoDeEditoriales,
      "/api/generos/?limit=100&offset=0": listadoDeGeneros,
    });
    await repositorios.libros.listar();
    await repositorios.libros.obtener(1);
    await repositorios.editoriales.listar();
    await repositorios.generos.listar();
    expect(llamadas.length).toBeGreaterThanOrEqual(6);
    expect(new Set(llamadas.map((l) => l.metodo))).toEqual(new Set(["GET"]));
  });
});

describe("libros.obtener", () => {
  test("pide GET /libros/{id} y entrega el detalle", async () => {
    const { repositorios, urls } = crearEscenario(rutasBase);
    expect(await repositorios.libros.obtener(1)).toEqual(detalleDelLibro1);
    expect(urls()).toEqual(["/api/libros/1"]);
  });

  test("un libro inexistente rechaza con el mensaje de la API", async () => {
    const { repositorios } = crearEscenario(rutasBase);
    await expect(repositorios.libros.obtener(99)).rejects.toThrow("Libro no encontrado");
  });

  test("una respuesta que no es un objeto es un error de formato", async () => {
    const { repositorios } = crearEscenario({ "/api/libros/1": [detalleDelLibro1] });
    const error = await repositorios.libros.obtener(1).catch((e: unknown) => e);
    expect((error as ErrorDeApi).tipo).toBe("formato");
  });

  test("ofrece listar, obtener y el alta, y ninguna edición ni borrado", () => {
    const { repositorios } = crearEscenario(rutasBase);
    expect(Object.keys(repositorios.libros).sort()).toEqual(["crear", "listar", "obtener"]);
  });
});

describe("editoriales y géneros", () => {
  test("editoriales.listar recorre /api/editoriales/", async () => {
    const { repositorios, urls } = crearEscenario({ "/api/editoriales/?limit=100&offset=0": listadoDeEditoriales });
    expect(await repositorios.editoriales.listar()).toEqual(listadoDeEditoriales);
    expect(urls()).toEqual(["/api/editoriales/?limit=100&offset=0"]);
  });

  test("generos.listar recorre /api/generos/", async () => {
    const { repositorios, urls } = crearEscenario({ "/api/generos/?limit=100&offset=0": listadoDeGeneros });
    expect(await repositorios.generos.listar()).toEqual(listadoDeGeneros);
    expect(urls()).toEqual(["/api/generos/?limit=100&offset=0"]);
  });

  test("con 100 géneros pide también la segunda página", async () => {
    const cien = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, nombre: `Género ${i + 1}` }));
    const { repositorios, urls } = crearEscenario({
      "/api/generos/?limit=100&offset=0": cien,
      "/api/generos/?limit=100&offset=100": [],
    });
    expect(await repositorios.generos.listar()).toHaveLength(100);
    expect(urls()).toEqual(["/api/generos/?limit=100&offset=0", "/api/generos/?limit=100&offset=100"]);
  });

  test("un listado que no es un arreglo es un error de formato", async () => {
    const { repositorios } = crearEscenario({ "/api/editoriales/?limit=100&offset=0": { detail: "x" } });
    const error = await repositorios.editoriales.listar().catch((e: unknown) => e);
    expect((error as ErrorDeApi).tipo).toBe("formato");
  });
});

// ---------------------------------------------------------------------------
// Altas, detalles por identificador y sondeo (operaciones-contra-api)
// ---------------------------------------------------------------------------

interface LlamadaCompleta {
  metodo: string;
  url: string;
  cuerpo: unknown;
  cabeceras: unknown;
}

interface RespuestaDeRuta {
  estado?: number;
  cuerpo: unknown;
}

/**
 * Cliente sobre una `solicitar` simulada que responde por «MÉTODO dirección» y
 * registra método, dirección, cuerpo y cabeceras de cada llamada. Lo no
 * declarado responde 404.
 */
function crearEscenarioCompleto(rutas: Record<string, RespuestaDeRuta | (() => Promise<Response>)>) {
  const llamadas: LlamadaCompleta[] = [];
  const solicitar = vi.fn<Solicitar>(async (url, init) => {
    const metodo = init.method ?? "GET";
    llamadas.push({
      metodo,
      url,
      cuerpo: typeof init.body === "string" ? (JSON.parse(init.body) as unknown) : undefined,
      cabeceras: init.headers,
    });
    const ruta = rutas[`${metodo} ${url}`];
    if (typeof ruta === "function") return ruta();
    if (ruta !== undefined) {
      return new Response(JSON.stringify(ruta.cuerpo), {
        status: ruta.estado ?? 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ detail: "No encontrado" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  });
  const repositorios = crearRepositoriosApi(crearClienteHttp({ base: "/api", solicitar }));
  return {
    repositorios,
    solicitar,
    llamadas,
    urls: (): string[] => llamadas.map((l) => `${l.metodo} ${l.url}`),
    escrituras: (): LlamadaCompleta[] => llamadas.filter((l) => l.metodo !== "GET"),
  };
}

const respuesta = (cuerpo: unknown, estado = 200): RespuestaDeRuta => ({ cuerpo, estado });
const rangoDeIds = (desde: number, hasta: number): number[] =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

describe("clientes.obtener y clientes.listar (sondeo)", () => {
  test("obtener pide GET /clientes/{id} y entrega el cliente con su perfil", async () => {
    const { repositorios, urls } = crearEscenarioCompleto({ "GET /api/clientes/1": respuesta(detalleDelCliente1) });
    expect(await repositorios.clientes.obtener(1)).toEqual(detalleDelCliente1);
    expect(urls()).toEqual(["GET /api/clientes/1"]);
  });

  test("obtener un cliente inexistente rechaza con el mensaje de la API y el estado 404", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "GET /api/clientes/9": respuesta({ detail: "Cliente no encontrado" }, 404),
    });
    const error = await repositorios.clientes.obtener(9).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).message).toBe("Cliente no encontrado");
    expect((error as ErrorDeApi).estado).toBe(404);
  });

  test("obtener rechaza una respuesta que no es un objeto como error de formato", async () => {
    const { repositorios } = crearEscenarioCompleto({ "GET /api/clientes/1": respuesta([]) });
    const error = await repositorios.clientes.obtener(1).catch((e: unknown) => e);
    expect((error as ErrorDeApi).tipo).toBe("formato");
  });

  test("listar lee las ventas, sondea desde el 1 y se detiene tras 10 ausentes: clientes 1 y 2 en orden", async () => {
    const { repositorios, urls } = crearEscenarioCompleto({
      "GET /api/ventas/?limit=100&offset=0": respuesta(listadoDeVentas),
      "GET /api/clientes/1": respuesta(detalleDelCliente1),
      "GET /api/clientes/2": respuesta(detalleDelCliente2SinPerfil),
    });
    const clientes = await repositorios.clientes.listar();
    expect(clientes).toEqual([detalleDelCliente1, detalleDelCliente2SinPerfil]);
    const consultas = urls();
    expect(consultas[0]).toBe("GET /api/ventas/?limit=100&offset=0");
    expect(consultas.slice(1).sort()).toEqual(rangoDeIds(1, 12).map((id) => `GET /api/clientes/${id}`).sort());
  });

  test("listar incluye al cliente que mencionan las ventas aunque haya un hueco largo", async () => {
    const cliente25 = { ...detalleDelCliente1, id: 25, perfil: null };
    const venta = { ...listadoDeVentas[0], cliente: { id: 25, nombre: "Ana Gómez", email: "ana@example.com" } };
    const { repositorios, urls } = crearEscenarioCompleto({
      "GET /api/ventas/?limit=100&offset=0": respuesta([venta]),
      "GET /api/clientes/1": respuesta(detalleDelCliente1),
      "GET /api/clientes/25": respuesta(cliente25),
    });
    const clientes = await repositorios.clientes.listar();
    expect(clientes.map((c) => c.id)).toEqual([1, 25]);
    expect(urls()).toContain("GET /api/clientes/25");
    expect(urls()).not.toContain("GET /api/clientes/36");
  });

  test("listar sin ventas ni clientes entrega una lista vacía tras 10 ausentes", async () => {
    const { repositorios, urls } = crearEscenarioCompleto({ "GET /api/ventas/?limit=100&offset=0": respuesta([]) });
    expect(await repositorios.clientes.listar()).toEqual([]);
    expect(urls()).toHaveLength(11);
  });

  test("listar con una falla 500 en el sondeo rechaza con su mensaje y no entrega un listado parcial", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "GET /api/ventas/?limit=100&offset=0": respuesta([]),
      "GET /api/clientes/1": respuesta(detalleDelCliente1),
      "GET /api/clientes/2": respuesta({ detail: "Error interno" }, 500),
    });
    const error = await repositorios.clientes.listar().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).estado).toBe(500);
    expect((error as ErrorDeApi).message).toBe("Error interno");
  });
});

describe("autores.listar (sondeo)", () => {
  const rutasDeLibros = {
    "GET /api/libros/?limit=100&offset=0": respuesta(listadoDeLibros),
    "GET /api/libros/1": respuesta(detalleDelLibro1),
    "GET /api/libros/2": respuesta(detalleDelLibro2),
  };

  test("lee los libros, sondea los autores por identificador y los entrega en orden", async () => {
    const { repositorios, urls } = crearEscenarioCompleto({
      ...rutasDeLibros,
      "GET /api/autores/1": respuesta(detalleDelAutor1),
      "GET /api/autores/5": respuesta(detalleDelAutor5),
    });
    const autores = await repositorios.autores.listar();
    expect(autores).toEqual([detalleDelAutor1, detalleDelAutor5]);
    const consultasDeAutores = urls().filter((u) => u.startsWith("GET /api/autores/"));
    expect(consultasDeAutores.sort()).toEqual(rangoDeIds(1, 15).map((id) => `GET /api/autores/${id}`).sort());
  });

  test("no se detiene antes del autor que menciona el detalle de un libro", async () => {
    const libroConAutor7 = {
      ...detalleDelLibro2,
      autores: [{ autor_id: 7, nombre: "Ana María Shua", rol: "autor", orden: 1 }],
    };
    const { repositorios, urls } = crearEscenarioCompleto({
      ...rutasDeLibros,
      "GET /api/libros/2": respuesta(libroConAutor7),
      "GET /api/autores/1": respuesta(detalleDelAutor1),
      "GET /api/autores/7": respuesta({ id: 7, nombre: "Ana María Shua", nacionalidad: "Argentina" }),
    });
    const autores = await repositorios.autores.listar();
    expect(autores.map((a) => a.id)).toEqual([1, 7]);
    expect(urls()).toContain("GET /api/autores/7");
  });

  test("una falla al leer los libros rechaza el listado de autores sin sondear", async () => {
    const { repositorios, urls } = crearEscenarioCompleto({
      "GET /api/libros/?limit=100&offset=0": respuesta({ detail: "Error interno" }, 500),
    });
    await expect(repositorios.autores.listar()).rejects.toBeInstanceOf(ErrorDeApi);
    expect(urls().some((u) => u.includes("/autores/"))).toBe(false);
  });
});

describe("libros.crear", () => {
  const nuevo = {
    isbn: "978-950-00-0006-6",
    titulo: "El Aleph",
    precio: 21500.5,
    stock: 3,
    editorial_id: 1,
    genero_id: 3,
    autores: [
      { autor_id: 5, rol: "autor", orden: 1 },
      { autor_id: 1, rol: "ilustrador", orden: 2 },
    ],
  } as const;

  test("envía POST /libros/ con el precio como texto de dos decimales, stock y autores con rol y orden", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({
      "POST /api/libros/": respuesta(libroCreado, 201),
    });
    const libro = await repositorios.libros.crear({ ...nuevo, autores: [...nuevo.autores] });

    const [llamada] = escrituras();
    expect(escrituras()).toHaveLength(1);
    expect(llamada?.metodo).toBe("POST");
    expect(llamada?.url).toBe("/api/libros/");
    expect(llamada?.cabeceras).toEqual({ Accept: "application/json", "Content-Type": "application/json" });
    expect(llamada?.cuerpo).toEqual({
      isbn: "978-950-00-0006-6",
      titulo: "El Aleph",
      precio: "21500.50",
      stock: 3,
      editorial_id: 1,
      genero_id: 3,
      autores: [
        { autor_id: 5, rol: "autor", orden: 1 },
        { autor_id: 1, rol: "ilustrador", orden: 2 },
      ],
    });
    // Se entrega lo que devolvió la API, no lo enviado.
    expect(libro).toEqual(libroCreado);
    expect(libro.id).toBe(6);
  });

  test.each([
    [1500, "1500.00"],
    ["1500", "1500.00"],
    ["1500.5", "1500.50"],
    [1000.005, "1000.01"],
    ["0.005", "0.01"],
    [99999999.99, "99999999.99"],
  ])("el precio %s se envía como %s (redondeo al centavo, mitades hacia arriba)", async (precio, esperado) => {
    const { repositorios, escrituras } = crearEscenarioCompleto({ "POST /api/libros/": respuesta(libroCreado, 201) });
    await repositorios.libros.crear({ isbn: "x", titulo: "t", precio, stock: 0, editorial_id: 1 });
    expect((escrituras()[0]?.cuerpo as { precio: string }).precio).toBe(esperado);
  });

  test("sin género ni autores envía genero_id null y autores vacío", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({ "POST /api/libros/": respuesta(libroCreado, 201) });
    await repositorios.libros.crear({ isbn: "x", titulo: "t", precio: "10", stock: 0, editorial_id: 1 });
    expect(escrituras()[0]?.cuerpo).toEqual({
      isbn: "x",
      titulo: "t",
      precio: "10.00",
      stock: 0,
      editorial_id: 1,
      genero_id: null,
      autores: [],
    });
  });

  test("un precio que no es un importe utilizable se rechaza sin enviar nada", async () => {
    const { repositorios, solicitar } = crearEscenarioCompleto({});
    for (const precio of [-1, "abc", Number.NaN, "1,5"]) {
      await expect(
        repositorios.libros.crear({ isbn: "x", titulo: "t", precio, stock: 0, editorial_id: 1 }),
      ).rejects.toThrow("El precio no es un importe válido.");
    }
    expect(solicitar).not.toHaveBeenCalled();
  });

  test("un 409 rechaza con el mensaje del servidor y una sola solicitud", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({
      "POST /api/libros/": respuesta({ detail: "No se pudo crear el libro: ISBN repetido o referencias invalidas" }, 409),
    });
    const error = await repositorios.libros.crear({ ...nuevo, autores: [] }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).estado).toBe(409);
    expect((error as ErrorDeApi).resultadoIncierto).toBe(false);
    expect(escrituras()).toHaveLength(1);
  });

  test("un 422 conserva los errores por campo", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "POST /api/libros/": respuesta({ detail: [{ type: "missing", loc: ["body", "stock"], msg: "Field required" }] }, 422),
    });
    const error = await repositorios.libros.crear({ ...nuevo, autores: [] }).catch((e: unknown) => e);
    expect((error as ErrorDeApi).errores).toEqual([{ campo: "stock", mensaje: "Field required" }]);
  });

  test("sin respuesta: resultado incierto y una sola solicitud", async () => {
    const { repositorios, solicitar } = crearEscenarioCompleto({
      "POST /api/libros/": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    const error = await repositorios.libros.crear({ ...nuevo, autores: [] }).catch((e: unknown) => e);
    expect((error as ErrorDeApi).resultadoIncierto).toBe(true);
    expect(solicitar).toHaveBeenCalledTimes(1);
  });
});

describe("clientes.crear y clientes.crearPerfil", () => {
  test("crear envía POST /clientes/ solo con nombre y email y entrega el cliente del servidor", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({ "POST /api/clientes/": respuesta(clienteCreado, 201) });
    const cliente = await repositorios.clientes.crear({ ...altaDeCliente, extra: "no" } as typeof altaDeCliente);
    expect(escrituras()).toHaveLength(1);
    expect(escrituras()[0]?.url).toBe("/api/clientes/");
    expect(escrituras()[0]?.cuerpo).toEqual({ nombre: "Ana Gómez", email: "ana@example.com" });
    expect(cliente).toEqual(clienteCreado);
  });

  test("crear con email repetido (409) rechaza con el mensaje de la API", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "POST /api/clientes/": respuesta({ detail: "Ya existe un cliente con ese email" }, 409),
    });
    const error = await repositorios.clientes.crear(altaDeCliente).catch((e: unknown) => e);
    expect((error as ErrorDeApi).message).toBe("Ya existe un cliente con ese email");
    expect((error as ErrorDeApi).estado).toBe(409);
  });

  test("crear sin respuesta: resultado incierto y una sola solicitud", async () => {
    const { repositorios, solicitar } = crearEscenarioCompleto({
      "POST /api/clientes/": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    const error = await repositorios.clientes.crear(altaDeCliente).catch((e: unknown) => e);
    expect((error as ErrorDeApi).resultadoIncierto).toBe(true);
    expect(solicitar).toHaveBeenCalledTimes(1);
  });

  test("crearPerfil envía POST /clientes/{id}/perfil y entrega el perfil del servidor", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({
      "POST /api/clientes/4/perfil": respuesta(perfilCreado, 201),
    });
    const perfil = await repositorios.clientes.crearPerfil(4, { telefono: "+54 11 5555-0104", direccion: "Calle 1" });
    expect(escrituras()[0]?.url).toBe("/api/clientes/4/perfil");
    expect(escrituras()[0]?.cuerpo).toEqual({ telefono: "+54 11 5555-0104", direccion: "Calle 1" });
    expect(perfil).toEqual(perfilCreado);
  });

  test.each([[""], ["   "], [undefined], [null]])("una dirección vacía (%j) se envía como null", async (direccion) => {
    const { repositorios, escrituras } = crearEscenarioCompleto({
      "POST /api/clientes/4/perfil": respuesta(perfilCreado, 201),
    });
    await repositorios.clientes.crearPerfil(4, { telefono: "1155550104", direccion });
    expect(escrituras()[0]?.cuerpo).toEqual({ telefono: "1155550104", direccion: null });
  });

  test("crearPerfil con 409 «El cliente ya tiene un perfil» rechaza con ese mensaje", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "POST /api/clientes/1/perfil": respuesta({ detail: "El cliente ya tiene un perfil" }, 409),
    });
    const error = await repositorios.clientes.crearPerfil(1, { telefono: "1155550101" }).catch((e: unknown) => e);
    expect((error as ErrorDeApi).message).toBe("El cliente ya tiene un perfil");
    expect((error as ErrorDeApi).estado).toBe(409);
  });
});

describe("ventas.crear y ventas.listar", () => {
  test("crear envía POST /ventas/ solo con cliente_id y renglones (libro_id y cantidad) y entrega la venta del servidor sin recalcular", async () => {
    const { repositorios, escrituras } = crearEscenarioCompleto({ "POST /api/ventas/": respuesta(ventaCreada, 201) });
    const venta = await repositorios.ventas.crear({
      ...altaDeVenta,
      renglones: altaDeVenta.renglones.map((r) => ({ ...r, precio_unitario: "1.00" })),
    } as typeof altaDeVenta);

    expect(escrituras()).toHaveLength(1);
    expect(escrituras()[0]?.url).toBe("/api/ventas/");
    expect(escrituras()[0]?.cuerpo).toEqual({
      cliente_id: 2,
      renglones: [
        { libro_id: 1, cantidad: 2 },
        { libro_id: 4, cantidad: 1 },
      ],
    });
    expect(venta).toEqual(ventaCreada);
    expect(venta.total).toBe("77000.00");
    expect(venta.renglones[0]?.subtotal).toBe("50000.00");
  });

  test("crear con 409 rechaza con el mensaje del servidor", async () => {
    const { repositorios } = crearEscenarioCompleto({
      "POST /api/ventas/": respuesta({ detail: "No se pudo registrar la venta: cliente o libros invalidos" }, 409),
    });
    const error = await repositorios.ventas.crear(altaDeVenta).catch((e: unknown) => e);
    expect((error as ErrorDeApi).message).toBe("No se pudo registrar la venta: cliente o libros invalidos");
  });

  test("crear sin respuesta: resultado incierto y una sola solicitud", async () => {
    const { repositorios, solicitar } = crearEscenarioCompleto({
      "POST /api/ventas/": () => Promise.reject(new TypeError("Failed to fetch")),
    });
    const error = await repositorios.ventas.crear(altaDeVenta).catch((e: unknown) => e);
    expect((error as ErrorDeApi).resultadoIncierto).toBe(true);
    expect(solicitar).toHaveBeenCalledTimes(1);
  });

  test("listar recorre todas las páginas de 100 en orden", async () => {
    const venta = (id: number) => ({ ...listadoDeVentas[0], id });
    const { repositorios, urls } = crearEscenarioCompleto({
      "GET /api/ventas/?limit=100&offset=0": respuesta(rangoDeIds(1, 100).map(venta)),
      "GET /api/ventas/?limit=100&offset=100": respuesta(rangoDeIds(101, 105).map(venta)),
    });
    const ventas = await repositorios.ventas.listar();
    expect(urls()).toEqual(["GET /api/ventas/?limit=100&offset=0", "GET /api/ventas/?limit=100&offset=100"]);
    expect(ventas).toHaveLength(105);
    expect(ventas.map((v) => v.id)).toEqual(rangoDeIds(1, 105));
  });

  test("listar entrega los importes tal como los guarda el servidor", async () => {
    const { repositorios } = crearEscenarioCompleto({ "GET /api/ventas/?limit=100&offset=0": respuesta(listadoDeVentas) });
    const [venta] = await repositorios.ventas.listar();
    expect(venta?.total).toBe("18000.00");
    expect(venta?.renglones[0]).toEqual(listadoDeVentas[0]?.renglones[0]);
  });

  test("listar rechaza una página que no es un arreglo como error de formato", async () => {
    const { repositorios } = crearEscenarioCompleto({ "GET /api/ventas/?limit=100&offset=0": respuesta({ items: [] }) });
    const error = await repositorios.ventas.listar().catch((e: unknown) => e);
    expect((error as ErrorDeApi).tipo).toBe("formato");
  });
});

describe("el acceso a la API usa solo GET y POST", () => {
  test("ninguna operación de los repositorios envía PUT, PATCH ni DELETE", async () => {
    const todo = crearEscenarioCompleto({
      "GET /api/ventas/?limit=100&offset=0": respuesta([]),
      "GET /api/libros/?limit=100&offset=0": respuesta([]),
      "GET /api/editoriales/?limit=100&offset=0": respuesta([]),
      "GET /api/generos/?limit=100&offset=0": respuesta([]),
      "GET /api/clientes/1": respuesta(detalleDelCliente1),
      "POST /api/libros/": respuesta(libroCreado, 201),
      "POST /api/clientes/": respuesta(clienteCreado, 201),
      "POST /api/clientes/4/perfil": respuesta(perfilCreado, 201),
      "POST /api/ventas/": respuesta(ventaCreada, 201),
    });
    const r = todo.repositorios;
    await r.libros.listar();
    await r.editoriales.listar();
    await r.generos.listar();
    await r.autores.listar();
    await r.clientes.listar();
    await r.ventas.listar();
    await r.libros.crear({ isbn: "x", titulo: "t", precio: "1", stock: 0, editorial_id: 1 });
    await r.clientes.crear(altaDeCliente);
    await r.clientes.crearPerfil(4, { telefono: "1155550104" });
    await r.ventas.crear(altaDeVenta);
    expect(new Set(todo.llamadas.map((l) => l.metodo))).toEqual(new Set(["GET", "POST"]));
  });
});
