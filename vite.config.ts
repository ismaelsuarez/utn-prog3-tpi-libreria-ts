/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { obtenerBaseApi } from "./src/datos/api/base";
import { API_DE_PRODUCCION, crearIntermediarioDeGuarda } from "./src/datos/api/reenvio";

const desdeRaiz = (ruta: string): string =>
  fileURLToPath(new URL(ruta, import.meta.url));

export default defineConfig(({ mode }) => {
  // Se leen todas las variables (prefijo "") porque API_PROXY_TARGET es solo de
  // servidor: no lleva el prefijo VITE_ y nunca llega al código del navegador.
  const env = loadEnv(mode, process.cwd(), "");
  const base = obtenerBaseApi(env.VITE_API_BASE);
  const destino = env.API_PROXY_TARGET || API_DE_PRODUCCION;
  // Guarda: se registra antes del reenvío y responde 403 a toda escritura cuyo
  // destino sea la API de producción (no hay variable para desactivarla).
  const guarda = crearIntermediarioDeGuarda({ base, destino });
  const guardaDeEscrituras: Plugin = {
    name: "guarda-de-escrituras-a-produccion",
    configureServer(servidor) {
      servidor.middlewares.use(guarda);
    },
    configurePreviewServer(servidor) {
      servidor.middlewares.use(guarda);
    },
  };
  const proxy = {
    [base]: {
      target: destino,
      changeOrigin: true,
      rewrite: (ruta: string): string => ruta.slice(base.length),
    },
  };

  return {
    base: "./",
    plugins: [guardaDeEscrituras],
    server: { proxy },
    preview: { proxy },
    build: {
      rollupOptions: {
        input: {
          index: desdeRaiz("./index.html"),
          login: desdeRaiz("./src/pages/auth/login/login.html"),
          registro: desdeRaiz("./src/pages/auth/registro/registro.html"),
          catalogo: desdeRaiz("./src/pages/client/catalogo/catalogo.html"),
          libros: desdeRaiz("./src/pages/admin/libros/libros.html"),
          clientes: desdeRaiz("./src/pages/admin/clientes/clientes.html"),
          ventas: desdeRaiz("./src/pages/admin/ventas/ventas.html"),
          historial: desdeRaiz("./src/pages/admin/historial/historial.html"),
        },
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
      setupFiles: ["tests/preparacion-sin-red.ts"],
    },
  };
});
