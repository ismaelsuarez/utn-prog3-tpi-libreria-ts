import type { Dinero } from "../types/primitivos";

const DECIMAL_NO_NEGATIVO = /^\d+(?:\.\d+)?$/;

/**
 * Convierte un importe (número o texto decimal) a centavos enteros, redondeando
 * al centavo con mitades hacia arriba. Devuelve `null` si no es un importe
 * utilizable: negativo, no finito, texto que no es un decimal, o resultado fuera
 * del rango de enteros seguros.
 *
 * Opera sobre los dígitos decimales y no multiplica el valor binario por 100:
 * `1.005` produce `101`.
 */
export function aCentavos(importe: number | Dinero): number | null {
  if (typeof importe === "number") {
    if (!Number.isFinite(importe) || importe < 0) return null;
  } else if (!DECIMAL_NO_NEGATIVO.test(importe)) {
    return null;
  }
  const partes = String(importe).toLowerCase().split("e");
  const decimal = (partes[0] ?? "").split(".");
  const digitos = decimal.join("");
  // Ubicación del corte en centavos sobre los dígitos, incluido el exponente.
  const corte = (decimal[0] ?? "").length + Number(partes[1] ?? 0) + 2;
  const enteros = corte <= 0 ? "0" : digitos.slice(0, corte).padEnd(corte, "0");
  const siguiente = corte < 0 ? "0" : (digitos[corte] ?? "0");
  const centavos = Number(enteros) + (siguiente >= "5" ? 1 : 0);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** Formatea centavos enteros como texto decimal con dos decimales. */
export function centavosADinero(centavos: number): Dinero {
  const enteros = Math.floor(centavos / 100);
  const resto = centavos % 100;
  return `${enteros}.${String(resto).padStart(2, "0")}`;
}

/** Normaliza un importe a texto decimal con dos decimales, o `null` si no es utilizable. */
export function aDinero(importe: number | Dinero): Dinero | null {
  const centavos = aCentavos(importe);
  return centavos === null ? null : centavosADinero(centavos);
}

/** Muestra un importe como `$ 1500,00`. Lanza `RangeError` si no es un importe. */
export function formatearImporte(importe: number | Dinero): string {
  const texto = aDinero(importe);
  if (texto === null) {
    throw new RangeError(`El valor no es un importe: ${String(importe)}`);
  }
  return `$ ${texto.replace(".", ",")}`;
}
