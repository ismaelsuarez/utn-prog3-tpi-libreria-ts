# Proposal

## Why

Hoy la raíz del sitio (`/`, `index.html`) lleva directo al formulario de login: quien llega a `https://libreria.ismaelsuarez.me` no ve qué es la librería ni qué ofrece la aplicación. El equipo pidió mejorar la visual con «una portada estática: una página de presentación de la librería, con un texto y los botones «Ingresar» y «Crear cuenta». No carga ningún dato: ni libros, ni /api. La raíz del sitio llevaría ahí en vez de al login.»

La consigna exige «sustituir la carga abierta de datos por un acceso restringido» y que «las páginas no sean accesibles mediante URL si no hay sesión»; el peor nivel de la rúbrica es «cualquier usuario puede entrar a cualquier URL sin loguearse». Por eso la portada es **estática y sin datos**: no muestra libros, no hace ninguna solicitud a `/api`, no ejecuta código de la aplicación y no cambia la protección de ninguna otra página.

## What Changes

- **Portada pública en la raíz**: `index.html` deja de redirigir al login y pasa a ser la portada de «Librería El Faro»: encabezado con la marca, presentación con la imagen de la estantería ya usada en la aplicación, un texto breve sobre la librería y lo que permite hacer la aplicación, los enlaces con forma de botón «Ingresar» y «Crear cuenta», y el pie con los integrantes. Sin scripts, sin datos de negocio, sin solicitudes a `/api`, igual con o sin sesión.
- **Entrada del servidor de producción**: nginx deja de responder `302` al login en `/` y `/index.html`; sirve la portada con `200`, `Cache-Control: no-cache` y las mismas cabeceras de seguridad (CSP estricta) que el resto de las páginas. **BREAKING** para quien dependa de que `/` redirija al login (el script `despliegue/comprobar.sh` se actualiza en este change).
- **Regreso a la portada**: la marca del encabezado de las páginas de login y de registro pasa a ser un enlace a la portada.
- **Sin cambios en la protección de rutas**: la intercepción de `src/main.ts`, las zonas `auth`, `client` y `admin` y la decisión de acceso por rol quedan exactamente como están; la portada no pertenece a ninguna zona y no carga el punto de entrada común.
- Pruebas: una prueba estructural de Vitest sobre la portada (sin scripts, sin `/api`, enlaces relativos, regiones semánticas) y de los enlaces de regreso; `comprobar.sh` actualizado para la nueva entrada.
- Documentación: README (navegación, estructura, casos manuales nuevos y los que citaban «la raíz lleva al login»), `CLAUDE.md`/`AGENTS.md` (fila de estructura), `knowledge-base/` (02, 08 y una decisión nueva en 09), `despliegue/DESPLIEGUE.md` (prueba de humo y nota de redespliegue) y `CHANGES.md` (nuevo change T-07).

## Capabilities

### New Capabilities

- `portada`: la página pública de presentación de la librería: su contenido, sus dos accesos (ingresar y crear cuenta), su independencia de los datos y de la sesión, y su accesibilidad y adaptación de tamaño.

### Modified Capabilities

- `estructura-y-navegacion`: la «Página de entrada» deja de redirigir al login y muestra la portada.
- `despliegue`: la entrada servida por el servidor (`/` y `/index.html`) entrega la portada con `200` en lugar de redirigir al login. Supuesto: esta capacidad la crea `despliegue-frontend` (T-06), aún sin archivar; T-06 se archiva antes que este change, así que esta delta modifica la especificación principal resultante.

## Impact

- Archivos modificados: `index.html` (reescrito como portada), `src/pages/auth/login/login.html` y `src/pages/auth/registro/registro.html` (marca enlazada), `despliegue/nginx/default.conf.template` (bloques de `/` y `/index.html`), `despliegue/comprobar.sh`, `despliegue/DESPLIEGUE.md`, `README.md`, `CHANGES.md`, `CLAUDE.md`, `AGENTS.md`, `knowledge-base/**`.
- Archivos nuevos: `src/styles/portada.css` (estilos propios de la portada) y una prueba estructural en `tests/`.
- Sin cambios: `src/main.ts`, `src/logica/sesion.ts`, `src/types/acceso.ts`, los repositorios, `vite.config.ts` (la entrada `index` ya existe) y las dependencias.
- Despliegue: requiere volver a implementar la App `web` en Easypanel (acción del humano).
