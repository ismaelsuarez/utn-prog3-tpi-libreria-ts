// Frontera de acceso a datos: las vistas dependen solo de estas interfaces y de
// los tipos de dominio (`src/types/`), con la forma de los DTO de la API de
// producción. Todas las operaciones son asíncronas porque la implementación HTTP
// lo será. Hoy las implementa el adaptador local (`local/repositorios-locales.ts`)
// y `proveedor.ts` es la raíz de composición.
//
// Las operaciones marcadas «SIN ENDPOINT» no existen en la API de producción
// (que no se puede modificar); la aplicación actual las usa y el change
// `operaciones-contra-api` decide su diseño contra la API.
import type { Autor } from "../types/autor";
import type { Cliente, ClienteCambios, ClienteNuevo, Perfil, PerfilNuevo } from "../types/cliente";
import type { Editorial } from "../types/editorial";
import type { Genero } from "../types/genero";
import type { FiltroLibros } from "../types/api";
import type { LibroDetalle, LibroNuevo } from "../types/libro";
import type { Id } from "../types/primitivos";
import type { Venta, VentaNueva } from "../types/venta";

export interface RepositorioLibros {
  /** `GET /libros/` (y el detalle de cada libro: la tarjeta necesita los autores). */
  listar(filtro?: FiltroLibros): Promise<LibroDetalle[]>;
  /** `GET /libros/{id}`. */
  obtener(id: Id): Promise<LibroDetalle>;
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
  /** SIN ENDPOINT: la API no ofrece `GET /autores/` (solo alta, detalle y edición). */
  listar(): Promise<Autor[]>;
}

export interface RepositorioClientes {
  /** SIN ENDPOINT: la API no ofrece `GET /clientes/`. */
  listar(): Promise<Cliente[]>;
  /** `GET /clientes/{id}`. */
  obtener(id: Id): Promise<Cliente>;
  /** `POST /clientes/`. */
  crear(cliente: ClienteNuevo): Promise<Cliente>;
  /** `POST /clientes/{id}/perfil`. */
  crearPerfil(id: Id, perfil: PerfilNuevo): Promise<Perfil>;
  /** `PATCH /clientes/{id}`. */
  actualizar(id: Id, cambios: ClienteCambios): Promise<Cliente>;
  /** SIN ENDPOINT: la API no ofrece actualizar el perfil (teléfono) de un cliente. */
  actualizarTelefono(id: Id, telefono: string): Promise<Cliente>;
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
