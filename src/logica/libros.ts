// Lógica pura del alta de libros (RN-LI-01 a RN-LI-11). No toca el DOM ni el
// almacenamiento: recibe los catálogos como datos para no acoplarse a los
// repositorios ni a la vista.
import type { Autor, Autoria } from "../types/autor";
import type { Editorial } from "../types/editorial";
import type { ErrorDeCampo } from "../types/formulario";
import type { Genero } from "../types/genero";
import type { Libro } from "../types/libro";
import type { Id } from "../types/primitivos";
import { normalizarIsbn } from "./texto";

/**
 * Datos de un libro tal como los arma un formulario antes de validarlos: con la
 * forma de `LibroNuevo` pero con los campos todavía sin comprobar (el precio
 * puede ser texto, la editorial puede faltar).
 */
export interface BorradorLibro {
  titulo: string;
  isbn: string;
  precio: string | number;
  editorial_id?: Id | null;
  genero_id?: Id | null;
  autores?: readonly Autoria[];
}

export interface CatalogosDeLibros {
  editoriales: readonly Pick<Editorial, "id">[];
  generos: readonly Pick<Genero, "id">[];
  autores: readonly Pick<Autor, "id">[];
}

export function validarLibro(
  datos: BorradorLibro,
  libros: readonly Pick<Libro, "isbn">[],
  catalogos: CatalogosDeLibros,
): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];

  // RN-LI-01
  if (datos.titulo.trim() === "") {
    errores.push({ campo: "titulo", mensaje: "El título es obligatorio." });
  }

  // RN-LI-02, RN-LI-03 y RN-LI-04: se comparan los ISBN sin separadores y sin
  // validar el dígito de control.
  const isbn = normalizarIsbn(datos.isbn);
  if (isbn === "") {
    errores.push({ campo: "isbn", mensaje: "El ISBN es obligatorio." });
  } else if (libros.some((libro) => normalizarIsbn(libro.isbn) === isbn)) {
    errores.push({ campo: "isbn", mensaje: "Ese ISBN ya está registrado." });
  }

  // RN-LI-05
  const precioTexto = String(datos.precio).trim();
  const precio = precioTexto === "" ? Number.NaN : Number(precioTexto);
  if (Number.isNaN(precio)) {
    errores.push({ campo: "precio", mensaje: "El precio debe ser un valor numérico." });
  } else if (precio <= 0) {
    errores.push({ campo: "precio", mensaje: "El precio debe ser mayor que cero." });
  }

  // RN-LI-06
  const editorialId = datos.editorial_id;
  if (editorialId === null || editorialId === undefined || !Number.isFinite(editorialId)) {
    errores.push({ campo: "editorial", mensaje: "Debes elegir una editorial." });
  } else if (!catalogos.editoriales.some((editorial) => editorial.id === editorialId)) {
    errores.push({ campo: "editorial", mensaje: "La editorial elegida no existe en los datos." });
  }

  // RN-LI-07 y RN-LI-08: un solo error para todo el grupo.
  const autores = datos.autores ?? [];
  if (autores.length === 0) {
    errores.push({ campo: "autores", mensaje: "Debes seleccionar al menos un autor." });
  } else if (
    autores.some((autoria) => !catalogos.autores.some((autor) => autor.id === autoria.autor_id))
  ) {
    errores.push({ campo: "autores", mensaje: "Hay autores que no existen en los datos." });
  }

  // RN-LI-09: el género es opcional; solo se valida si vino asignado.
  const generoId = datos.genero_id;
  if (
    generoId !== null &&
    generoId !== undefined &&
    !catalogos.generos.some((genero) => genero.id === generoId)
  ) {
    errores.push({ campo: "genero", mensaje: "El género elegido no existe en los datos." });
  }

  return errores;
}
