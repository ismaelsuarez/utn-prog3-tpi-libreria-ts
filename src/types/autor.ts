import type { Id } from "./primitivos";

export type RolAutoria = "autor" | "coautor" | "traductor" | "ilustrador";

export interface Autor {
  id: Id;
  nombre: string;
  nacionalidad: string;
}

export interface AutorNuevo {
  nombre: string;
  nacionalidad: string;
}

export interface AutorCambios {
  nombre?: string | null;
  nacionalidad?: string | null;
}

/** Vínculo de un autor con un libro al crearlo. */
export interface Autoria {
  autor_id: Id;
  rol: RolAutoria;
  orden: number;
}

/** Autor tal como aparece dentro del detalle de un libro. */
export interface AutorConRol {
  autor_id: Id;
  nombre: string;
  rol: RolAutoria;
  orden: number;
}
