// Lógica pura: convierte el rechazo de la API en mensajes para un formulario,
// sin conocer la clase del error (basta su forma) ni el DOM.
import type { ErrorDeCampo } from "../types/formulario";

/** Forma mínima de un error de repositorio (`ErrorDeApi` la cumple). */
export interface ErrorDeOperacion {
  message: string;
  estado?: number | null;
  errores: readonly ErrorDeCampo[];
}

export interface ErroresDeFormulario {
  /** Mensajes que se muestran junto a su control. */
  porCampo: ErrorDeCampo[];
  /** Mensaje de la operación entera, o `null` si todo quedó junto a un campo. */
  deLaOperacion: string | null;
}

export type MapaDeCampos = Readonly<Record<string, string>>;

/** Nombres de los campos de la API → controles del formulario de libros. */
export const CAMPOS_DE_LIBRO: MapaDeCampos = {
  editorial_id: "editorial",
  genero_id: "genero",
  autores: "autores",
  autor_id: "autores",
  rol: "autores",
  orden: "autores",
};

/** Nombres de los campos de la API → controles del formulario de ventas. */
export const CAMPOS_DE_VENTA: MapaDeCampos = {
  cliente_id: "cliente",
  libro_id: "renglones",
  cantidad: "renglones",
};

/**
 * Ubica los mensajes de un rechazo de la API:
 * - 422 con detalles: cada uno junto a su control, traducido con `mapaDeCampos`
 *   (los campos sin traducción conservan su nombre; un detalle sin campo pasa a
 *   la operación);
 * - 409 con `campoDelConflicto` (alta de cliente: único conflicto posible, el
 *   email): junto a ese campo;
 * - cualquier otro caso, incluido el resultado incierto: mensaje de la operación.
 */
export function erroresDeFormulario(
  error: ErrorDeOperacion,
  mapaDeCampos: MapaDeCampos,
  campoDelConflicto?: string,
): ErroresDeFormulario {
  if (error.errores.length > 0) {
    const porCampo: ErrorDeCampo[] = [];
    const sinCampo: string[] = [];
    for (const { campo, mensaje } of error.errores) {
      if (campo === "") sinCampo.push(mensaje);
      else porCampo.push({ campo: mapaDeCampos[campo] ?? campo, mensaje });
    }
    return { porCampo, deLaOperacion: sinCampo.length > 0 ? sinCampo.join("; ") : null };
  }
  if (error.estado === 409 && campoDelConflicto !== undefined) {
    return { porCampo: [{ campo: campoDelConflicto, mensaje: error.message }], deLaOperacion: null };
  }
  return { porCampo: [], deLaOperacion: error.message };
}

/** Rechazo de una escritura con su ubicación y si el servidor pudo haberla registrado. */
export interface FalloDeOperacion extends ErroresDeFormulario {
  /** Verdadero si la escritura no obtuvo respuesta: no se sabe si el servidor la registró. */
  resultadoIncierto: boolean;
  /** Código HTTP del rechazo, o `null` si no hubo respuesta o el error no es de la API. */
  estado: number | null;
}

function esErrorDeOperacion(valor: unknown): valor is ErrorDeOperacion & { resultadoIncierto?: boolean } {
  if (typeof valor !== "object" || valor === null) return false;
  const candidato = valor as { message?: unknown; errores?: unknown };
  return typeof candidato.message === "string" && Array.isArray(candidato.errores);
}

/**
 * Como `erroresDeFormulario`, pero acepta cualquier valor lanzado: un error de
 * repositorio se ubica según su forma y se informa si su resultado es incierto;
 * un `Error` común es un error de la operación y todo lo demás recibe el mensaje
 * genérico.
 */
export function describirFallo(
  error: unknown,
  mapaDeCampos: MapaDeCampos,
  campoDelConflicto?: string,
): FalloDeOperacion {
  if (esErrorDeOperacion(error)) {
    return {
      ...erroresDeFormulario(error, mapaDeCampos, campoDelConflicto),
      resultadoIncierto: error.resultadoIncierto === true,
      estado: error.estado ?? null,
    };
  }
  const mensaje =
    error instanceof Error && error.message !== "" ? error.message : "Ocurrió un error inesperado.";
  return { porCampo: [], deLaOperacion: mensaje, resultadoIncierto: false, estado: null };
}
