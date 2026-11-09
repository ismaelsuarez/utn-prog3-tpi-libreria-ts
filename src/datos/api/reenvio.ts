// Guarda del reenvío de desarrollo: `npm run dev` y `npm run preview` nunca
// reenvían una escritura a la API de producción. Solo lo importan
// `vite.config.ts` y las pruebas; ninguna página, de modo que la dirección de
// producción no entra en la compilación.

export const API_DE_PRODUCCION = "https://api.ismaelsuarez.me";

export const MENSAJE_ESCRITURA_BLOQUEADA =
  "El servidor de desarrollo no reenvía escrituras a la API de producción. Usá un backend local con API_PROXY_TARGET.";

const ANFITRION_DE_PRODUCCION = new URL(API_DE_PRODUCCION).hostname;
const METODOS_DE_LECTURA = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizarAnfitrion(anfitrion: string): string {
  return anfitrion.toLowerCase().replace(/\.+$/, "");
}

function anfitrionDe(destino: string): string | null {
  const texto = destino.trim();
  for (const candidato of [texto, `http://${texto}`]) {
    try {
      const { hostname } = new URL(candidato);
      if (hostname !== "") return normalizarAnfitrion(hostname);
    } catch {
      // Se prueba la forma siguiente.
    }
  }
  return null;
}

/**
 * Verdadera si `metodo` no es una lectura (`GET`, `HEAD`, `OPTIONS`) y el
 * anfitrión de `destino` es el de la API de producción. Un método ausente se
 * trata como escritura; un destino que no se puede interpretar no coincide.
 */
export function debeRechazarEscritura(metodo: string | undefined, destino: string): boolean {
  if (METODOS_DE_LECTURA.has((metodo ?? "").toUpperCase())) return false;
  return anfitrionDe(destino) === ANFITRION_DE_PRODUCCION;
}

export interface SolicitudDeGuarda {
  method?: string;
  url?: string;
}

export interface RespuestaDeGuarda {
  statusCode: number;
  setHeader(nombre: string, valor: string): unknown;
  end(cuerpo?: string): unknown;
}

export interface OpcionesDeGuarda {
  /** Base del mismo origen que se reenvía, por ejemplo `/api`. */
  base: string;
  /** Destino del reenvío (`API_PROXY_TARGET` o la API de producción). */
  destino: string;
}

// Misma regla de prefijo que el reenvío de Vite: toma toda ruta que empiece con
// la base, sin exigir una barra después (`/apiclientes/` se reenvía como
// `/clientes/`). Una regla más estricta dejaría pasar escrituras a producción.
function esDeLaBase(url: string, base: string): boolean {
  return url.startsWith(base);
}

/**
 * Intermediario para el servidor de desarrollo y el de previsualización: debe
 * registrarse antes del reenvío. Responde `403` y no continúa si la solicitud
 * es una escritura bajo la base y el destino es producción.
 */
export function crearIntermediarioDeGuarda(
  opciones: OpcionesDeGuarda,
): (solicitud: SolicitudDeGuarda, respuesta: RespuestaDeGuarda, siguiente: () => void) => void {
  const { base, destino } = opciones;
  return (solicitud, respuesta, siguiente) => {
    if (esDeLaBase(solicitud.url ?? "", base) && debeRechazarEscritura(solicitud.method, destino)) {
      respuesta.statusCode = 403;
      respuesta.setHeader("Content-Type", "application/json; charset=utf-8");
      respuesta.end(JSON.stringify({ detail: MENSAJE_ESCRITURA_BLOQUEADA }));
      return;
    }
    siguiente();
  };
}
