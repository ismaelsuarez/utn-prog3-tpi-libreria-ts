// Adaptadores sobre la API de producción (`GET` y `POST`). El `unknown` del
// cliente se estrecha aquí, la única frontera de confianza: se comprueba que un
// listado sea un arreglo y que un detalle sea un objeto; la forma de cada
// elemento la garantizan los fixtures reales con `satisfies`. Las altas
// entregan la representación que devuelve el servidor, nunca lo enviado.
import type { FiltroLibros } from "../../types/api";
import type { Autor } from "../../types/autor";
import type { Cliente, ClienteNuevo, Perfil, PerfilNuevo } from "../../types/cliente";
import type { Editorial } from "../../types/editorial";
import type { Genero } from "../../types/genero";
import type { Libro, LibroDetalle, LibroNuevo } from "../../types/libro";
import type { Id } from "../../types/primitivos";
import type { Venta, VentaNueva } from "../../types/venta";
import { aDinero } from "../../logica/dinero";
import { ErrorDeRepositorio } from "../errores";
import type {
  RepositorioAutores,
  RepositorioClientes,
  RepositorioEditoriales,
  RepositorioGeneros,
  RepositorioLibros,
  RepositorioVentas,
} from "../repositorios";
import type { ClienteHttp, ParametrosDeConsulta } from "./cliente-http";
import { ErrorDeApi, MENSAJE_FORMATO } from "./errores-api";
import { mapearConLimite, recorrerPaginas, sondearPorIdentificador } from "./paginacion";

/** Consultas de detalle simultáneas al completar los autores del listado de libros. */
export const CONCURRENCIA_DE_DETALLES = 4;

export interface RepositoriosApi {
  libros: RepositorioLibros;
  editoriales: RepositorioEditoriales;
  generos: RepositorioGeneros;
  autores: RepositorioAutores;
  clientes: RepositorioClientes;
  ventas: RepositorioVentas;
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

  async function crearLibro(libro: LibroNuevo): Promise<LibroDetalle> {
    const precio = aDinero(libro.precio);
    if (precio === null) throw new ErrorDeRepositorio("El precio no es un importe válido.");
    const cuerpo = {
      isbn: libro.isbn,
      titulo: libro.titulo,
      precio,
      stock: libro.stock,
      editorial_id: libro.editorial_id,
      genero_id: libro.genero_id ?? null,
      autores: (libro.autores ?? []).map(({ autor_id, rol, orden }) => ({ autor_id, rol, orden })),
    };
    return comoObjeto<LibroDetalle>(await cliente.enviar("POST", "/libros/", cuerpo));
  }

  const listarVentas = (): Promise<Venta[]> =>
    recorrerPaginas((limit, offset) => pedirListado<Venta>("/ventas/", { limit, offset }));

  async function listarClientes(): Promise<Cliente[]> {
    // Los clientes que mencionan las ventas existen: el sondeo no termina antes de ellos.
    const ventas = await listarVentas();
    return sondearPorIdentificador(
      async (id) => comoObjeto<Cliente>(await cliente.obtener(`/clientes/${id}`)),
      { conocidos: ventas.map((venta) => venta.cliente.id) },
    );
  }

  async function listarAutores(): Promise<Autor[]> {
    // Los autores que mencionan los detalles de los libros existen.
    const libros = await listarLibros();
    return sondearPorIdentificador(
      async (id) => comoObjeto<Autor>(await cliente.obtener(`/autores/${id}`)),
      { conocidos: libros.flatMap((libro) => libro.autores.map((autor) => autor.autor_id)) },
    );
  }

  return {
    libros: { listar: listarLibros, obtener: obtenerLibro, crear: crearLibro },
    editoriales: {
      listar: () => recorrerPaginas((limit, offset) => pedirListado<Editorial>("/editoriales/", { limit, offset })),
    },
    generos: {
      listar: () => recorrerPaginas((limit, offset) => pedirListado<Genero>("/generos/", { limit, offset })),
    },
    autores: { listar: listarAutores },
    clientes: {
      listar: listarClientes,
      obtener: async (id: Id) => comoObjeto<Cliente>(await cliente.obtener(`/clientes/${id}`)),
      crear: async ({ nombre, email }: ClienteNuevo) =>
        comoObjeto<Cliente>(await cliente.enviar("POST", "/clientes/", { nombre, email })),
      crearPerfil: async (id: Id, { telefono, direccion }: PerfilNuevo) =>
        comoObjeto<Perfil>(
          await cliente.enviar("POST", `/clientes/${id}/perfil`, {
            telefono: telefono ?? null,
            direccion: direccion === undefined || direccion === null || direccion.trim() === "" ? null : direccion,
          }),
        ),
    },
    ventas: {
      listar: listarVentas,
      crear: async ({ cliente_id, renglones }: VentaNueva) =>
        comoObjeto<Venta>(
          await cliente.enviar("POST", "/ventas/", {
            cliente_id,
            renglones: renglones.map(({ libro_id, cantidad }) => ({ libro_id, cantidad })),
          }),
        ),
    },
  };
}
