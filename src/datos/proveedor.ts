// Raíz de composición: las vistas importan solo este módulo para obtener los
// repositorios. Durante la transición conviven dos orígenes: el Catálogo lee los
// libros de la API de producción (`repositorioCatalogo`, solo lectura, por la base
// `/api` del mismo origen) y las vistas de gestión siguen sobre el almacén local
// del navegador hasta `operaciones-contra-api`, que cambia aquí (y en los
// adaptadores) el origen de los datos sin tocar las vistas. Los usuarios y la
// sesión se quedan en el navegador (la API no tiene usuarios): los atiende
// `autenticacion`.
import { crearServicioAutenticacion } from "./autenticacion";
import type { ServicioAutenticacion } from "./autenticacion";
import { crearAlmacenUsuarios } from "./local/almacen-usuarios";
import { obtenerAlmacenamientoDelNavegador, crearAlmacenLocal } from "./local/almacen-local";
import type { AlmacenamientoInyectable } from "./local/almacen-local";
import { crearRepositoriosLocales } from "./local/repositorios-locales";
import type { OpcionesRepositoriosLocales } from "./local/repositorios-locales";
import { obtenerBaseApi } from "./api/base";
import { crearClienteHttp } from "./api/cliente-http";
import { crearRepositoriosApi } from "./api/repositorios-api";
import type { Repositorios, RepositorioLecturaLibros } from "./repositorios";

/**
 * Crea los repositorios locales sobre el almacenamiento indicado e invoca una
 * sola vez la siembra de las claves ausentes (las presentes se respetan), de modo
 * que las vistas no llaman a `inicializar()`.
 */
export function crearProveedor(
  almacenamiento: AlmacenamientoInyectable | null,
  opciones?: OpcionesRepositoriosLocales,
): Repositorios {
  const almacen = crearAlmacenLocal(almacenamiento);
  almacen.inicializar();
  return crearRepositoriosLocales(almacen, opciones);
}

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

const repositorios = crearProveedor(obtenerAlmacenamientoDelNavegador());

export const repositorioLibros = repositorios.libros;
export const repositorioEditoriales = repositorios.editoriales;
export const repositorioGeneros = repositorios.generos;
export const repositorioAutores = repositorios.autores;
export const repositorioClientes = repositorios.clientes;
export const repositorioVentas = repositorios.ventas;

/**
 * Libros de la API de producción para el Catálogo. Crear el repositorio no hace
 * solicitudes: la red se usa recién al llamar `listar` u `obtener`.
 */
export const repositorioCatalogo: RepositorioLecturaLibros = crearRepositoriosApi(
  crearClienteHttp({ base: obtenerBaseApi(import.meta.env.VITE_API_BASE) }),
).libros;

export const autenticacion = crearServicioDeAutenticacion(obtenerAlmacenamientoDelNavegador());
