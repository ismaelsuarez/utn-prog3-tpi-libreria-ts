// Lógica pura del alta y edición de clientes (RN-CL-01 a RN-CL-04). No toca el
// DOM ni el almacenamiento. El formato del email se valida con una expresión
// simple tras normalizar (SU-07 / PA-11).
import type { Cliente, ClienteNuevo, PerfilNuevo } from "../types/cliente";
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

/**
 * Cuerpo del perfil a partir de lo escrito: teléfono recortado y con los
 * espacios juntos, dirección recortada; vacía o ausente se envía como `null`.
 */
export function perfilNuevoDesdeBorrador(datos: BorradorPerfil): PerfilNuevo {
  const direccion = (datos.direccion ?? "").trim();
  return {
    telefono: (datos.telefono ?? "").trim().replace(/\s+/g, " "),
    direccion: direccion === "" ? null : direccion,
  };
}

/** Las dos escrituras del alta, tal como las ofrece el repositorio de clientes. */
export interface EscrituraDeClientes {
  crear(cliente: ClienteNuevo): Promise<Cliente>;
  crearPerfil(id: Id, perfil: PerfilNuevo): Promise<unknown>;
}

export type ResultadoDeAlta =
  /** Cliente y perfil registrados. */
  | { tipo: "completo"; cliente: Cliente }
  /** El cliente se rechazó: no se envió el perfil. */
  | { tipo: "rechazado"; error: unknown }
  /** El cliente quedó registrado pero el perfil falló; no se repite ninguna escritura. */
  | { tipo: "sin-perfil"; cliente: Cliente; error: unknown };

/**
 * Alta en dos escrituras (D6): primero el cliente y, solo si se registró, su
 * perfil. Cada escritura se envía una sola vez; si el perfil falla no se
 * «deshace» nada (la API no tiene `DELETE`) y el cliente puede completarlo luego.
 */
export async function registrarClienteConPerfil(
  repositorio: EscrituraDeClientes,
  datos: BorradorCliente,
): Promise<ResultadoDeAlta> {
  let cliente: Cliente;
  try {
    cliente = await repositorio.crear({
      nombre: datos.nombre.trim(),
      email: normalizarEmail(datos.email),
    });
  } catch (error) {
    return { tipo: "rechazado", error };
  }
  try {
    await repositorio.crearPerfil(cliente.id, perfilNuevoDesdeBorrador(datos));
  } catch (error) {
    return { tipo: "sin-perfil", cliente, error };
  }
  return { tipo: "completo", cliente };
}

/** Mensaje de un alta cuyo cliente quedó registrado pero sin perfil. */
export function mensajeDePerfilFallido(error: unknown): string {
  const motivo =
    error instanceof Error && error.message !== "" ? error.message : "Ocurrió un error inesperado.";
  return (
    `El cliente se registró, pero no se pudo guardar su teléfono y dirección: ${motivo.replace(/\.+$/, "")}. ` +
    "Podés completarlos con «Completar perfil»."
  );
}
