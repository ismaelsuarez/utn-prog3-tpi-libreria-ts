import type { Id } from "./primitivos";

export interface Editorial {
  id: Id;
  nombre: string;
  pais: string;
}

/** Forma resumida con la que aparece una editorial dentro de un libro. */
export interface EditorialRef {
  id: Id;
  nombre: string;
}

export interface EditorialNueva {
  nombre: string;
  pais: string;
}

export interface EditorialCambios {
  nombre?: string | null;
  pais?: string | null;
}
