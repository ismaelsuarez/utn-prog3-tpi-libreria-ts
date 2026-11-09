/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { obtenerBaseApi } from "./src/datos/api/base";

const desdeRaiz = (ruta: string): string =>
  fileURLToPath(new URL(ruta, import.meta.url));

const API_DE_PRODUCCION = "https://api.ismaelsuarez.me";

export default defineConfig(({ mode }) => {
  // Se leen todas las variables (prefijo "") porque API_PROXY_TARGET es solo de
  // servidor: no lleva el prefijo VITE_ y nunca llega al código del navegador.
  const env = loadEnv(mode, process.cwd(), "");
  const base = obtenerBaseApi(env.VITE_API_BASE);
  const proxy = {
    [base]: {
      target: env.API_PROXY_TARGET || API_DE_PRODUCCION,
      changeOrigin: true,
      rewrite: (ruta: string): string => ruta.slice(base.length),
    },
  };

  return {
    base: "./",
    server: { proxy },
    preview: { proxy },
    build: {
      rollupOptions: {
        input: {
          index: desdeRaiz("./index.html"),
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
    },
  };
});
