// Lógica pura del alta y edición de clientes (RN-CL-01 a RN-CL-04). No toca el
// DOM ni el almacenamiento. El formato del email se valida con una expresión
// simple tras normalizar (SU-07 / PA-11).
import type { ErrorDeCampo } from "../types/formulario";
import type { Id } from "../types/primitivos";
import { LARGO_MAXIMO } from "./limites";
import { FORMATO_EMAIL, normalizarEmail } from "./texto";

const FORMATO_TELEFONO = /^\+?[\d\s().-]+$/;

/** Datos de un cliente tal como los arma un formulario antes de validarlos. */
export interface BorradorCliente {
  nombre: string;
  email: string;
  telefono?: string;
  /** Opcional: vacía se envía como `null`. */
  direccion?: string;
}

/** Teléfono y dirección del perfil (alta y «Completar perfil»). */
export type BorradorPerfil = Pick<BorradorCliente, "telefono" | "direccion">;

/** Valida el perfil solo: teléfono obligatorio de 7 a 15 dígitos y hasta 30 caracteres; dirección opcional de hasta 255. */
export function validarPerfil(datos: BorradorPerfil): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];

  const telefono = (datos.telefono ?? "").trim();
  const cantidadDigitos = telefono.replace(/\D/g, "").length;
  if (telefono === "") {
    errores.push({ campo: "telefono", mensaje: "El teléfono es obligatorio." });
  } else if (
    !FORMATO_TELEFONO.test(telefono) ||
    cantidadDigitos < 7 ||
    cantidadDigitos > 15
  ) {
    errores.push({
      campo: "telefono",
      mensaje: "Ingresá un teléfono válido (entre 7 y 15 dígitos).",
    });
  } else if (telefono.length > LARGO_MAXIMO.telefono) {
    errores.push({
      campo: "telefono",
      mensaje: `El teléfono no puede superar los ${LARGO_MAXIMO.telefono} caracteres.`,
    });
  }

  if ((datos.direccion ?? "").trim().length > LARGO_MAXIMO.direccion) {
    errores.push({
      campo: "direccion",
      mensaje: `La dirección no puede superar los ${LARGO_MAXIMO.direccion} caracteres.`,
    });
  }

  return errores;
}

export function validarCliente(
  datos: BorradorCliente,
  clientes: readonly { id: Id; email: string }[],
  idEnEdicion?: Id,
): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];

  // RN-CL-01
  if (datos.nombre.trim() === "") {
    errores.push({ campo: "nombre", mensaje: "El nombre completo es obligatorio." });
  } else if (datos.nombre.trim().length > LARGO_MAXIMO.nombre) {
    errores.push({ campo: "nombre", mensaje: `El nombre no puede superar los ${LARGO_MAXIMO.nombre} caracteres.` });
  }

  // RN-CL-02, RN-CL-03 y RN-CL-04: al editar se excluye el propio identificador.
  // Se comparan los email recortados y en minúsculas.
  const email = normalizarEmail(datos.email);
  if (email === "") {
    errores.push({ campo: "email", mensaje: "El email es obligatorio." });
  } else if (email.length > LARGO_MAXIMO.email) {
    errores.push({ campo: "email", mensaje: `El email no puede superar los ${LARGO_MAXIMO.email} caracteres.` });
  } else if (!FORMATO_EMAIL.test(email)) {
    errores.push({ campo: "email", mensaje: "El email no tiene un formato válido." });
  } else if (
    clientes.some(
      (cliente) => cliente.id !== idEnEdicion && normalizarEmail(cliente.email) === email,
    )
  ) {
    errores.push({ campo: "email", mensaje: "Ese email ya está registrado." });
  }

  errores.push(...validarPerfil(datos));

  return errores;
}
