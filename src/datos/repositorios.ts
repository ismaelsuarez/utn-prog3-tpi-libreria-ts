// Frontera de acceso a datos: las vistas dependen solo de estas interfaces y de
// los tipos de dominio (`src/types/`), con la forma de los DTO de la API de
// producción. Todas las operaciones son asíncronas. Las implementa el adaptador
// de la API (`api/repositorios-api.ts`) y `proveedor.ts` es la raíz de
// composición. Solo hay las operaciones que la API ofrece (lectura y alta); no
// hay edición ni borrado (regla dura 9).
import type { Autor } from "../types/autor";
import type { Cliente, ClienteNuevo, Perfil, PerfilNuevo } from "../types/cliente";
import type { Editorial } from "../types/editorial";
import type { Genero } from "../types/genero";
import type { FiltroLibros } from "../types/api";
import type { LibroDetalle, LibroNuevo } from "../types/libro";
import type { Id } from "../types/primitivos";
import type { Venta, VentaNueva } from "../types/venta";

/** Lectura de libros: lo único que necesita el Catálogo, de modo que no pueda escribir. */
export interface RepositorioLecturaLibros {
  /** `GET /libros/` (y el detalle de cada libro: la tarjeta necesita los autores). */
  listar(filtro?: FiltroLibros): Promise<LibroDetalle[]>;
  /** `GET /libros/{id}`. */
  obtener(id: Id): Promise<LibroDetalle>;
}

export interface RepositorioLibros extends RepositorioLecturaLibros {
  /** `POST /libros/`. */
  crear(libro: LibroNuevo): Promise<LibroDetalle>;
}

export interface RepositorioEditoriales {
  /** `GET /editoriales/`. */
  listar(): Promise<Editorial[]>;
}

export interface RepositorioGeneros {
  /** `GET /generos/`. */
  listar(): Promise<Genero[]>;
}

export interface RepositorioAutores {
  /** La API no ofrece `GET /autores/`: el adaptador lo arma sondeando `GET /autores/{id}`. */
  listar(): Promise<Autor[]>;
}

export interface RepositorioClientes {
  /** La API no ofrece `GET /clientes/`: el adaptador lo arma sondeando `GET /clientes/{id}`. */
  listar(): Promise<Cliente[]>;
  /** `GET /clientes/{id}`. */
  obtener(id: Id): Promise<Cliente>;
  /** `POST /clientes/`. */
  crear(cliente: ClienteNuevo): Promise<Cliente>;
  /** `POST /clientes/{id}/perfil`: el perfil se crea una sola vez. */
  crearPerfil(id: Id, perfil: PerfilNuevo): Promise<Perfil>;
}

export interface RepositorioVentas {
  /** `GET /ventas/`. */
  listar(): Promise<Venta[]>;
  /** `POST /ventas/`: el servidor copia el precio vigente y calcula subtotales y total. */
  crear(venta: VentaNueva): Promise<Venta>;
}

export interface Repositorios {
  libros: RepositorioLibros;
  editoriales: RepositorioEditoriales;
  generos: RepositorioGeneros;
  autores: RepositorioAutores;
  clientes: RepositorioClientes;
  ventas: RepositorioVentas;
}
