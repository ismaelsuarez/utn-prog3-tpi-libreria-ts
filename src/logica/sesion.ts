// Lógica pura de la sesión: validación de lo guardado, destino según el rol y
// rutas entre páginas. Sin DOM ni almacenamiento (regla dura 6); la consumen el
// servicio de autenticación y, más adelante, la protección de rutas.
import type { IUser } from "../types/IUser";
import type { Rol } from "../types/Rol";
import type { UsuarioRegistrado } from "../types/usuario";

export type DestinoDeRuta =
  | "login"
  | "registro"
  | "catalogo"
  | "libros"
  | "clientes"
  | "ventas"
  | "historial";

export interface OpcionesDeRuta {
  /** Agrega `?cuenta=creada` para que el login anuncie el alta (solo con `login`). */
  cuentaCreada?: boolean;
}

const ZONA_Y_VISTA: Record<DestinoDeRuta, string> = {
  login: "auth/login/login.html",
  registro: "auth/registro/registro.html",
  catalogo: "client/catalogo/catalogo.html",
  libros: "admin/libros/libros.html",
  clientes: "admin/clientes/clientes.html",
  ventas: "admin/ventas/ventas.html",
  historial: "admin/historial/historial.html",
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function esHexadecimal(valor: unknown): valor is string {
  return typeof valor === "string" && /^[0-9a-f]+$/i.test(valor);
}

export function esRol(valor: unknown): valor is Rol {
  return valor === "client" || valor === "admin";
}

/** Una sesión es válida solo si `loggedIn` es exactamente `true` y el rol es conocido. */
export function esSesion(valor: unknown): valor is IUser {
  return (
    esObjeto(valor) &&
    esTextoNoVacio(valor.email) &&
    valor.loggedIn === true &&
    esRol(valor.role)
  );
}

/** Forma de un elemento de `users`; lo que no la cumple se ignora al leer. */
export function esUsuarioRegistrado(valor: unknown): valor is UsuarioRegistrado {
  if (!esObjeto(valor) || !esTextoNoVacio(valor.email) || !esRol(valor.role)) return false;
  if (!esTextoNoVacio(valor.creadoEn)) return false;
  const contrasena = valor.contrasena;
  return (
    esObjeto(contrasena) &&
    contrasena.algoritmo === "PBKDF2-SHA-256" &&
    typeof contrasena.iteraciones === "number" &&
    Number.isInteger(contrasena.iteraciones) &&
    contrasena.iteraciones > 0 &&
    esHexadecimal(contrasena.sal) &&
    esHexadecimal(contrasena.huella)
  );
}

/** La sesión que se guarda en `userData`: sin la contraseña ni su huella. */
export function aSesion(usuario: Pick<UsuarioRegistrado, "email" | "role">): IUser {
  return { email: usuario.email, loggedIn: true, role: usuario.role };
}

export function destinoPorRol(rol: Rol): "libros" | "catalogo" {
  return rol === "admin" ? "libros" : "catalogo";
}

/**
 * Ruta relativa a otra página, para armarla desde cualquier página de
 * `src/pages/<zona>/<vista>/` (todas están a esa profundidad). Relativa para
 * funcionar también cuando la compilación se sirve bajo una subruta.
 */
export function rutaDe(destino: DestinoDeRuta, opciones: OpcionesDeRuta = {}): string {
  const marca = destino === "login" && opciones.cuentaCreada === true ? "?cuenta=creada" : "";
  return `../../${ZONA_Y_VISTA[destino]}${marca}`;
}

/** True si la parte de búsqueda de la dirección (`location.search`) trae `cuenta=creada`. */
export function esCuentaCreada(busqueda: string): boolean {
  return new URLSearchParams(busqueda).get("cuenta") === "creada";
}
