import type { Id } from "./primitivos";

/** Un error de validación de la API (`ValidationError`). */
export interface ErrorValidacion {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

/** Cuerpo de las respuestas de error de la API. */
export type ErrorApi =
  | { detail: string }
  | { detail: ErrorValidacion[] };

export interface Paginacion {
  /** De 1 a 100. */
  limit?: number;
  offset?: number;
}

export interface FiltroLibros extends Paginacion {
  titulo?: string;
  genero_id?: Id;
}
