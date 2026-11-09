import { describe, expect, test, vi } from "vitest";
import { crearClienteHttp } from "../../../src/datos/api/cliente-http";
import type { Solicitar } from "../../../src/datos/api/cliente-http";
import { ErrorDeApi } from "../../../src/datos/api/errores-api";
import { crearRepositoriosApi } from "../../../src/datos/api/repositorios-api";
import { listadoDeEditoriales, listadoDeGeneros } from "../../fixtures/api/catalogos";
import { detalleDelLibro1, detalleDelLibro2, listadoDeLibros } from "../../fixtures/api/libros";

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

  test("no ofrece operaciones de escritura", () => {
    const { repositorios } = crearEscenario(rutasBase);
    expect(Object.keys(repositorios.libros).sort()).toEqual(["listar", "obtener"]);
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
