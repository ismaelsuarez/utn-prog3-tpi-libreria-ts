// Lógica pura del registro y del ingreso de usuarios. No toca el DOM ni el
// almacenamiento. Los mensajes son los del spec `usuarios-y-sesion`.
import type { ErrorDeCampo } from "../types/formulario";
import type { BorradorRegistro, CredencialesIngreso } from "../types/usuario";
import { FORMATO_EMAIL, normalizarEmail } from "./texto";

export const LARGO_MINIMO_CONTRASENA = 8;
export const LARGO_MAXIMO_CONTRASENA = 64;

/**
 * Valida el borrador de registro frente a los usuarios ya guardados. La
 * contraseña no se recorta: los espacios cuentan (NIST SP 800-63B). Devuelve
 * como máximo un error por campo, en el orden del formulario.
 */
export function validarRegistro(
  borrador: BorradorRegistro,
  usuarios: readonly { email: string }[],
): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];

  const email = normalizarEmail(borrador.email);
  if (email === "") {
    errores.push({ campo: "email", mensaje: "El email es obligatorio." });
  } else if (!FORMATO_EMAIL.test(email)) {
    errores.push({ campo: "email", mensaje: "El email no tiene un formato válido." });
  } else if (buscarPorEmail(usuarios, email) !== null) {
    errores.push({ campo: "email", mensaje: "Ese email ya está registrado." });
  }

  const largo = borrador.contrasena.length;
  if (largo === 0) {
    errores.push({ campo: "contrasena", mensaje: "La contraseña es obligatoria." });
  } else if (largo < LARGO_MINIMO_CONTRASENA || largo > LARGO_MAXIMO_CONTRASENA) {
    errores.push({
      campo: "contrasena",
      mensaje: `La contraseña debe tener entre ${LARGO_MINIMO_CONTRASENA} y ${LARGO_MAXIMO_CONTRASENA} caracteres.`,
    });
  }

  if (borrador.repeticion === "") {
    errores.push({ campo: "repeticion", mensaje: "Repetí la contraseña." });
  } else if (borrador.repeticion !== borrador.contrasena) {
    errores.push({ campo: "repeticion", mensaje: "Las contraseñas no coinciden." });
  }

  return errores;
}

/** Solo comprueba que ambos campos tengan contenido; la coincidencia la decide el servicio. */
export function validarIngreso(credenciales: CredencialesIngreso): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  if (normalizarEmail(credenciales.email) === "") {
    errores.push({ campo: "email", mensaje: "Ingresá tu email." });
  }
  if (credenciales.contrasena === "") {
    errores.push({ campo: "contrasena", mensaje: "Ingresá tu contraseña." });
  }
  return errores;
}

/** Busca por email normalizado en ambos lados; `null` si no hay coincidencia. */
export function buscarPorEmail<T extends { email: string }>(
  usuarios: readonly T[],
  email: string,
): T | null {
  const buscado = normalizarEmail(email);
  return usuarios.find((usuario) => normalizarEmail(usuario.email) === buscado) ?? null;
}
