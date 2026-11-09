import type { Rol } from "./Rol";
import type { FechaIso } from "./primitivos";

/**
 * Contraseña tal como se guarda en `users`: una huella derivada con sal propia
 * del usuario y los parámetros necesarios para verificarla. Nunca el texto.
 */
export interface ContrasenaGuardada {
  algoritmo: "PBKDF2-SHA-256";
  iteraciones: number;
  /** Sal aleatoria de 16 bytes, en hexadecimal. */
  sal: string;
  /** Huella de 32 bytes, en hexadecimal. */
  huella: string;
}

/**
 * Un elemento del arreglo guardado bajo la clave `users`. `email` y `role`
 * conservan los nombres de `IUser` (los fija el repositorio base).
 */
export interface UsuarioRegistrado {
  /** Email normalizado: recortado y en minúsculas. Es la identidad del usuario. */
  email: string;
  role: Rol;
  contrasena: ContrasenaGuardada;
  creadoEn: FechaIso;
}

/** Datos del formulario de registro, tal como los escribe el visitante. */
export interface BorradorRegistro {
  email: string;
  contrasena: string;
  repeticion: string;
}

/** Datos del formulario de inicio de sesión. */
export interface CredencialesIngreso {
  email: string;
  contrasena: string;
}
