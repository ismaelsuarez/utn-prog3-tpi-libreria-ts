// Lógica pura del alta de libros (RN-LI-01 a RN-LI-11). No toca el DOM ni el
// almacenamiento: recibe los catálogos como datos para no acoplarse a los
// repositorios ni a la vista.
import type { Autor, RolAutoria } from "../types/autor";
import type { Editorial } from "../types/editorial";
import type { ErrorDeCampo } from "../types/formulario";
import type { Genero } from "../types/genero";
import type { Libro } from "../types/libro";
import type { Id } from "../types/primitivos";
import { aCentavos } from "./dinero";
import {
  ENTERO_MAXIMO_DE_LA_API,
  ENTERO_MAXIMO_DE_LA_API_TEXTO,
  LARGO_MAXIMO,
  PRECIO_MAXIMO_EN_CENTAVOS,
  PRECIO_MAXIMO_TEXTO,
} from "./limites";
import { normalizarIsbn } from "./texto";

const ROLES_DE_AUTORIA: readonly string[] = ["autor", "coautor", "traductor", "ilustrador"] satisfies RolAutoria[];

/** Verdadero si `valor` es uno de los cuatro roles que acepta la API. */
export function esRolDeAutoria(valor: string): valor is RolAutoria {
  return ROLES_DE_AUTORIA.includes(valor);
}

/** Autoría tal como sale de la vista: el rol todavía es texto sin comprobar. */
export interface AutoriaBorrador {
  autor_id: Id;
  rol: string;
  orden: number;
}

/**
 * Datos de un libro tal como los arma un formulario antes de validarlos: con la
 * forma de `LibroNuevo` pero con los campos todavía sin comprobar (el precio
 * puede ser texto, la editorial puede faltar).
 */
export interface BorradorLibro {
  titulo: string;
  isbn: string;
  precio: string | number;
  /** Entero de 0 a 2 147 483 647; vacío, decimal, negativo o texto se rechazan. */
  stock: string | number;
  editorial_id?: Id | null;
  genero_id?: Id | null;
  autores?: readonly AutoriaBorrador[];
}

export interface CatalogosDeLibros {
  editoriales: readonly Pick<Editorial, "id">[];
  generos: readonly Pick<Genero, "id">[];
  autores: readonly Pick<Autor, "id">[];
}

function validarStock(stock: string | number): string | null {
  const texto = String(stock).trim();
  if (texto === "") return "El stock es obligatorio.";
  if (!/^\d+$/.test(texto)) return "El stock debe ser un número entero mayor o igual que cero.";
  if (Number(texto) > ENTERO_MAXIMO_DE_LA_API) {
    return `El stock no puede superar ${ENTERO_MAXIMO_DE_LA_API_TEXTO}.`;
  }
  return null;
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
  } else if (datos.titulo.trim().length > LARGO_MAXIMO.titulo) {
    errores.push({ campo: "titulo", mensaje: `El título no puede superar los ${LARGO_MAXIMO.titulo} caracteres.` });
  }

  // RN-LI-02, RN-LI-03 y RN-LI-04: se comparan los ISBN sin separadores y sin
  // validar el dígito de control.
  const isbn = normalizarIsbn(datos.isbn);
  if (isbn === "") {
    errores.push({ campo: "isbn", mensaje: "El ISBN es obligatorio." });
  } else if (datos.isbn.trim().length > LARGO_MAXIMO.isbn) {
    errores.push({ campo: "isbn", mensaje: `El ISBN no puede superar los ${LARGO_MAXIMO.isbn} caracteres.` });
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
  } else if ((aCentavos(precio) ?? Number.POSITIVE_INFINITY) > PRECIO_MAXIMO_EN_CENTAVOS) {
    // Se compara el importe ya redondeado al centavo, que es el que se envía.
    errores.push({ campo: "precio", mensaje: `El precio no puede superar ${PRECIO_MAXIMO_TEXTO}.` });
  }

  const mensajeDeStock = validarStock(datos.stock);
  if (mensajeDeStock !== null) errores.push({ campo: "stock", mensaje: mensajeDeStock });

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
  } else if (autores.some((autoria) => !esRolDeAutoria(autoria.rol))) {
    errores.push({ campo: "autores", mensaje: "Hay autores con un rol que no es válido." });
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
