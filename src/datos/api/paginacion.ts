// Ayudas de lectura masiva: recorrido de todas las páginas de un listado y
// ejecución de tareas asíncronas con concurrencia acotada.
import { ErrorDeApi, MENSAJE_FORMATO } from "./errores-api";

export const TAMANIO_DE_PAGINA = 100;
/** Protege de un servidor que ignore `offset` y devuelva siempre una página completa. */
export const MAXIMO_DE_PAGINAS = 100;

export type PedirPagina<T> = (limit: number, offset: number) => Promise<T[]>;

/**
 * Pide las páginas de a una (`offset` 0, `tamanio`, 2 × `tamanio`…) hasta recibir
 * una con menos de `tamanio` elementos, porque la API no informa el total. Si el
 * total es múltiplo de `tamanio`, la última página llega vacía.
 */
export async function recorrerPaginas<T>(
  pedirPagina: PedirPagina<T>,
  tamanio: number = TAMANIO_DE_PAGINA,
): Promise<T[]> {
  const elementos: T[] = [];
  for (let pagina = 0; pagina < MAXIMO_DE_PAGINAS; pagina += 1) {
    const recibidos = await pedirPagina(tamanio, pagina * tamanio);
    elementos.push(...recibidos);
    if (recibidos.length < tamanio) return elementos;
  }
  throw new ErrorDeApi(MENSAJE_FORMATO, "formato");
}

/**
 * Aplica `funcion` a cada elemento con a lo sumo `limite` promesas en curso y
 * devuelve los resultados en el orden de entrada. Ante el primer rechazo,
 * rechaza con ese error y no inicia elementos nuevos.
 */
export function mapearConLimite<T, R>(
  elementos: readonly T[],
  limite: number,
  funcion: (elemento: T, indice: number) => Promise<R>,
): Promise<R[]> {
  return new Promise<R[]>((resolver, rechazar) => {
    const total = elementos.length;
    if (total === 0) {
      resolver([]);
      return;
    }
    const resultados = new Array<R>(total);
    let siguiente = 0;
    let terminados = 0;
    let fallo = false;

    const iniciarSiguiente = (): void => {
      if (fallo || siguiente >= total) return;
      const indice = siguiente;
      siguiente += 1;
      // `async` convierte también un lanzamiento síncrono de `funcion` en rechazo.
      void (async (): Promise<R> => funcion(elementos[indice] as T, indice))().then(
        (resultado) => {
          if (fallo) return;
          resultados[indice] = resultado;
          terminados += 1;
          if (terminados === total) resolver(resultados);
          else iniciarSiguiente();
        },
        (error: unknown) => {
          if (fallo) return;
          fallo = true;
          rechazar(error);
        },
      );
    };

    for (let i = 0; i < Math.min(Math.max(1, limite), total); i += 1) iniciarSiguiente();
  });
}
