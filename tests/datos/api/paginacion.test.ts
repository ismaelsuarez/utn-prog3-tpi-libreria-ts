import { describe, expect, test, vi } from "vitest";
import { ErrorDeApi } from "../../../src/datos/api/errores-api";
import { mapearConLimite, recorrerPaginas, sondearPorIdentificador } from "../../../src/datos/api/paginacion";

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

interface Registro {
  id: number;
}

/**
 * Servidor simulado: responde 404 a todo identificador que no esté en
 * `existentes`. Registra el orden de las consultas y cuántas hubo en curso a la
 * vez (cada consulta tarda un turno de microtareas, para que se solapen).
 */
function sondeoCon(existentes: readonly number[], fallos: Record<number, unknown> = {}) {
  const consultados: number[] = [];
  let enCurso = 0;
  let maximo = 0;
  const obtener = vi.fn(async (id: number): Promise<Registro> => {
    consultados.push(id);
    enCurso += 1;
    maximo = Math.max(maximo, enCurso);
    await Promise.resolve();
    await Promise.resolve();
    enCurso -= 1;
    if (Object.hasOwn(fallos, id)) throw fallos[id];
    if (existentes.includes(id)) return { id };
    throw new ErrorDeApi("Cliente no encontrado", "http", 404);
  });
  return { obtener, consultados, maximoEnCurso: (): number => maximo };
}

const rango = (desde: number, hasta: number): number[] =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);

describe("sondearPorIdentificador", () => {
  test("clientes 1, 2 y 3 y 404 del 4 al 13: los entrega en orden y no pide el 14", async () => {
    const { obtener, consultados } = sondeoCon([1, 2, 3]);
    const encontrados = await sondearPorIdentificador(obtener);
    expect(encontrados).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect([...consultados].sort((a, b) => a - b)).toEqual(rango(1, 13));
    expect(consultados).not.toContain(14);
  });

  test("hueco menor que el límite: 1, 2 y 9 con 404 del 3 al 8", async () => {
    const { obtener, consultados } = sondeoCon([1, 2, 9]);
    expect(await sondearPorIdentificador(obtener)).toEqual([{ id: 1 }, { id: 2 }, { id: 9 }]);
    // Tras el 9 hacen falta otros 10 ausentes seguidos: se llega al 19 y no al 20.
    expect(Math.max(...consultados)).toBe(19);
  });

  test("identificador conocido por otra fuente: no se detiene antes del 25 y lo incluye", async () => {
    const { obtener, consultados } = sondeoCon([1, 2, 3, 25]);
    const encontrados = await sondearPorIdentificador(obtener, { conocidos: [3, 25, 2] });
    expect(encontrados.map((r) => r.id)).toEqual([1, 2, 3, 25]);
    expect(consultados).toContain(25);
    // Después del mayor conocido se aplican los 10 ausentes seguidos: 26 a 35.
    expect(Math.max(...consultados)).toBe(35);
  });

  test("un conocido ausente no extiende el sondeo cuando ya hubo 10 ausentes seguidos hasta él", async () => {
    const { obtener, consultados } = sondeoCon([1]);
    expect(await sondearPorIdentificador(obtener, { conocidos: [12] })).toEqual([{ id: 1 }]);
    expect(Math.max(...consultados)).toBe(12);
  });

  test("sin ningún registro: pide del 1 al 10 y entrega una lista vacía", async () => {
    const { obtener, consultados } = sondeoCon([]);
    expect(await sondearPorIdentificador(obtener)).toEqual([]);
    expect([...consultados].sort((a, b) => a - b)).toEqual(rango(1, 10));
  });

  test("nunca hay más de 4 consultas en curso", async () => {
    const { obtener, maximoEnCurso } = sondeoCon([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    await sondearPorIdentificador(obtener);
    expect(maximoEnCurso()).toBe(4);
  });

  test("respeta una concurrencia y un hueco configurados", async () => {
    const { obtener, consultados, maximoEnCurso } = sondeoCon([1, 2]);
    expect(await sondearPorIdentificador(obtener, { concurrencia: 2, hueco: 3 })).toEqual([{ id: 1 }, { id: 2 }]);
    expect(maximoEnCurso()).toBe(2);
    expect(Math.max(...consultados)).toBe(5);
  });

  test("entrega por identificador creciente aunque las respuestas lleguen en otro orden", async () => {
    const existentes = [1, 2, 3, 4, 5, 6];
    // Dentro de cada tanda de 4, los identificadores más altos responden primero.
    const obtener = (id: number): Promise<Registro> =>
      new Promise<Registro>((resolver, rechazar) => {
        setTimeout(() => {
          if (existentes.includes(id)) resolver({ id });
          else rechazar(new ErrorDeApi("no", "http", 404));
        }, (10 - id) * 2);
      });
    expect((await sondearPorIdentificador(obtener)).map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("una falla 500 rechaza todo el listado con su mensaje, sin entregar una lista parcial", async () => {
    const fallo = new ErrorDeApi("Error interno", "http", 500);
    const { obtener } = sondeoCon([1, 2, 3, 4], { 3: fallo });
    await expect(sondearPorIdentificador(obtener)).rejects.toBe(fallo);
  });

  test("una falla sin respuesta (red) rechaza el listado", async () => {
    const fallo = new ErrorDeApi("No se pudo conectar con el servidor.", "red");
    const { obtener } = sondeoCon([1, 2], { 2: fallo });
    const error = await sondearPorIdentificador(obtener).catch((e: unknown) => e);
    expect(error).toBe(fallo);
    expect((error as ErrorDeApi).message).toBe("No se pudo conectar con el servidor.");
  });

  test("un error que no es de la API tampoco cuenta como ausente", async () => {
    const fallo = new TypeError("boom");
    const { obtener } = sondeoCon([1], { 2: fallo });
    await expect(sondearPorIdentificador(obtener)).rejects.toBe(fallo);
  });

  test("tras la falla no se inician consultas nuevas", async () => {
    const fallo = new ErrorDeApi("Error interno", "http", 500);
    const { obtener, consultados } = sondeoCon(rango(1, 40), { 2: fallo });
    await expect(sondearPorIdentificador(obtener)).rejects.toBe(fallo);
    await new Promise((resolver) => setTimeout(resolver, 5));
    expect(Math.max(...consultados)).toBeLessThanOrEqual(5);
  });

  test("un 404 con otro estado de error (403) no cuenta como ausente", async () => {
    const prohibido = new ErrorDeApi("Prohibido", "http", 403);
    const { obtener } = sondeoCon([1], { 2: prohibido });
    await expect(sondearPorIdentificador(obtener)).rejects.toBe(prohibido);
  });
});
