// Límites del servidor que la API no valida en sus esquemas y que, al excederse,
// producen un error de datos (500) en lugar de un rechazo claro. Se comprueban
// aquí, antes de enviar, para mostrar un mensaje junto al campo.

/** Máximo de una columna `integer` (stock y cantidad). */
export const ENTERO_MAXIMO_DE_LA_API = 2_147_483_647;
export const ENTERO_MAXIMO_DE_LA_API_TEXTO = "2 147 483 647";

/** Longitudes máximas de las columnas de texto. */
export const LARGO_MAXIMO = {
  isbn: 20,
  titulo: 200,
  nombre: 100,
  email: 255,
  telefono: 30,
  direccion: 255,
} as const;

/** Importe máximo de `numeric(10,2)`, en centavos. */
export const PRECIO_MAXIMO_EN_CENTAVOS = 9_999_999_999;
export const PRECIO_MAXIMO_TEXTO = "99 999 999,99";
