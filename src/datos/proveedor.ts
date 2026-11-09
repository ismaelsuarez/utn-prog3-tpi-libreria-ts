// Raíz de composición: las vistas importan solo este módulo para obtener los
// repositorios. Hoy todos son los locales, sobre el almacenamiento del
// navegador; los changes siguientes cambian aquí (y en los adaptadores) el
// origen de los datos sin tocar las vistas. Los usuarios y la sesión se quedan en
// el navegador (la API no tiene usuarios): los atiende `autenticacion`.
import { crearServicioAutenticacion } from "./autenticacion";
import type { ServicioAutenticacion } from "./autenticacion";
import { crearAlmacenUsuarios } from "./local/almacen-usuarios";
import { obtenerAlmacenamientoDelNavegador, crearAlmacenLocal } from "./local/almacen-local";
import type { AlmacenamientoInyectable } from "./local/almacen-local";
import { crearRepositoriosLocales } from "./local/repositorios-locales";
import type { OpcionesRepositoriosLocales } from "./local/repositorios-locales";
import type { Repositorios } from "./repositorios";

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

export const autenticacion = crearServicioDeAutenticacion(obtenerAlmacenamientoDelNavegador());
