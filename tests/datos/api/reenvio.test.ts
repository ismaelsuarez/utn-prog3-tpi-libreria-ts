import { describe, expect, test, vi } from "vitest";
import {
  API_DE_PRODUCCION,
  MENSAJE_ESCRITURA_BLOQUEADA,
  crearIntermediarioDeGuarda,
  debeRechazarEscritura,
} from "../../../src/datos/api/reenvio";

describe("debeRechazarEscritura", () => {
  test.each(["POST", "PUT", "PATCH", "DELETE"])("rechaza %s hacia la API de producción", (metodo) => {
    expect(debeRechazarEscritura(metodo, "https://api.ismaelsuarez.me")).toBe(true);
  });

  test.each(["GET", "HEAD", "OPTIONS"])("deja pasar %s hacia la API de producción", (metodo) => {
    expect(debeRechazarEscritura(metodo, "https://api.ismaelsuarez.me")).toBe(false);
  });

  test("el método se compara sin distinguir mayúsculas", () => {
    expect(debeRechazarEscritura("post", API_DE_PRODUCCION)).toBe(true);
    expect(debeRechazarEscritura("get", API_DE_PRODUCCION)).toBe(false);
    expect(debeRechazarEscritura("Options", API_DE_PRODUCCION)).toBe(false);
  });

  test("un método ausente se trata como escritura", () => {
    expect(debeRechazarEscritura(undefined, API_DE_PRODUCCION)).toBe(true);
    expect(debeRechazarEscritura("", API_DE_PRODUCCION)).toBe(true);
  });

  test.each([
    "https://api.ismaelsuarez.me/",
    "https://api.ismaelsuarez.me//",
    "https://API.IsmaelSuarez.ME",
    "https://api.ismaelsuarez.me:443",
    "http://api.ismaelsuarez.me",
    "https://api.ismaelsuarez.me./",
    "https://api.ismaelsuarez.me/api/v1",
    "  https://api.ismaelsuarez.me  ",
    "https://127.0.0.1@api.ismaelsuarez.me",
    "api.ismaelsuarez.me",
    "API.ISMAELSUAREZ.ME:443/x",
  ])("rechaza una escritura hacia %s", (destino) => {
    expect(debeRechazarEscritura("POST", destino)).toBe(true);
  });

  test.each([
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://otra-api.ismaelsuarez.me",
    "https://api.ismaelsuarez.me.example.com",
    "https://ismaelsuarez.me",
    "http://127.0.0.1:8000/api.ismaelsuarez.me",
  ])("permite una escritura hacia %s", (destino) => {
    expect(debeRechazarEscritura("POST", destino)).toBe(false);
  });
});

interface RespuestaSimulada {
  statusCode: number;
  cabeceras: Record<string, string>;
  cuerpo: string;
  setHeader(nombre: string, valor: string): void;
  end(cuerpo?: string): void;
}

function respuestaSimulada(): RespuestaSimulada {
  const respuesta: RespuestaSimulada = {
    statusCode: 200,
    cabeceras: {},
    cuerpo: "",
    setHeader(nombre, valor) {
      respuesta.cabeceras[nombre.toLowerCase()] = valor;
    },
    end(cuerpo = "") {
      respuesta.cuerpo = cuerpo;
    },
  };
  return respuesta;
}

function ejecutar(
  guarda: ReturnType<typeof crearIntermediarioDeGuarda>,
  metodo: string,
  url: string,
): { respuesta: RespuestaSimulada; siguiente: ReturnType<typeof vi.fn> } {
  const respuesta = respuestaSimulada();
  const siguiente = vi.fn();
  guarda({ method: metodo, url }, respuesta, siguiente);
  return { respuesta, siguiente };
}

describe("crearIntermediarioDeGuarda", () => {
  const produccion = crearIntermediarioDeGuarda({ base: "/api", destino: API_DE_PRODUCCION });

  test("responde 403 con el detail y no continúa ante una escritura bajo /api hacia producción", () => {
    const { respuesta, siguiente } = ejecutar(produccion, "POST", "/api/clientes/");
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.cabeceras["content-type"]).toContain("application/json");
    expect(JSON.parse(respuesta.cuerpo)).toEqual({ detail: MENSAJE_ESCRITURA_BLOQUEADA });
    expect(siguiente).not.toHaveBeenCalled();
  });

  test("el detail explica la causa y la salida con un backend local", () => {
    expect(MENSAJE_ESCRITURA_BLOQUEADA).toBe(
      "El servidor de desarrollo no reenvía escrituras a la API de producción. Usá un backend local con API_PROXY_TARGET.",
    );
  });

  test.each(["PUT", "PATCH", "DELETE", "post"])("también rechaza %s", (metodo) => {
    const { respuesta, siguiente } = ejecutar(produccion, metodo, "/api/ventas/");
    expect(respuesta.statusCode).toBe(403);
    expect(siguiente).not.toHaveBeenCalled();
  });

  test("rechaza la escritura aunque lleve parámetros de consulta o sea la propia base", () => {
    expect(ejecutar(produccion, "POST", "/api?x=1").respuesta.statusCode).toBe(403);
    expect(ejecutar(produccion, "POST", "/api/libros/?x=1").respuesta.statusCode).toBe(403);
  });

  test.each(["GET", "HEAD", "OPTIONS"])("continúa con %s hacia producción sin responder", (metodo) => {
    const { respuesta, siguiente } = ejecutar(produccion, metodo, "/api/health/live");
    expect(siguiente).toHaveBeenCalledTimes(1);
    expect(respuesta.cuerpo).toBe("");
    expect(respuesta.statusCode).toBe(200);
  });

  test("no toca las solicitudes que no son de la base de la API", () => {
    const { respuesta, siguiente } = ejecutar(produccion, "POST", "/otra-ruta");
    expect(siguiente).toHaveBeenCalledTimes(1);
    expect(respuesta.cuerpo).toBe("");
  });

  // El reenvío de Vite toma toda ruta que empiece con la base (sin exigir una
  // barra después) y le quita esos caracteres: `/apiclientes/` llega a
  // producción como `/clientes/`. La guarda usa la misma regla de prefijo.
  test.each(["/apiclientes/", "/apiX/libros/", "/api%2Fclientes/", "/apiario/x"])(
    "rechaza %s, que el reenvío también mandaría a producción",
    (url) => {
      const { respuesta, siguiente } = ejecutar(produccion, "POST", url);
      expect(respuesta.statusCode).toBe(403);
      expect(siguiente).not.toHaveBeenCalled();
    },
  );

  test("con esas rutas, una lectura sigue hacia el reenvío", () => {
    expect(ejecutar(produccion, "GET", "/apiclientes/").siguiente).toHaveBeenCalledTimes(1);
  });

  test("con un backend local la escritura continúa hacia el reenvío", () => {
    const local = crearIntermediarioDeGuarda({ base: "/api", destino: "http://127.0.0.1:8000" });
    const { respuesta, siguiente } = ejecutar(local, "POST", "/api/clientes/");
    expect(siguiente).toHaveBeenCalledTimes(1);
    expect(respuesta.cuerpo).toBe("");
  });

  test("producción configurada en forma explícita también se rechaza", () => {
    const explicita = crearIntermediarioDeGuarda({ base: "/api", destino: "https://api.ismaelsuarez.me/" });
    expect(ejecutar(explicita, "POST", "/api/ventas/").respuesta.statusCode).toBe(403);
  });

  test("respeta una base configurada distinta de /api", () => {
    const otra = crearIntermediarioDeGuarda({ base: "/servicio", destino: API_DE_PRODUCCION });
    expect(ejecutar(otra, "POST", "/servicio/ventas/").respuesta.statusCode).toBe(403);
    expect(ejecutar(otra, "POST", "/api/ventas/").siguiente).toHaveBeenCalledTimes(1);
  });
});
