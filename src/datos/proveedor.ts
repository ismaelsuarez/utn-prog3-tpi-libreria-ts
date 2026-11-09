// Raíz de composición: las vistas importan solo este módulo para obtener los
// repositorios. Todos los datos de negocio (libros, editoriales, géneros,
// autores, clientes y ventas) salen de la API por la base `/api` del mismo
// origen (`VITE_API_BASE`) con un único cliente HTTP; crear los repositorios no
// hace solicitudes. Los usuarios y la sesión se quedan en el navegador (la API no
// tiene usuarios): los atiende `autenticacion`.
import { crearServicioAutenticacion } from "./autenticacion";
import type { ServicioAutenticacion } from "./autenticacion";
import { crearAlmacenUsuarios } from "./local/almacen-usuarios";
import { obtenerAlmacenamientoDelNavegador } from "./local/almacen-local";
import type { AlmacenamientoInyectable } from "./local/almacen-local";
import { obtenerBaseApi } from "./api/base";
import { crearClienteHttp } from "./api/cliente-http";
import { crearRepositoriosApi } from "./api/repositorios-api";
import type { RepositorioLecturaLibros } from "./repositorios";

/**
 * Crea el servicio de autenticación sobre el almacenamiento indicado e invoca
 * una sola vez la siembra del administrador (si `users` existe, se respeta).
 */
export function crearServicioDeAutenticacion(
  almacenamiento: AlmacenamientoInyectable | null,
): ServicioAutenticacion {
  const almacen = crearAlmacenUsuarios(almacenamiento);
  almacen.inicializar();
  return crearServicioAutenticacion(almacen);
}

const repositorios = crearRepositoriosApi(
  crearClienteHttp({ base: obtenerBaseApi(import.meta.env.VITE_API_BASE) }),
);

export const repositorioLibros = repositorios.libros;
export const repositorioEditoriales = repositorios.editoriales;
export const repositorioGeneros = repositorios.generos;
export const repositorioAutores = repositorios.autores;
export const repositorioClientes = repositorios.clientes;
export const repositorioVentas = repositorios.ventas;

/**
 * Libros para el Catálogo, solo de lectura: expone únicamente `listar` y
 * `obtener`, aunque el adaptador también sepa crear.
 */
export const repositorioCatalogo: RepositorioLecturaLibros = {
  listar: repositorios.libros.listar,
  obtener: repositorios.libros.obtener,
};

export const autenticacion = crearServicioDeAutenticacion(obtenerAlmacenamientoDelNavegador());
