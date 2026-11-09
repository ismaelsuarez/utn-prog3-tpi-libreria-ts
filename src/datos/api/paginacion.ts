// Ayudas de lectura masiva: recorrido de todas las páginas de un listado,
// ejecución de tareas asíncronas con concurrencia acotada y sondeo por
// identificador para los recursos que la API no lista.
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

/** Ausentes seguidos, posteriores al mayor identificador conocido, que cierran el sondeo. */
export const HUECO_DE_SONDEO = 10;
/** Consultas simultáneas del sondeo. */
export const CONCURRENCIA_DE_SONDEO = 4;

export interface OpcionesDeSondeo {
  /** Identificadores que otra fuente asegura que existen: el sondeo no termina antes de pasarlos. */
  conocidos?: readonly number[];
  hueco?: number;
  concurrencia?: number;
}

function esAusente(error: unknown): boolean {
  return error instanceof ErrorDeApi && error.estado === 404;
}

/**
 * Lista un recurso que la API solo ofrece por identificador: pide `obtener(1)`,
 * `obtener(2)`… con a lo sumo `concurrencia` consultas en curso; un 404 es un
 * identificador ausente y cualquier otra falla rechaza todo el listado (nunca
 * se entrega uno parcial). Termina tras `hueco` ausentes seguidos posteriores al
 * mayor identificador de `conocidos`. No se adelanta: no pide un identificador
 * si, contando como ausentes los que siguen en curso, ya habría `hueco` ausentes
 * seguidos antes de él. Entrega los encontrados por identificador creciente.
 *
 * Los huecos de identificadores solo nacen de altas fallidas (la API no borra),
 * de modo que más de `hueco` altas fallidas seguidas ocultarían los registros
 * siguientes hasta que otra fuente (`conocidos`) los mencione.
 */
export function sondearPorIdentificador<T>(
  obtener: (id: number) => Promise<T>,
  opciones: OpcionesDeSondeo = {},
): Promise<T[]> {
  const { conocidos = [], hueco = HUECO_DE_SONDEO, concurrencia = CONCURRENCIA_DE_SONDEO } = opciones;
  const mayorConocido = conocidos.reduce((mayor, id) => Math.max(mayor, id), 0);
  const limite = Math.max(1, concurrencia);

  return new Promise<T[]>((resolver, rechazar) => {
    const encontrados = new Map<number, T>();
    // Estado por identificador: ausente confirmado, en curso o presente (ausencia de entrada = sin pedir).
    const ausentes = new Set<number>();
    const enCurso = new Set<number>();
    let siguiente = 1;
    let fallo = false;

    const ausenteSeguidosHasta = (id: number): number => {
      let cuenta = 0;
      for (let actual = id; actual >= 1 && (ausentes.has(actual) || enCurso.has(actual)); actual -= 1) cuenta += 1;
      return cuenta;
    };
    const puedePedirSiguiente = (): boolean =>
      siguiente <= mayorConocido || ausenteSeguidosHasta(siguiente - 1) < hueco;

    const avanzar = (): void => {
      if (fallo) return;
      while (enCurso.size < limite && puedePedirSiguiente()) {
        const id = siguiente;
        siguiente += 1;
        enCurso.add(id);
        // `async` convierte también un lanzamiento síncrono de `obtener` en rechazo.
        void (async (): Promise<T> => obtener(id))().then(
          (registro) => {
            if (fallo) return;
            enCurso.delete(id);
            encontrados.set(id, registro);
            avanzar();
          },
          (error: unknown) => {
            if (fallo) return;
            enCurso.delete(id);
            if (!esAusente(error)) {
              fallo = true;
              rechazar(error);
              return;
            }
            ausentes.add(id);
            avanzar();
          },
        );
      }
      if (enCurso.size === 0) {
        resolver([...encontrados.entries()].sort(([a], [b]) => a - b).map(([, registro]) => registro));
      }
    };

    avanzar();
  });
}
