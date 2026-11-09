// Adaptadores de lectura sobre la API de producción (solo `GET`). El `unknown`
// del cliente se estrecha aquí, la única frontera de confianza: se comprueba que
// un listado sea un arreglo y que un detalle sea un objeto; la forma de cada
// elemento la garantizan los fixtures reales con `satisfies`.
import type { FiltroLibros } from "../../types/api";
import type { Editorial } from "../../types/editorial";
import type { Genero } from "../../types/genero";
import type { Libro, LibroDetalle } from "../../types/libro";
import type { Id } from "../../types/primitivos";
import type { RepositorioEditoriales, RepositorioGeneros, RepositorioLecturaLibros } from "../repositorios";
import type { ClienteHttp, ParametrosDeConsulta } from "./cliente-http";
import { ErrorDeApi, MENSAJE_FORMATO } from "./errores-api";
import { mapearConLimite, recorrerPaginas } from "./paginacion";

/** Consultas de detalle simultáneas al completar los autores del listado de libros. */
export const CONCURRENCIA_DE_DETALLES = 4;

export interface RepositoriosApi {
  libros: RepositorioLecturaLibros;
  editoriales: RepositorioEditoriales;
  generos: RepositorioGeneros;
}

function comoArreglo<T>(valor: unknown): T[] {
  if (!Array.isArray(valor)) throw new ErrorDeApi(MENSAJE_FORMATO, "formato");
  return valor as T[];
}

function comoObjeto<T>(valor: unknown): T {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    throw new ErrorDeApi(MENSAJE_FORMATO, "formato");
  }
  return valor as T;
}

export function crearRepositoriosApi(cliente: ClienteHttp): RepositoriosApi {
  async function pedirListado<T>(ruta: string, parametros: ParametrosDeConsulta): Promise<T[]> {
    return comoArreglo<T>(await cliente.obtener(ruta, parametros));
  }

  async function obtenerLibro(id: Id): Promise<LibroDetalle> {
    return comoObjeto<LibroDetalle>(await cliente.obtener(`/libros/${id}`));
  }

  async function listarLibros(filtro: FiltroLibros = {}): Promise<LibroDetalle[]> {
    const { limit, offset, titulo, genero_id } = filtro;
    const pagina = (l?: number, o?: number): Promise<Libro[]> =>
      pedirListado<Libro>("/libros/", { limit: l, offset: o, titulo, genero_id });
    const resumenes =
      limit !== undefined || offset !== undefined ? await pagina(limit, offset) : await recorrerPaginas(pagina);
    // `GET /libros/` no trae autores: cada libro se completa con su detalle.
    return mapearConLimite(resumenes, CONCURRENCIA_DE_DETALLES, (libro) => obtenerLibro(libro.id));
  }

  return {
    libros: { listar: listarLibros, obtener: obtenerLibro },
    editoriales: {
      listar: () => recorrerPaginas((limit, offset) => pedirListado<Editorial>("/editoriales/", { limit, offset })),
    },
    generos: {
      listar: () => recorrerPaginas((limit, offset) => pedirListado<Genero>("/generos/", { limit, offset })),
    },
  };
}
