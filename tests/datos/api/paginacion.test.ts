import { describe, expect, test, vi } from "vitest";
import { ErrorDeApi } from "../../../src/datos/api/errores-api";
import { mapearConLimite, recorrerPaginas } from "../../../src/datos/api/paginacion";

/** Servidor simulado con `total` elementos numerados desde 1. */
function servidorCon(total: number): ReturnType<typeof vi.fn<(limit: number, offset: number) => Promise<number[]>>> {
  const todos = Array.from({ length: total }, (_, i) => i + 1);
  return vi.fn(async (limit: number, offset: number) => todos.slice(offset, offset + limit));
}

describe("recorrerPaginas", () => {
  test("5 elementos: una sola página pedida con (100, 0)", async () => {
    const pedirPagina = servidorCon(5);
    expect(await recorrerPaginas(pedirPagina)).toEqual([1, 2, 3, 4, 5]);
    expect(pedirPagina.mock.calls).toEqual([[100, 0]]);
  });

  test("230 elementos: páginas (100, 0), (100, 100) y (100, 200), todos en orden", async () => {
    const pedirPagina = servidorCon(230);
    const elementos = await recorrerPaginas(pedirPagina);
    expect(pedirPagina.mock.calls).toEqual([
      [100, 0],
      [100, 100],
      [100, 200],
    ]);
    expect(elementos).toHaveLength(230);
    expect(elementos).toEqual(Array.from({ length: 230 }, (_, i) => i + 1));
  });

  test("exactamente 100: la segunda página (100, 100) llega vacía y se entregan los 100", async () => {
    const pedirPagina = servidorCon(100);
    const elementos = await recorrerPaginas(pedirPagina);
    expect(pedirPagina.mock.calls).toEqual([
      [100, 0],
      [100, 100],
    ]);
    expect(elementos).toHaveLength(100);
  });

  test("sin elementos: una página vacía y lista vacía", async () => {
    const pedirPagina = servidorCon(0);
    expect(await recorrerPaginas(pedirPagina)).toEqual([]);
    expect(pedirPagina.mock.calls).toEqual([[100, 0]]);
  });

  test("un tamaño de página distinto se usa como límite y como paso del desplazamiento", async () => {
    const pedirPagina = servidorCon(5);
    expect(await recorrerPaginas(pedirPagina, 2)).toEqual([1, 2, 3, 4, 5]);
    expect(pedirPagina.mock.calls).toEqual([
      [2, 0],
      [2, 2],
      [2, 4],
    ]);
  });

  test("las páginas se piden de a una, en orden", async () => {
    let enCurso = 0;
    let maximo = 0;
    const todos = Array.from({ length: 250 }, (_, i) => i);
    const pedirPagina = async (limit: number, offset: number): Promise<number[]> => {
      enCurso += 1;
      maximo = Math.max(maximo, enCurso);
      await Promise.resolve();
      enCurso -= 1;
      return todos.slice(offset, offset + limit);
    };
    await recorrerPaginas(pedirPagina);
    expect(maximo).toBe(1);
  });

  test("un servidor que ignora offset y siempre devuelve 100: error de formato al llegar a 100 páginas", async () => {
    const pedirPagina = vi.fn(async (_limit: number, _offset: number) => Array.from({ length: 100 }, (_, i) => i));
    const error = await recorrerPaginas(pedirPagina).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect((error as ErrorDeApi).tipo).toBe("formato");
    expect((error as ErrorDeApi).message).toBe("La respuesta del servidor no tiene el formato esperado.");
    expect(pedirPagina).toHaveBeenCalledTimes(100);
  });

  test("el rechazo de una página se propaga y no se piden más", async () => {
    const fallo = new ErrorDeApi("Falla en la página", "http", 500);
    const pedirPagina = vi.fn(async (limit: number, offset: number): Promise<number[]> => {
      if (offset === 100) throw fallo;
      return Array.from({ length: limit }, (_, i) => offset + i);
    });
    await expect(recorrerPaginas(pedirPagina)).rejects.toBe(fallo);
    expect(pedirPagina.mock.calls).toEqual([
      [100, 0],
      [100, 100],
    ]);
  });
});

interface Diferida<T> {
  promesa: Promise<T>;
  resolver: (valor: T) => void;
  rechazar: (error: unknown) => void;
}

function diferida<T>(): Diferida<T> {
  let resolver!: (valor: T) => void;
  let rechazar!: (error: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

const turno = (): Promise<void> => new Promise((resolver) => setTimeout(resolver, 0));

describe("mapearConLimite", () => {
  test("10 elementos con límite 4: nunca más de 4 en curso y 10 llamadas en total", async () => {
    const pendientes = new Map<number, Diferida<string>>();
    let enCurso = 0;
    let maximo = 0;
    let llamadas = 0;
    const funcion = (n: number): Promise<string> => {
      llamadas += 1;
      enCurso += 1;
      maximo = Math.max(maximo, enCurso);
      const d = diferida<string>();
      pendientes.set(n, d);
      return d.promesa.finally(() => {
        enCurso -= 1;
      });
    };

    const resultado = mapearConLimite([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, funcion);
    await turno();
    expect(enCurso).toBe(4);
    expect(llamadas).toBe(4);

    for (let n = 0; n < 10; n += 1) {
      pendientes.get(n)?.resolver(`r${n}`);
      await turno();
    }
    expect(await resultado).toEqual(["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9"]);
    expect(maximo).toBe(4);
    expect(llamadas).toBe(10);
  });

  test("devuelve los resultados en el orden de entrada aunque terminen en otro orden", async () => {
    const pendientes = [diferida<string>(), diferida<string>(), diferida<string>()];
    const resultado = mapearConLimite([0, 1, 2], 3, (n) => (pendientes[n] as Diferida<string>).promesa);
    pendientes[2]?.resolver("c");
    pendientes[0]?.resolver("a");
    pendientes[1]?.resolver("b");
    expect(await resultado).toEqual(["a", "b", "c"]);
  });

  test("pasa el elemento y su índice a la función", async () => {
    const funcion = vi.fn(async (texto: string, indice: number) => `${indice}:${texto}`);
    expect(await mapearConLimite(["x", "y"], 4, funcion)).toEqual(["0:x", "1:y"]);
    expect(funcion.mock.calls).toEqual([
      ["x", 0],
      ["y", 1],
    ]);
  });

  test("con menos elementos que el límite los inicia todos a la vez", async () => {
    const funcion = vi.fn(() => new Promise<number>(() => undefined));
    void mapearConLimite([1, 2], 4, funcion);
    await turno();
    expect(funcion).toHaveBeenCalledTimes(2);
  });

  test("lista vacía: devuelve [] sin llamadas", async () => {
    const funcion = vi.fn(async (n: number) => n);
    expect(await mapearConLimite([], 4, funcion)).toEqual([]);
    expect(funcion).not.toHaveBeenCalled();
  });

  test("un rechazo rechaza con ese error y no inicia elementos nuevos", async () => {
    const pendientes = new Map<number, Diferida<number>>();
    const funcion = vi.fn((n: number): Promise<number> => {
      const d = diferida<number>();
      pendientes.set(n, d);
      return d.promesa;
    });
    const resultado = mapearConLimite([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, funcion);
    const fallo = new Error("Libro no encontrado");
    const capturado = resultado.catch((e: unknown) => e);
    await turno();

    pendientes.get(1)?.rechazar(fallo);
    expect(await capturado).toBe(fallo);

    pendientes.get(0)?.resolver(0);
    pendientes.get(2)?.resolver(2);
    await turno();
    expect(funcion).toHaveBeenCalledTimes(4);
  });

  test("una función que lanza de forma síncrona rechaza la promesa", async () => {
    const fallo = new Error("sincrónico");
    const resultado = mapearConLimite([1, 2], 2, () => {
      throw fallo;
    });
    await expect(resultado).rejects.toBe(fallo);
  });
});
