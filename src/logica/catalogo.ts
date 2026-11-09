import type { AutorConRol } from "../types/autor";
import type { GeneroRef } from "../types/genero";
import { normalizarTexto } from "./texto";

export type EstadoDelListado = "vacio" | "sin-resultados" | "con-resultados";

export const TEXTO_SIN_GENERO = "Sin clasificar";

export function filtrarPorTitulo<T extends { titulo: string }>(
  libros: readonly T[],
  textoBuscado: string,
): T[] {
  const buscado = normalizarTexto(textoBuscado);
  return libros.filter((libro) => normalizarTexto(libro.titulo).includes(buscado));
}

export function nombreGenero(genero: GeneroRef | null): string {
  return genero === null ? TEXTO_SIN_GENERO : genero.nombre;
}

/** Nombres de los autores separados por coma, en el orden de `orden`. */
export function nombresAutores(autores: readonly AutorConRol[]): string {
  return [...autores]
    .sort((a, b) => a.orden - b.orden)
    .map((autor) => autor.nombre)
    .join(", ");
}

export function estadoDelListado(
  totalLibros: number,
  coincidencias: number,
): EstadoDelListado {
  if (totalLibros === 0) return "vacio";
  if (coincidencias === 0) return "sin-resultados";
  return "con-resultados";
}
