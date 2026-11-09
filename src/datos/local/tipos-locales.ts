// Forma de los registros tal como el almacén local los guarda en el almacenamiento del navegador
// (versión anterior de la aplicación): identificadores de texto con prefijo,
// precios numéricos y relaciones por identificador. El adaptador de
// `repositorios-locales.ts` los traduce a la forma de la API.

export interface EditorialLocal {
  id: string;
  nombre: string;
  /** Dato de transición que exige la forma de la API; no se persiste. */
  pais: string;
}

export interface GeneroLocal {
  id: string;
  nombre: string;
}

export interface AutorLocal {
  id: string;
  nombre: string;
  /** Dato de transición que exige la forma de la API; no se persiste. */
  nacionalidad: string;
}

export interface LibroLocal {
  id: string;
  titulo: string;
  isbn: string;
  precio: number;
  editorialId: string;
  generoId: string | null;
  autorIds: string[];
}

export interface ClienteLocal {
  id: string;
  nombreCompleto: string;
  email: string;
  telefono?: string;
}

export interface ClienteDeVentaLocal {
  id: string;
  nombreCompleto: string;
  email: string;
}

export interface RenglonLocal {
  libroId: string;
  titulo: string;
  isbn: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface VentaLocal {
  id: string;
  fecha: string;
  cliente: ClienteDeVentaLocal;
  renglones: RenglonLocal[];
  total: number;
}

export interface DatosIniciales {
  editoriales: EditorialLocal[];
  generos: GeneroLocal[];
  autores: AutorLocal[];
  libros: LibroLocal[];
  clientes: ClienteLocal[];
}
