// Lógica pura de la sesión: validación de lo guardado (cotejada con `users`),
// destino según el rol, rutas entre páginas, zona de una dirección y decisión de
// acceso. Sin DOM ni almacenamiento (regla dura 6); la consumen el servicio de
// autenticación y la intercepción de la carga en `src/main.ts`.
import type { DecisionDeAcceso, DestinoDeRuta, Zona } from "../types/acceso";
import type { IUser } from "../types/IUser";
import type { Rol } from "../types/Rol";
import type { UsuarioRegistrado } from "../types/usuario";
import { normalizarEmail } from "./texto";
import { buscarPorEmail } from "./usuarios";

export type { DestinoDeRuta };

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

/**
 * La sesión vigente: `guardada` (lo leído de `userData`) debe ser una sesión
 * válida y `users` debe registrar ese email con ese mismo rol. Cualquier otra
 * cosa cuenta como sin sesión. Sigue siendo una comprobación del cliente: quien
 * edita `userData` puede editar también `users`.
 */
export function sesionVigente(
  guardada: unknown,
  usuarios: readonly UsuarioRegistrado[],
): IUser | null {
  if (!esSesion(guardada)) return null;
  const registrado = buscarPorEmail(usuarios, guardada.email);
  if (registrado === null || registrado.role !== guardada.role) return null;
  return aSesion(guardada);
}

const ZONAS: readonly Zona[] = ["auth", "client", "admin"];

/**
 * Zona de una dirección (`location.pathname`): el primero de los tres últimos
 * segmentos (`<zona>/<vista>/<archivo>`). Ignora el prefijo, así que sirve igual
 * en `npm run dev`, en la compilación y bajo una subruta. `null` si no es una
 * zona conocida.
 */
export function zonaDeRuta(ruta: string): Zona | null {
  const segmentos = ruta.split("/");
  if (segmentos.length < 3) return null;
  const zona = segmentos[segmentos.length - 3];
  return ZONAS.find((conocida) => conocida === zona) ?? null;
}

/**
 * Decide si una página de `zona` se muestra con `sesion` o a dónde se redirige.
 * Sin sesión, solo la zona `auth` se muestra; con sesión, `auth` y la zona
 * desconocida llevan al destino del rol y `admin` queda para el rol `admin`.
 * Una zona desconocida falla cerrado.
 */
export function decidirAcceso(zona: Zona | null, sesion: IUser | null): DecisionDeAcceso {
  if (sesion === null) {
    return zona === "auth" ? { tipo: "permitir" } : { tipo: "redirigir", destino: "login" };
  }
  const aSuDestino: DecisionDeAcceso = { tipo: "redirigir", destino: destinoPorRol(sesion.role) };
  if (zona === "client") return { tipo: "permitir" };
  if (zona === "admin") return sesion.role === "admin" ? { tipo: "permitir" } : aSuDestino;
  return aSuDestino;
}

/** True si ambas son la misma sesión (mismo email normalizado y rol) o ambas faltan. */
export function mismaSesion(a: IUser | null, b: IUser | null): boolean {
  if (a === null || b === null) return a === b;
  return normalizarEmail(a.email) === normalizarEmail(b.email) && a.role === b.role;
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
