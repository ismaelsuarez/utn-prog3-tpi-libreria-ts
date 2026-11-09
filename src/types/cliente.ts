import type { Id } from "./primitivos";

export interface Perfil {
  id: Id;
  cliente_id: Id;
  telefono: string | null;
  direccion: string | null;
}

export interface PerfilNuevo {
  telefono?: string | null;
  direccion?: string | null;
}

export interface Cliente {
  id: Id;
  nombre: string;
  email: string;
  perfil: Perfil | null;
}

/** Forma resumida con la que aparece un cliente dentro de una venta. */
export interface ClienteRef {
  id: Id;
  nombre: string;
  email: string;
}

export interface ClienteNuevo {
  nombre: string;
  email: string;
}

export interface ClienteCambios {
  nombre?: string | null;
  email?: string | null;
}
