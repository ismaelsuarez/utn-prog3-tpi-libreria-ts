/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base de la API del mismo origen; si falta, se usa `/api`. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
