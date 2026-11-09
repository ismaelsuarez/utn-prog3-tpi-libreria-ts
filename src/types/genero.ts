import type { Id } from "./primitivos";

export interface Genero {
  id: Id;
  nombre: string;
}

/** Forma resumida con la que aparece un género dentro de un libro. */
export interface GeneroRef {
  id: Id;
  nombre: string;
}

export interface GeneroNuevo {
  nombre: string;
}
