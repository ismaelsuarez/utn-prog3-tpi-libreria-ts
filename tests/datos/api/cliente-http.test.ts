import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { crearClienteHttp, TIEMPO_LIMITE_POR_DEFECTO_MS } from "../../../src/datos/api/cliente-http";
import { ErrorDeApi } from "../../../src/datos/api/errores-api";

type Solicitar = (url: string, init: RequestInit) => Promise<Response>;

function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "content-type": "application/json" },
  });
}

function solicitarCon(respuesta: Response | (() => Response)): ReturnType<typeof vi.fn<Solicitar>> {
  return vi.fn<Solicitar>(async () => (typeof respuesta === "function" ? respuesta() : respuesta));
}

async function falla(promesa: Promise<unknown>): Promise<ErrorDeApi> {
  try {
    await promesa;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorDeApi);
    return error as ErrorDeApi;
  }
  throw new Error("La operación debía rechazarse.");
}

describe("crearClienteHttp: dirección, método y cabeceras", () => {
  test("arma la dirección con la base, la ruta y los parámetros codificados, sin los undefined", async () => {
    const solicitar = solicitarCon(() => respuestaJson([]));
    const cliente = crearClienteHttp({ base: "/api", solicitar });

    await cliente.obtener("/libros/", { limit: 100, offset: 0, titulo: "río", genero_id: undefined });

    expect(solicitar).toHaveBeenCalledTimes(1);
    expect(solicitar.mock.calls[0]?.[0]).toBe("/api/libros/?limit=100&offset=0&titulo=r%C3%ADo");
  });

  test("sin parámetros no agrega signo de pregunta", async () => {
    const solicitar = solicitarCon(() => respuestaJson({}));
    await crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/1");
    expect(solicitar.mock.calls[0]?.[0]).toBe("/api/libros/1");
  });

  test("con todos los parámetros undefined tampoco agrega signo de pregunta", async () => {
    const solicitar = solicitarCon(() => respuestaJson({}));
    await crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/1", { titulo: undefined });
    expect(solicitar.mock.calls[0]?.[0]).toBe("/api/libros/1");
  });

  test("una base distinta no duplica la barra, tenga o no barra final", async () => {
    const solicitar = solicitarCon(() => respuestaJson([]));
    await crearClienteHttp({ base: "/servicio", solicitar }).obtener("/libros/");
    await crearClienteHttp({ base: "/servicio/", solicitar }).obtener("/libros/");
    expect(solicitar.mock.calls.map((llamada) => llamada[0])).toEqual(["/servicio/libros/", "/servicio/libros/"]);
  });

  test("usa el método GET y pide JSON", async () => {
    const solicitar = solicitarCon(() => respuestaJson([]));
    await crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/");
    const init = solicitar.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.body).toBeUndefined();
  });

  test("expone solo la operación obtener: sin escrituras", () => {
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(() => respuestaJson([])) });
    expect(Object.keys(cliente)).toEqual(["obtener"]);
    expect(Reflect.has(cliente, "post")).toBe(false);
    expect(Reflect.has(cliente, "patch")).toBe(false);
    expect(Reflect.has(cliente, "delete")).toBe(false);
  });
});

describe("crearClienteHttp: respuestas correctas", () => {
  test("una respuesta 200 con JSON entrega los datos", async () => {
    const datos = { id: 1, titulo: "Rayuela", precio: "25000.00" };
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(() => respuestaJson(datos)) });
    expect(await cliente.obtener("/libros/1")).toEqual(datos);
  });

  test("acepta un content-type con parámetros", async () => {
    const respuesta = (): Response =>
      new Response("[1,2]", { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(respuesta) });
    expect(await cliente.obtener("/x")).toEqual([1, 2]);
  });
});

describe("crearClienteHttp: errores", () => {
  test("404 con detail de texto: error http con el estado y el mensaje de la API", async () => {
    const cliente = crearClienteHttp({
      base: "/api",
      solicitar: solicitarCon(() => respuestaJson({ detail: "Libro no encontrado" }, 404)),
    });
    const error = await falla(cliente.obtener("/libros/99"));
    expect(error.tipo).toBe("http");
    expect(error.estado).toBe(404);
    expect(error.message).toBe("Libro no encontrado");
    expect(error.errores).toEqual([]);
  });

  test("422 con lista de detalles: mensajes unidos y un error por campo", async () => {
    const cuerpo = {
      detail: [
        { type: "int_parsing", loc: ["query", "limit"], msg: "Input should be a valid integer" },
        { type: "greater_than_equal", loc: ["query", "offset"], msg: "Input should be greater than or equal to 0" },
      ],
    };
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(() => respuestaJson(cuerpo, 422)) });
    const error = await falla(cliente.obtener("/libros/", { limit: "x" }));
    expect(error.tipo).toBe("http");
    expect(error.estado).toBe(422);
    expect(error.message).toBe("Input should be a valid integer; Input should be greater than or equal to 0");
    expect(error.errores).toEqual([
      { campo: "limit", mensaje: "Input should be a valid integer" },
      { campo: "offset", mensaje: "Input should be greater than or equal to 0" },
    ]);
  });

  test("502 con cuerpo HTML: texto fijo con el estado", async () => {
    const respuesta = (): Response =>
      new Response("<html><body>Bad Gateway</body></html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      });
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(respuesta) });
    const error = await falla(cliente.obtener("/libros/"));
    expect(error.tipo).toBe("http");
    expect(error.estado).toBe(502);
    expect(error.message).toBe("El servidor respondió con un error (502).");
  });

  test("500 sin cuerpo: texto fijo con el estado", async () => {
    const cliente = crearClienteHttp({
      base: "/api",
      solicitar: solicitarCon(() => new Response(null, { status: 500 })),
    });
    const error = await falla(cliente.obtener("/libros/"));
    expect(error.message).toBe("El servidor respondió con un error (500).");
    expect(error.estado).toBe(500);
  });

  test("200 con text/html (falta el reenvío de /api): error de formato", async () => {
    const respuesta = (): Response =>
      new Response("<!doctype html><html></html>", { status: 200, headers: { "content-type": "text/html" } });
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(respuesta) });
    const error = await falla(cliente.obtener("/libros/"));
    expect(error.tipo).toBe("formato");
    expect(error.estado).toBe(200);
    expect(error.message).toBe("La respuesta del servidor no tiene el formato esperado.");
  });

  test("200 con content-type JSON pero cuerpo que no se puede interpretar: error de formato", async () => {
    const respuesta = (): Response =>
      new Response("{no es json", { status: 200, headers: { "content-type": "application/json" } });
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(respuesta) });
    const error = await falla(cliente.obtener("/libros/"));
    expect(error.tipo).toBe("formato");
    expect(error.message).toBe("La respuesta del servidor no tiene el formato esperado.");
  });

  test("200 sin content-type: error de formato", async () => {
    const respuesta = (): Response => {
      const r = new Response(null, { status: 200 });
      return r;
    };
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(respuesta) });
    expect((await falla(cliente.obtener("/libros/"))).tipo).toBe("formato");
  });

  test("rechazo de la solicitud: error de red sin estado", async () => {
    const solicitar = vi.fn<Solicitar>().mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await falla(crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/"));
    expect(error.tipo).toBe("red");
    expect(error.estado).toBeNull();
    expect(error.message).toBe("No se pudo conectar con el servidor.");
  });

  test("un lanzamiento síncrono de la función de solicitud también es error de red", async () => {
    const solicitar = vi.fn<Solicitar>(() => {
      throw new TypeError("Failed to fetch");
    });
    const error = await falla(crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/"));
    expect(error.tipo).toBe("red");
  });
});

describe("crearClienteHttp: tiempo límite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function solicitarQueNoResponde(): ReturnType<typeof vi.fn<Solicitar>> {
    return vi.fn<Solicitar>(
      (_url, init) =>
        new Promise<Response>((_resolver, rechazar) => {
          init.signal?.addEventListener("abort", () => rechazar(new DOMException("Cancelado", "AbortError")));
        }),
    );
  }

  test("el tiempo por defecto es de 10 000 ms", () => {
    expect(TIEMPO_LIMITE_POR_DEFECTO_MS).toBe(10_000);
  });

  test("sin respuesta a los 10 000 ms cancela la señal y rechaza por tiempo", async () => {
    const solicitar = solicitarQueNoResponde();
    const cliente = crearClienteHttp({ base: "/api", solicitar });

    const resultado = falla(cliente.obtener("/libros/"));
    const senal = solicitar.mock.calls[0]?.[1].signal as AbortSignal;
    await vi.advanceTimersByTimeAsync(9_999);
    expect(senal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(senal.aborted).toBe(true);

    const error = await resultado;
    expect(error.tipo).toBe("tiempo");
    expect(error.estado).toBeNull();
    expect(error.message).toBe("El servidor tardó demasiado en responder.");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("respeta un tiempo límite configurado", async () => {
    const solicitar = solicitarQueNoResponde();
    const cliente = crearClienteHttp({ base: "/api", solicitar, tiempoLimiteMs: 50 });
    const resultado = falla(cliente.obtener("/libros/"));
    await vi.advanceTimersByTimeAsync(50);
    expect((await resultado).tipo).toBe("tiempo");
  });

  test("tras una respuesta correcta no queda ningún temporizador pendiente", async () => {
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(() => respuestaJson([])) });
    await cliente.obtener("/libros/");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("tras un error de red no queda ningún temporizador pendiente", async () => {
    const solicitar = vi.fn<Solicitar>().mockRejectedValue(new TypeError("Failed to fetch"));
    await falla(crearClienteHttp({ base: "/api", solicitar }).obtener("/libros/"));
    expect(vi.getTimerCount()).toBe(0);
  });

  test("tras un error HTTP no queda ningún temporizador pendiente", async () => {
    const cliente = crearClienteHttp({ base: "/api", solicitar: solicitarCon(() => respuestaJson({ detail: "x" }, 404)) });
    await falla(cliente.obtener("/libros/"));
    expect(vi.getTimerCount()).toBe(0);
  });

  test("si el tiempo vence mientras se lee el cuerpo, también es error de tiempo", async () => {
    const solicitar = vi.fn<Solicitar>(async (_url, init) => {
      const cuerpo = new ReadableStream<Uint8Array>({
        start(controlador) {
          init.signal?.addEventListener("abort", () => controlador.error(new DOMException("Cancelado", "AbortError")));
        },
      });
      return new Response(cuerpo, { status: 200, headers: { "content-type": "application/json" } });
    });
    const cliente = crearClienteHttp({ base: "/api", solicitar });
    const resultado = falla(cliente.obtener("/libros/"));
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await resultado).tipo).toBe("tiempo");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("crearClienteHttp: fetch global por defecto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("sin solicitar inyectado usa el fetch global vigente al llamar", async () => {
    const cliente = crearClienteHttp({ base: "/api" });
    const falso = vi.fn<Solicitar>(async () => respuestaJson([{ id: 1 }]));
    vi.stubGlobal("fetch", falso);

    expect(await cliente.obtener("/libros/", { limit: 5 })).toEqual([{ id: 1 }]);
    expect(falso).toHaveBeenCalledTimes(1);
    expect(falso.mock.calls[0]?.[0]).toBe("/api/libros/?limit=5");
    expect((falso.mock.calls[0]?.[1] as RequestInit).method).toBe("GET");
  });
});
