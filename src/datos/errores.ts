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
