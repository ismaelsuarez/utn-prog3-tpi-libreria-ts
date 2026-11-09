# Proposal

## Why

El TPI de TypeScript exige que el frontend de la librería se construya con Vite y TypeScript estricto sobre la estructura del repositorio base `chiro45/proteger_rutas`, con tipos específicos en todo el proyecto, y que los datos de negocio provengan de la API ya desplegada en `https://api.ismaelsuarez.me`, que no puede modificarse ni redesplegarse («el backend que ahora esta en produccion digamos no lo puedo tocar, tengo que tocar el frontend»). Hoy el proyecto es HTML/CSS/JS con scripts clásicos, sin `package.json`, con datos en `localStorage` y pruebas `node --test`. Este primer change de la serie TypeScript migra la base técnica sin cambiar el comportamiento visible, para que los changes siguientes solo cambien adaptadores y agreguen funciones.

## What Changes

- **BREAKING (herramientas)**: el proyecto pasa a requerir Node y npm. Se agregan `package.json` (`"type": "module"`; scripts `dev` = `vite`, `build` = `tsc && vite build`, `preview` = `vite preview`, `test`), Vite 7, TypeScript ~5.8 y `tsconfig.json` estricto en modo *bundler* (`target` ES2022, `module` ESNext, `noEmit`, `noUnusedLocals`, `noUnusedParameters`), y `vite.config.ts` multipágina (`build.rollupOptions.input`, `base: "./"`). Deja de valer la apertura con doble clic desde `file://`.
- **BREAKING (rutas)**: las vistas se mudan a `src/pages/<zona>/<vista>/<vista>.html` + `<vista>.ts` cargado con `<script type="module">`, en las zonas `auth`, `admin` y `client` del repositorio base. El Catálogo queda en la zona `client` (lectura, alcanzable por `client` y `admin`); Libros, Clientes, Ventas e Historial quedan en la zona `admin`. El `index.html` raíz pasa a redirigir: en este change, al Catálogo; el change `registro-login-y-sesion` lo apuntará al login.
- Scripts clásicos con espacio de nombres global `Libreria` y exportación dual → módulos ES de TypeScript con `import`/`export`; la lógica pura sigue sin DOM en `src/logica/`.
- Tipos de dominio en `src/types/` alineados con los DTO de la API de producción (libros, detalle con autores, editoriales, géneros, autores, clientes, perfil, ventas, renglones, errores de la API, paginación) más `IUser` y `Rol` (`"client" | "admin"`) del repositorio base.
- Frontera de acceso a datos: interfaces de repositorio asíncronas y tipadas con esos tipos de dominio; las páginas dependen solo de ellas. La implementación vigente es un adaptador sobre el almacén local actual (mismas claves y mismo formato de `localStorage`), reemplazable por el cliente HTTP en `cliente-http-y-catalogo` sin tocar páginas. No se agregan funciones de negocio nuevas sobre `localStorage`.
- Convención de API del mismo origen: la aplicación usa una base relativa configurable (`VITE_API_BASE`, por defecto `/api`); en desarrollo `server.proxy` reenvía `/api` a la API de producción (`changeOrigin`, sin el prefijo). La API no envía cabeceras CORS, por eso nunca se la llama desde otro origen; el proxy de producción (contenedor propio en el VPS) se resuelve en `despliegue-frontend`.
- Pruebas: `node --test` → Vitest con TypeScript, conservando los casos aplicables de las siete suites actuales.
- Documentación: actualización de reglas duras obsoletas en `CLAUDE.md`/`AGENTS.md`, de `CHANGES.md` (serie TypeScript de seis changes), de `knowledge-base/08_arquitectura_propuesta.md`, `knowledge-base/09_decisiones_y_supuestos.md` y del `README.md` (cómo instalar, ejecutar, compilar y probar).

## Capabilities

### New Capabilities

- `compilacion-y-pruebas`: proyecto TypeScript estricto compilable con un comando, tipos específicos sin `any`, comandos de desarrollo, compilación, vista previa y pruebas, y salida multipágina que funciona servida desde cualquier subruta.
- `acceso-a-datos`: frontera única, tipada y asíncrona entre las vistas y el origen de los datos, con forma de datos alineada a la API de producción, y convención de base del mismo origen (`/api`) con reenvío en desarrollo.

### Modified Capabilities

- `estructura-y-navegacion`: la página de entrada redirige al Catálogo; se elimina «Apertura sin servidor» (reemplazada por la ejecución con las herramientas de `compilacion-y-pruebas`); se agregan la organización de vistas por zona (`/client/`, `/admin/`) y la prohibición de recursos de otros orígenes.
- `datos-locales`: «Lectura centralizada en el Almacén» pasa a ser «el almacén local implementa transitoriamente los repositorios»; «Identificadores estables» deja de referirse a `file://` y fija cómo se exponen los identificadores de texto como numéricos.

## Impact

- Código: se reemplazan `index.html`, `libros.html`, `clientes.html`, `ventas.html`, `historial.html`, `js/**`, `css/**`, `img/**` y `tests/*.test.js` por `index.html` (redirección), `src/pages/**`, `src/logica/**`, `src/datos/**`, `src/types/**`, `src/utils/**`, `src/styles/**`, `src/assets/**`, `src/main.ts` y `tests/**/*.test.ts`. Se agregan `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`; `.gitignore` suma `node_modules/` y `dist/`.
- Dependencias nuevas (solo de desarrollo): `vite`, `typescript`, `vitest`, `@types/node`.
- Datos: el formato de `libreria.libros`, `libreria.clientes` y `libreria.ventas` no cambia; lo ya guardado en un navegador se sigue leyendo (mismo origen de servidor de desarrollo). Ningún pedido de escritura a la API de producción; las únicas llamadas reales de este change son GET de verificación del proxy.
- Requisitos que la serie reemplazará y que este change conserva porque la aplicación todavía los usa: «Datos iniciales de ejemplo» de libros y clientes y la persistencia de negocio en `localStorage` (`datos-locales`), reemplazados por la API en `cliente-http-y-catalogo` y `operaciones-contra-api`.
- Fuera de alcance (changes siguientes): `cliente-http-y-catalogo` (cliente `fetch` tipado sobre `/api`, catálogo, editoriales y géneros desde la API), `registro-login-y-sesion` (`users`, `userData`, semilla `admin`), `proteccion-de-rutas-y-roles` (intercepción en `src/main.ts`), `operaciones-contra-api` (altas de libros con stock y autores, clientes con perfil, ventas con totales del servidor, historial; diseño para los listados de clientes y autores que la API no ofrece) y `despliegue-frontend` (contenedor nginx con proxy `/api` en Easypanel, README final y zip).
