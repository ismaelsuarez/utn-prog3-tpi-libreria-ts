// Protección de contraseñas con PBKDF2-SHA-256 de la Web Crypto API (nativa; la
// regla dura 1 impide bcrypt o argon2). Guarda solo una huella derivada con una
// sal aleatoria propia del usuario, junto con los parámetros para verificarla.
// Es una medida contra la exposición de contraseñas reutilizadas, no seguridad
// real: todo corre en el navegador. `crypto.subtle` solo existe en contextos
// seguros (localhost o HTTPS).
import type { ContrasenaGuardada } from "../../types/usuario";
import { ErrorDeCriptografia } from "../errores";

export const ITERACIONES_POR_DEFECTO = 100000;

const BYTES_DE_SAL = 16;
const BITS_DE_HUELLA = 256;

/** Lo que se necesita de `Crypto`; una interfaz incompleta cuenta como ausente. */
export type CryptoInyectable = Partial<Pick<Crypto, "getRandomValues" | "subtle">>;

export interface OpcionesDeContrasena {
  /** Por defecto, `globalThis.crypto`. Inyectable para probar el caso «no disponible». */
  crypto?: CryptoInyectable;
  /** Solo para protegerla: las pruebas que no miden el costo usan pocas iteraciones. */
  iteraciones?: number;
}

function aHexadecimal(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function desdeHexadecimal(texto: string): Uint8Array<ArrayBuffer> | null {
  if (texto.length === 0 || texto.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(texto)) return null;
  const bytes = new Uint8Array(texto.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(texto.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function obtenerSubtle(crypto: CryptoInyectable): SubtleCrypto {
  if (crypto.subtle === undefined || typeof crypto.getRandomValues !== "function") {
    throw new ErrorDeCriptografia();
  }
  return crypto.subtle;
}

async function derivar(
  subtle: SubtleCrypto,
  contrasena: string,
  sal: Uint8Array<ArrayBuffer>,
  iteraciones: number,
): Promise<string> {
  const clave = await subtle.importKey(
    "raw",
    new TextEncoder().encode(contrasena),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteraciones },
    clave,
    BITS_DE_HUELLA,
  );
  return aHexadecimal(new Uint8Array(bits));
}

/** Comparación en tiempo constante respecto del contenido (mismo largo). */
function sonIguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i += 1) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}

export async function protegerContrasena(
  contrasena: string,
  opciones: OpcionesDeContrasena = {},
): Promise<ContrasenaGuardada> {
  const crypto = opciones.crypto ?? globalThis.crypto;
  const subtle = obtenerSubtle(crypto);
  const iteraciones = opciones.iteraciones ?? ITERACIONES_POR_DEFECTO;
  const sal = new Uint8Array(BYTES_DE_SAL);
  crypto.getRandomValues?.(sal);
  return {
    algoritmo: "PBKDF2-SHA-256",
    iteraciones,
    sal: aHexadecimal(sal),
    huella: await derivar(subtle, contrasena, sal, iteraciones),
  };
}

/** Recalcula la huella con la sal y los parámetros guardados y la compara. */
export async function verificarContrasena(
  contrasena: string,
  guardada: ContrasenaGuardada,
  opciones: Pick<OpcionesDeContrasena, "crypto"> = {},
): Promise<boolean> {
  const subtle = obtenerSubtle(opciones.crypto ?? globalThis.crypto);
  const sal = desdeHexadecimal(guardada.sal);
  if (sal === null || !Number.isInteger(guardada.iteraciones) || guardada.iteraciones < 1) {
    return false;
  }
  const huella = await derivar(subtle, contrasena, sal, guardada.iteraciones);
  return sonIguales(huella, guardada.huella.toLowerCase());
}
