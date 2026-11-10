# Tasks

Gobernanza ALTO (entrega y entorno): ninguna tarea de los grupos 1 a 6 empieza antes de cerrar el grupo 0. El agente **no** contacta el VPS, no usa credenciales y no despliega: el grupo 7 lo ejecuta el usuario. Ninguna verificación escribe en la API de producción: contra producción solo `GET`/`HEAD`; toda escritura va a un backend local (receta «Backend local para verificar escrituras» del README), comprobando el destino antes de escribir (design D8).

**Prueba primero, sobre configuración**: no hay lógica nueva en TypeScript (`src/` no cambia). La prueba ejecutable es `despliegue/comprobar.sh` (solo lectura) más las sondas del contenedor de cada tarea: primero se escribe o amplía la comprobación y se observa que falla (RED, se registra la salida), después la configuración mínima que la hace pasar (GREEN) y luego el ajuste con la comprobación en verde. Por cada comando existente que toque el cambio (`npm run build`, `npm test`, `npm run dev`, `npm run preview`), una comprobación de que su comportamiento previo se conserva.

**Unidades de trabajo** (≈ 400 líneas cambiadas por unidad, orientativo; previsión total ≈ 800 líneas, casi todas agregadas):

| Unidad | Grupos | Previsión | Riesgo | Commit sugerido |
|---|---|---|---|---|
| U1 | 1 | ≈ 300 | **alto, ítem 5** (entorno de despliegue) | `build(deploy): add nginx container serving the build` |
| U2 | 2 | ≈ 150 | **alto, ítem 5** (reenvío a la API; escrituras) | `build(deploy): proxy /api to the configured upstream` |
| U3 | 3 | ≈ 80 | ítem 3 solo si cambia la lista de entrega de las reglas | `build(release): add npm run entrega packaging` |
| U4 | 4–6 | ≈ 300 | ninguno (documentación y verificación) | `docs(deploy): add Easypanel checklist and container manual cases` |

U1 y U2 se revisan solos (riesgo alto). Entrega sugerida: un PR encadenado sobre el de `operaciones-contra-api`, o dos (U1–U2 y U3–U4) si supera el presupuesto.

**Superficies de edición del apply** (fuera de ellas no se escribe):

- `Dockerfile`, `.dockerignore`, `despliegue/**`
- `package.json` (solo el script `entrega`; ninguna dependencia nueva). `.gitignore` (`*.zip`) queda fuera de la superficie autorizada del apply: se informa al usuario para que lo agregue
- `README.md`, `CHANGES.md`, `CLAUDE.md`, `AGENTS.md`, `knowledge-base/**`
- `openspec/changes/despliegue-frontend/**`

Datos de prueba y carpetas temporales: siempre en `mktemp -d` fuera del repositorio; los contenedores, redes e imágenes de verificación se eliminan al terminar cada grupo.

## 0. Aprobación del plan

- [x] 0.1 Presentar al usuario las cuatro decisiones de «Open Questions» de `design.md` (destino de `/api`, rama de Easypanel, escritura de humo, contenido y nombre del `.zip`), obtener su aprobación o la alternativa elegida y registrarla en `design.md` (hecho el 2026-11-09: red interna `libreria_api:8000`, rama `main` tras los PR #1 a #6, sexto libro a cargo del usuario, `.zip` con `tests/`); verificar que, si se eligió otra alternativa, la spec y las tareas afectadas quedaron ajustadas y `openspec validate despliegue-frontend --strict` pasa
- [x] 0.2 Registrar la línea base de la rama: `npm test` (cantidad de pruebas), `npm run build` y `grep -r api.ismaelsuarez dist` vacío; verificar que todo pasa antes de tocar archivos

## 1. Imagen y servicio estático [alto riesgo: entorno de despliegue]

- [x] 1.1 RED: escribir `despliegue/comprobar.sh <base>` (POSIX `sh` + `curl`, solo `GET`/`HEAD`, una línea por caso, código distinto de 0 si alguno falla) con los casos estáticos de la spec `despliegue`: `/healthz` 200 `ok`; `/` y `/index.html` → 302 con `Location: /src/pages/auth/login/login.html`; login 200 `text/html` con `Cache-Control: no-cache`, CSP (`default-src 'self'`, `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `Server` sin versión; un recurso de `assets/` tomado del HTML del login con `Cache-Control: public, max-age=31536000, immutable`, las mismas cabeceras de seguridad y `Content-Encoding: gzip` + `Vary: Accept-Encoding`; `/no-existe.html` 404 con cabeceras de seguridad. Verificar que falla contra `nginxinc/nginx-unprivileged` sin configuración propia (registrar la salida)
- [x] 1.2 `Dockerfile` multietapa (design D1): etapa Node 22 Alpine con etiqueta exacta, `npm ci` y `npm run build`; etapa `nginxinc/nginx-unprivileged` Alpine con etiqueta exacta, puerto 8080, `ENV API_UPSTREAM=https://api.ismaelsuarez.me`, `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, `HEALTHCHECK` sobre `/healthz`; y `.dockerignore` (design D1). Verificar con `docker pull` de ambas etiquetas y `docker build -t tpi-libreria-web .` terminado sin errores desde un clon limpio (`git clone` local en `mktemp -d`)
- [x] 1.3 GREEN: `despliegue/nginx/default.conf.template` (servicio estático, `absolute_redirect off`, `server_tokens off`, entrada 302, `try_files $uri =404`, caché, gzip, `/healthz`) y `despliegue/nginx/cabeceras-seguridad.conf` (cabeceras con `always`, incluidas en cada `location`), según design D3. Verificar con `docker run -d --name tpi-libreria-web -p 127.0.0.1:8080:8080 tpi-libreria-web` y `sh despliegue/comprobar.sh http://127.0.0.1:8080` en verde para los casos de 1.1
- [x] 1.4 Sondas de la imagen (spec «Contenedor de producción» y «Salud del contenedor»): `docker exec tpi-libreria-web id -u` distinto de 0; lo servido en `/usr/share/nginx/html` sin `src/*.ts`, `node_modules/`, `tests/` ni `.env`; `grep -r "api.ismaelsuarez\|no reenvía escrituras" /usr/share/nginx/html` vacío; `docker inspect -f '{{.State.Health.Status}}'` igual a `healthy`. Verificar registrando cada salida
- [x] 1.5 Regresión de comandos existentes: `npm run build` y `npm test` con el mismo resultado que la línea base, y `npm run preview` sirve la raíz igual que antes (redirección por `index.html`); verificar comparando con 0.2
- [x] 1.6 Documentar en `README.md` la sección «Despliegue» (imagen, puerto 8080, cómo construir y correr localmente, `despliegue/comprobar.sh`) y en `knowledge-base/08_arquitectura_propuesta.md` la sección de producción (servicio estático, entrada, caché y cabeceras); agregar DD-32 a `knowledge-base/09_decisiones_y_supuestos.md`. Verificar ejecutando los comandos del README tal como están escritos
- [x] 1.7 Commit U1 (`build(deploy): add nginx container serving the build`) con los archivos del grupo; eliminar contenedor e imagen de verificación

## 2. Reenvío de `/api` [alto riesgo: escrituras a un sistema externo]

- [x] 2.1 RED: ampliar `despliegue/comprobar.sh` con los casos de lectura del reenvío: `/api` 404, `GET /apiclientes/` 404, `/api/health/ready` 200 con `"estado":"ok"`, `/api/libros` 307 con `Location: /api/libros/`, `/api/libros/?limit=1` 200 JSON, cabeceras de seguridad en la respuesta reenviada. Verificar que fallan contra la imagen de U1 (registrar la salida)
- [x] 2.2 GREEN: `map` del destino, `resolver` y `location = /api` / `location /api/` en la plantilla (design D2: `rewrite` + `proxy_pass $api_destino`, `Host $proxy_host`, `X-Forwarded-For`, SNI y verificación TLS para destinos HTTPS, tiempos 5 s/30 s/30 s, `proxy_next_upstream off`, `client_max_body_size 64k`, `proxy_redirect` con expresión, cabeceras de seguridad). Si el almacén de certificados no existe en la imagen, instalar `ca-certificates` y volver a `USER 101`. Verificar con `sh despliegue/comprobar.sh http://127.0.0.1:8080` en verde contra un contenedor con `API_UPSTREAM=https://api.ismaelsuarez.me` (alternativa pública, solo lectura) y contra el destino por defecto resuelto por un alias de red
- [x] 2.3 Escrituras y límites contra el **backend local** (receta del README, red `tpi-libreria-red`, con el contenedor de la API publicado también bajo el alias `libreria_api`): `docker run -d --name tpi-libreria-web-local --network tpi-libreria-red -p 127.0.0.1:8081:8080 tpi-libreria-web` (destino por defecto, sin `API_UPSTREAM`); **antes de escribir**, `curl -s http://127.0.0.1:8081/api/health/ready` responde y `docker logs tpi-libreria-api` muestra esa solicitud. Verificar: `sh despliegue/comprobar.sh http://127.0.0.1:8081` en verde; `POST /api/clientes/` con JSON → 201 del backend local; `POST /apiclientes/` → 404 sin línea nueva en el registro del backend; `GET /api/clientes` → 307 con `Location: /api/clientes/`; cuerpo de 65 KiB → 413 sin llegar al backend; con el backend detenido, `POST /api/ventas/` → error de pasarela (504 a los 5 s con la caché de nombres vigente, 502 inmediato al vencer)
- [x] 2.4 Destino configurable y arranque independiente: el mismo contenedor sin `API_UPSTREAM` reenvía al alias `libreria_api` y con `API_UPSTREAM=https://api.ismaelsuarez.me` a producción (solo `GET`), con una barra final en la variable también funciona, sin reconstruir; con el nombre sin resolver arranca, queda `healthy`, `/healthz` responde 200 y `/api/health/ready` responde 502 enseguida, y al conectar el alias funciona sin reiniciar. Verificar con `/api/health/ready` en cada caso y el registro del backend local
- [x] 2.5 Documentar en `README.md` (sección «Despliegue») `API_UPSTREAM` (por defecto la red interna, alternativa pública), la resolución en tiempo de ejecución y la regla de verificación sin escrituras a producción; en `knowledge-base/08` la tabla de variables con `API_UPSTREAM` y el reenvío de producción; completar DD-32. Verificar ejecutando los comandos documentados
- [x] 2.6 Commit U2 (`build(deploy): proxy /api to the configured upstream`); eliminar contenedores, imagen y recursos del backend local según el paso 7 de su receta

## 3. Paquete de entrega

- [x] 3.1 RED: en `mktemp -d`, comprobar que `npm run entrega` no existe (falla) y escribir la lista esperada de incluidos y excluidos (spec «Paquete de entrega»)
- [x] 3.2 GREEN: script `entrega` en `package.json` con `git archive` (design D7, con `tests/`). Verificar: `npm run entrega` termina con 0; `unzip -l` muestra una única carpeta raíz, todos los incluidos (`tests/` entre ellos) y ninguno de los excluidos; un cambio sin commit no aparece en el `.zip`. `*.zip` en `.gitignore` queda como aviso al usuario (fuera de la superficie autorizada)
- [x] 3.3 Proyecto que ejecuta desde el paquete: descomprimir en `mktemp -d`, `npm ci`, `npm run build` y `npm test` con código 0 y `dist/` con la entrada y las siete vistas; `docker build` desde esa carpeta también termina sin errores. Verificar registrando las salidas
- [x] 3.4 Documentar la sección «Entrega» del `README.md` (comando, contenido, exclusiones y cómo se comprueba), la lista de entrega de `CLAUDE.md` y `AGENTS.md` (copias idénticas), DD-33 en `knowledge-base/09` y PA-14 como resuelta en `knowledge-base/10`. Verificar con `diff CLAUDE.md AGENTS.md` vacío y el comando del README ejecutado tal como está escrito
- [x] 3.5 Commit U3 (`build(release): add npm run entrega packaging`)

## 4. Pasos de Easypanel para el usuario

- [x] 4.1 Escribir `despliegue/DESPLIEGUE.md` con los pasos de design D5 (integrar los PR #1 a #6 en `main`, DNS, App `web` en el proyecto `libreria`, fuente Git y rama `main`, compilación Dockerfile, entorno vacío, dominio con HTTPS al puerto 8080, Implementar y `healthy`, comprobación del nombre interno con `wget` desde la consola, prueba de humo de solo lectura, cambio al destino público y regreso, la escritura del sexto libro con pasos exactos y qué comprobar, redespliegue y vuelta atrás), sin credenciales ni datos que el usuario no haya confirmado; enlazarlo desde la sección «Despliegue» del README. Verificar que cada comando local del documento (`dig`, `sh despliegue/comprobar.sh`) se ejecuta tal como está escrito contra el contenedor local y que el documento no pide al agente ninguna acción en el VPS
- [x] 4.2 Actualizar `CLAUDE.md` y `AGENTS.md`: comando `npm run entrega`, fila de despliegue en el stack (contenedor nginx, `API_UPSTREAM`, `libreria.ismaelsuarez.me`) y, en la regla 4, que la verificación local del contenedor también escribe solo en el backend local. Verificar con `diff CLAUDE.md AGENTS.md` vacío

## 5. Verificación integrada en el navegador

- [x] 5.1 Con el contenedor apuntado al backend local (`http://127.0.0.1:8081`), en Chrome: la raíz lleva al login; ingreso del administrador de demostración; un usuario `client` no llega a `/admin/`; Catálogo con los libros del backend local; alta de un cliente que aparece en el listado; consola sin violaciones de CSP ni errores en el login, el registro y las cinco vistas, a 320 px y a 1280 px. Verificar registrando lo observado
- [x] 5.2 Con el contenedor apuntado a producción con `API_UPSTREAM=https://api.ismaelsuarez.me` (`http://127.0.0.1:8080`): solo entrada, ingreso y Catálogo con los libros de producción; ninguna escritura. Verificar registrando lo observado y las solicitudes de red (todas al mismo origen)
- [x] 5.3 Registrar los resultados observados en el README como casos manuales nuevos (CM-25 en adelante), con el comportamiento real si alguno falla (regla dura 10); actualizar «Estructura de carpetas» con `Dockerfile` y `despliegue/`. Verificar que cada caso registrado corresponde a una observación de 5.1 o 5.2

## 6. Cierre del apply

- [x] 6.1 Suite y compilación finales (`npm test`, `npm run build`), `sh despliegue/comprobar.sh` contra una imagen recién construida y `openspec validate despliegue-frontend --strict`; verificar que todo pasa y que no quedan contenedores, redes, volúmenes ni carpetas temporales de la verificación
- [x] 6.2 Commit U4 (`docs(deploy): add Easypanel checklist and container manual cases`) con los grupos 4 y 5

## 7. Despliegue en Easypanel [lo ejecuta el usuario; el agente no]

El agente no marca estas tareas por su cuenta: las marca solo cuando el usuario informa el resultado observado.

- [x] 7.1 [usuario] Integrar los PR #1 a #6, en orden, en `main`
- [x] 7.2 [usuario] (No hizo falta: el comodín ya resolvía `libreria.ismaelsuarez.me` a la IP del VPS) Crear el registro DNS `A` de `libreria.ismaelsuarez.me` y comprobar con `dig +short` que devuelve la IP del VPS
- [x] 7.3 [usuario] Crear y configurar la App `web` en el proyecto `libreria` de Easypanel según `despliegue/DESPLIEGUE.md` (fuente, rama `main`, Dockerfile, entorno vacío, dominio con HTTPS al puerto 8080) y pulsar Implementar; verificar estado `healthy` y registros sin errores; comprobar con `wget` desde su consola que `libreria_api:8000` resuelve
- [x] 7.4 [usuario] Prueba de humo de solo lectura: `sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me` en verde y, en el navegador, entrada, ingreso y Catálogo; si `/api/health/ready` responde 502 y el nombre interno no resuelve, corregir `API_UPSTREAM` o pasar a la API pública (`API_UPSTREAM=https://api.ismaelsuarez.me`)
- [x] 7.5 [usuario] Registrar el sexto libro desde la aplicación publicada (PA-15), con los pasos y comprobaciones de `despliegue/DESPLIEGUE.md`; registrar el resultado
- [x] 7.6 Registrar en el README la dirección publicada, la fecha del despliegue y el resultado de la prueba de humo informados por el usuario; verificar que el README no contiene credenciales ni datos privados

## Workflow follow-up

- Archivar con `/opsx:archive despliegue-frontend` después de la revisión y de que el usuario cierre el grupo 7 (o decida archivar con el despliegue pendiente, dejándolo registrado).
- Marcar T-06 como archivado en `CHANGES.md` y corregir sus rutas de «Leer antes» a `openspec/changes/archive/`.
- Generar el `.zip` final con `npm run entrega` sobre el último commit de la rama integrada.
