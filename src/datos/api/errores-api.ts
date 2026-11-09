// Errores de la API como mensajes en texto: el cliente HTTP rechaza siempre con
// un `ErrorDeApi`, que las vistas tratan como cualquier `ErrorDeRepositorio`.
import { ErrorDeRepositorio } from "../errores";
import type { ErrorDeCampo } from "../../types/formulario";

export const MENSAJE_RED = "No se pudo conectar con el servidor.";
export const MENSAJE_TIEMPO = "El servidor tardó demasiado en responder.";
export const MENSAJE_FORMATO = "La respuesta del servidor no tiene el formato esperado.";
export const MENSAJE_RESULTADO_INCIERTO =
  "No se pudo confirmar si el servidor registró la operación. Revisá los datos antes de reintentar.";

export type TipoDeErrorApi = "http" | "red" | "tiempo" | "formato";

/**
 * Falla al consultar la API. `estado` es el código HTTP, o `null` si no hubo
 * respuesta. `resultadoIncierto` es verdadero solo en una escritura sin
 * respuesta, con un 502 o 504 del intermediario o con un 2xx ilegible (ver
 * `cliente-http.ts`), es decir, cuando no se sabe si la API la registró.
 */
export class ErrorDeApi extends ErrorDeRepositorio {
  readonly tipo: TipoDeErrorApi;
  readonly estado: number | null;
  readonly resultadoIncierto: boolean;

  constructor(
    mensaje: string,
    tipo: TipoDeErrorApi,
    estado: number | null = null,
    errores: ErrorDeCampo[] = [],
    resultadoIncierto = false,
  ) {
    super(mensaje, errores);
    this.name = "ErrorDeApi";
    this.tipo = tipo;
    this.estado = estado;
    this.resultadoIncierto = resultadoIncierto;
  }
}

export interface CuerpoInterpretado {
  mensaje: string;
  errores: ErrorDeCampo[];
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoDeCampo(loc: unknown): string {
  if (!Array.isArray(loc) || loc.length === 0) return "";
  return String(loc[loc.length - 1]);
}

function interpretarDetalles(detalles: unknown[]): ErrorDeCampo[] | null {
  const errores: ErrorDeCampo[] = [];
  for (const detalle of detalles) {
    if (!esObjeto(detalle) || typeof detalle.msg !== "string") return null;
    errores.push({ campo: textoDeCampo(detalle.loc), mensaje: detalle.msg });
  }
  return errores;
}

/**
 * Convierte el cuerpo de una respuesta de error (`{"detail": "…"}` o la lista de
 * validación del 422) en un mensaje de texto y en errores por campo. Toda otra
 * forma produce un texto fijo con el estado.
 */
export function interpretarCuerpoDeError(estado: number, cuerpo: unknown): CuerpoInterpretado {
  if (esObjeto(cuerpo)) {
    const detalle = cuerpo.detail;
    if (typeof detalle === "string") return { mensaje: detalle, errores: [] };
    if (Array.isArray(detalle) && detalle.length > 0) {
      const errores = interpretarDetalles(detalle);
      if (errores !== null) {
        return { mensaje: errores.map((e) => e.mensaje).join("; "), errores };
      }
    }
  }
  return { mensaje: `El servidor respondió con un error (${estado}).`, errores: [] };
}
