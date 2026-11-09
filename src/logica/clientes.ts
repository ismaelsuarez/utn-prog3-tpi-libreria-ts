// Lógica pura del alta y edición de clientes (RN-CL-01 a RN-CL-04). No toca el
// DOM ni el almacenamiento. El formato del email se valida con una expresión
// simple tras normalizar (SU-07 / PA-11).
import type { ErrorDeCampo } from "../types/formulario";
import type { Id } from "../types/primitivos";
import { normalizarEmail } from "./texto";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_TELEFONO = /^\+?[\d\s().-]+$/;

/** Datos de un cliente tal como los arma un formulario antes de validarlos. */
export interface BorradorCliente {
  nombre: string;
  email: string;
  telefono?: string;
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
  }

  // RN-CL-02, RN-CL-03 y RN-CL-04: al editar se excluye el propio identificador.
  // Se comparan los email recortados y en minúsculas.
  const email = normalizarEmail(datos.email);
  if (email === "") {
    errores.push({ campo: "email", mensaje: "El email es obligatorio." });
  } else if (!FORMATO_EMAIL.test(email)) {
    errores.push({ campo: "email", mensaje: "El email no tiene un formato válido." });
  } else if (
    clientes.some(
      (cliente) => cliente.id !== idEnEdicion && normalizarEmail(cliente.email) === email,
    )
  ) {
    errores.push({ campo: "email", mensaje: "Ese email ya está registrado." });
  }

  // El teléfono es obligatorio: de 7 a 15 dígitos.
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
  }

  return errores;
}
