// Cliente HTTP sobre la base del mismo origen (`/api`). Ofrece `GET` para las
// lecturas y `POST` con cuerpo JSON para las altas; no hay `PUT`, `PATCH` ni
// `DELETE`, y ningún método se reintenta. Toda falla se rechaza como `ErrorDeApi`
// con un mensaje en texto.
import {
  ErrorDeApi,
  MENSAJE_FORMATO,
  MENSAJE_RED,
  MENSAJE_RESULTADO_INCIERTO,
  MENSAJE_TIEMPO,
  interpretarCuerpoDeError,
} from "./errores-api";

export const TIEMPO_LIMITE_POR_DEFECTO_MS = 10_000;

/** Función de solicitud inyectable; las pruebas entregan un doble sin red. */
export type Solicitar = (url: string, init: RequestInit) => Promise<Response>;

export type ParametrosDeConsulta = Record<string, string | number | undefined>;

export interface OpcionesClienteHttp {
  /** Base del mismo origen, por ejemplo `/api`. */
  base: string;
  solicitar?: Solicitar;
  tiempoLimiteMs?: number;
}

export interface ClienteHttp {
  /** `GET base + ruta` con los parámetros codificados; entrega el JSON recibido sin afirmar su forma. */
  obtener(ruta: string, parametros?: ParametrosDeConsulta): Promise<unknown>;
  /**
   * `POST base + ruta` con `cuerpo` como JSON; entrega el JSON de la respuesta
   * sin afirmar su forma. Sin respuesta (red o tiempo) rechaza con
   * `resultadoIncierto` y no reintenta.
   */
  enviar(metodo: "POST", ruta: string, cuerpo: unknown): Promise<unknown>;
}

// `fetch` se resuelve en cada llamada: guardarlo suelto y invocarlo desligado de
// `window` lanza «Illegal invocation» en Chrome.
const solicitarPorDefecto: Solicitar = (url, init) => globalThis.fetch(url, init);

function armarDireccion(base: string, ruta: string, parametros?: ParametrosDeConsulta): string {
  const consulta = new URLSearchParams();
  for (const [nombre, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined) consulta.append(nombre, String(valor));
  }
  const texto = consulta.toString();
  const direccion = `${base.replace(/\/+$/, "")}/${ruta.replace(/^\/+/, "")}`;
  return texto === "" ? direccion : `${direccion}?${texto}`;
}

function interpretarJson(texto: string): { valor: unknown } | null {
  try {
    return { valor: JSON.parse(texto) as unknown };
  } catch {
    return null;
  }
}

export function crearClienteHttp(opciones: OpcionesClienteHttp): ClienteHttp {
  const { base, solicitar = solicitarPorDefecto, tiempoLimiteMs = TIEMPO_LIMITE_POR_DEFECTO_MS } = opciones;

  async function ejecutar(direccion: string, init: RequestInit, esEscritura: boolean): Promise<unknown> {
    const controlador = new AbortController();
    let vencio = false;
    const temporizador = setTimeout(() => {
      vencio = true;
      controlador.abort();
    }, tiempoLimiteMs);

    try {
      const respuesta = await solicitar(direccion, { ...init, signal: controlador.signal });
      const texto = await respuesta.text();

      if (!respuesta.ok) {
        const { mensaje, errores } = interpretarCuerpoDeError(respuesta.status, interpretarJson(texto)?.valor);
        throw new ErrorDeApi(mensaje, "http", respuesta.status, errores);
      }

      const esJson = (respuesta.headers.get("content-type") ?? "").toLowerCase().includes("application/json");
      const cuerpo = esJson ? interpretarJson(texto) : null;
      if (cuerpo === null) throw new ErrorDeApi(MENSAJE_FORMATO, "formato", respuesta.status);
      return cuerpo.valor;
    } catch (error) {
      if (error instanceof ErrorDeApi) throw error;
      const tipo = vencio ? "tiempo" : "red";
      if (esEscritura) throw new ErrorDeApi(MENSAJE_RESULTADO_INCIERTO, tipo, null, [], true);
      throw new ErrorDeApi(vencio ? MENSAJE_TIEMPO : MENSAJE_RED, tipo);
    } finally {
      clearTimeout(temporizador);
    }
  }

  function obtener(ruta: string, parametros?: ParametrosDeConsulta): Promise<unknown> {
    return ejecutar(
      armarDireccion(base, ruta, parametros),
      { method: "GET", headers: { Accept: "application/json" } },
      false,
    );
  }

  function enviar(metodo: "POST", ruta: string, cuerpo: unknown): Promise<unknown> {
    return ejecutar(
      armarDireccion(base, ruta),
      {
        method: metodo,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      },
      true,
    );
  }

  return { obtener, enviar };
}
