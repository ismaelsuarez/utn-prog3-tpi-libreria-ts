import type { ErrorDeCampo } from "../types/formulario";

/**
 * Error de una operación de repositorio. `errores` lleva el detalle por campo
 * cuando la operación se rechazó por datos inválidos.
 */
export class ErrorDeRepositorio extends Error {
  readonly errores: ErrorDeCampo[];

  constructor(mensaje: string, errores: ErrorDeCampo[] = []) {
    super(mensaje);
    this.name = "ErrorDeRepositorio";
    this.errores = errores;
  }
}

/** El almacenamiento del navegador no está disponible o rechazó la escritura. */
export class ErrorDeAlmacenamiento extends Error {
  constructor(
    mensaje = "No se pudo acceder al almacenamiento del navegador. Revisá que no esté bloqueado e intentá nuevamente.",
  ) {
    super(mensaje);
    this.name = "ErrorDeAlmacenamiento";
  }
}

/** El navegador no ofrece la API de criptografía necesaria (solo en contextos seguros). */
export class ErrorDeCriptografia extends Error {
  constructor(
    mensaje = "Este navegador no ofrece la criptografía necesaria para proteger contraseñas. Abrí la aplicación desde localhost o HTTPS.",
  ) {
    super(mensaje);
    this.name = "ErrorDeCriptografia";
  }
}
