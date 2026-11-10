# Proposal

## Why

La aplicación solo funciona con `npm run dev` o `npm run preview`, porque la API de producción `https://api.ismaelsuarez.me` no envía cabeceras CORS y el navegador la alcanza únicamente por el reenvío de `/api` del mismo origen que hoy hace Vite. Para que el bibliotecario la use de verdad hace falta un servidor de producción que sirva la compilación y haga ese reenvío, desplegado en `https://libreria.ismaelsuarez.me`, en el mismo VPS (Hostinger + Easypanel) que la API. Es el último change de la serie (T-06): además cierra la entrega del TPI, que se califica por un archivo `.zip` «correctamente comprimido y con estructura de carpetas respetada» y un proyecto que ejecuta.

## What Changes

- **Contenedor de producción**: `Dockerfile` multietapa en la raíz (Node compila con `npm ci` y `npm run build`; nginx sin privilegios sirve `dist/`), con versiones de imagen fijadas, `.dockerignore` y comprobación de salud propia (`/healthz`, respondida por nginx sin reenviar).
- **Reenvío de `/api` en producción**: nginx reenvía `/api/…` al destino `API_UPSTREAM` (por defecto la API por la red interna de Easypanel, `http://libreria_api:8000`; alternativa pública `https://api.ismaelsuarez.me`) quitando el prefijo con la misma regla que Vite, resolviendo el nombre en cada solicitud (el contenedor arranca aunque el destino no exista aún), con SNI y verificación TLS cuando el destino es HTTPS, tiempos acordes al límite de 10 s del cliente, sin reintentos, límite de cuerpo y reescritura de las cabeceras `Location` de las redirecciones del destino (307 por barra final) para que nunca lleven al navegador a otro origen. En producción las escrituras **sí** se reenvían: la guarda de desarrollo no existe en el contenedor.
- **Servicio de la compilación**: páginas múltiples sin respaldo de SPA (una ruta inexistente es 404), redirección de `/` y `/index.html` al login hecha por el servidor, caché inmutable para `assets/` con huella y `no-cache` para el HTML, compresión gzip y cabeceras de seguridad (CSP estricta compatible con la aplicación, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`).
- **Comprobación del contenedor**: un script de solo lectura (`GET`/`HEAD`) que verifica salud, redirección, cabeceras, caché y el reenvío de `/api` contra cualquier dirección base; sirve para la verificación local y para la prueba de humo después del despliegue.
- **Lista de pasos de Easypanel para el humano**: el agente no accede al VPS ni despliega; documenta el servicio a crear (App `web` en el proyecto `libreria`), la rama `main`, la compilación con Dockerfile, el puerto interno, el dominio con HTTPS, el registro DNS, la salud, cómo redesplegar y volver atrás, y las pruebas de humo.
- **Entrega**: `npm run entrega` genera el `.zip` con `git archive` a partir del último commit (sin dependencias nuevas), incluyendo `tests/`, con la lista de inclusión y exclusión documentada; README final (aplicación desplegada, despliegue, entrega y casos manuales del contenedor).
- Documentación: README, `CHANGES.md`, `CLAUDE.md`/`AGENTS.md` (comandos, stack, lista de entrega), `knowledge-base/` (08, 09 y 10).

## Capabilities

### New Capabilities

- `despliegue`: el servidor de producción del frontend: servicio de la compilación multipágina, reenvío de `/api` al destino configurado, salud, caché y cabeceras de seguridad, y su configuración por variables de entorno.

### Modified Capabilities

- `compilacion-y-pruebas`: se agrega el paquete de entrega (`npm run entrega`), con su contenido y su exclusión de archivos de desarrollo.

## Impact

- Archivos nuevos: `Dockerfile`, `.dockerignore`, `despliegue/` (plantilla de nginx, cabeceras, script de comprobación y lista de pasos de Easypanel).
- Archivos modificados: `package.json` (solo el script `entrega`; ninguna dependencia nueva), `.gitignore` (el `.zip` generado), `README.md`, `CHANGES.md`, `CLAUDE.md`, `AGENTS.md`, `knowledge-base/**`. El código de `src/` no cambia.
- Sistemas: un servicio nuevo en Easypanel y el registro DNS de `libreria.ismaelsuarez.me`, ambos a cargo del usuario. La API de producción no se modifica; la aplicación desplegada escribe en ella cuando la opera el bibliotecario.
- Verificación: Docker local; las escrituras de verificación van solo a un backend local (receta del README), y contra producción solo `GET`.
- Gobernanza ALTO (entrega y entorno): no se escribe código hasta aprobar las decisiones marcadas en `design.md`.
- Fuera de alcance: modificar o redesplegar la API, CORS en la API, autenticación real en el servidor, integración continua, monitoreo, HSTS y cualquier acción sobre el VPS por parte del agente.
