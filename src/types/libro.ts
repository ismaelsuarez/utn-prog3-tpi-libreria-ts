import type { AutorConRol, Autoria, RolAutoria } from "./autor";
import type { EditorialRef } from "./editorial";
import type { GeneroRef } from "./genero";
import type { Dinero, Id } from "./primitivos";

/** `LibroRead` de la API: sin autores. */
export interface Libro {
  id: Id;
  isbn: string;
  titulo: string;
  precio: Dinero;
  stock: number;
  editorial: EditorialRef;
  genero: GeneroRef | null;
}

/** `LibroDetalleRead` de la API: el libro con sus autores. */
export interface LibroDetalle extends Libro {
  autores: AutorConRol[];
}

/** `LibroCreate` de la API: `stock` y `editorial_id` son obligatorios. */
export interface LibroNuevo {
  isbn: string;
  titulo: string;
  precio: Dinero | number;
  stock: number;
  editorial_id: Id;
  genero_id?: Id | null;
  autores?: Autoria[];
}

export interface LibroCambios {
  isbn?: string | null;
  titulo?: string | null;
  precio?: Dinero | number | null;
  stock?: number | null;
  editorial_id?: Id | null;
  genero_id?: Id | null;
}

/** Libro visto desde un autor, con el rol que ese autor cumple en él. */
export interface LibroConRol {
  libro_id: Id;
  isbn: string;
  titulo: string;
  precio: Dinero;
  stock: number;
  rol: RolAutoria;
  orden: number;
}
