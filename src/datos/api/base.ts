export const BASE_API_POR_DEFECTO = "/api";

/**
 * Base de las solicitudes a la API: siempre una ruta del mismo origen, porque la
 * API de producción no envía cabeceras CORS. Devuelve el valor recibido (por
 * ejemplo `import.meta.env.VITE_API_BASE`) sin barras finales, o `/api` si falta
 * o queda vacío.
 */
export function obtenerBaseApi(valor?: string): string {
  const base = (valor ?? "").trim().replace(/\/+$/, "");
  return base === "" ? BASE_API_POR_DEFECTO : base;
}
