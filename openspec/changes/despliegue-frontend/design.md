# Design

## Context

Ver `proposal.md` (Why). Estado actual que condiciona el diseño:

- `vite.config.ts` compila ocho páginas (`index.html` y siete vistas bajo `src/pages/`) con `base: "./"`; la salida es `dist/index.html`, `dist/src/pages/<zona>/<vista>/<vista>.html` y `dist/assets/*` con huella de contenido. No hay otra carpeta servida.
- `index.html` redirige al login con un `<script>` en línea (`window.location.replace`) y un `<meta http-equiv="refresh">` dentro de `<noscript>`. Es el **único** script en línea: las páginas de `src/pages/` no tienen `<script>` en línea ni atributos `style=`; los módulos cambian estilos solo por CSSOM (`elemento.style.…`, `ticket-venta.ts`, `ficha-libro.ts`), que la CSP no bloquea. El favicon es `data:,`.
- El reenvío de Vite usa `proxy[base]` con `rewrite: ruta.slice(base.length)`: toma toda ruta que **empieza** con `/api` (también `/apiclientes/`) y presenta el origen del destino (`changeOrigin`). La guarda (`src/datos/api/reenvio.ts`) solo la importan `vite.config.ts` y las pruebas; la compilación actual no contiene `api.ismaelsuarez` (comprobado sobre `dist/`).
- El cliente HTTP cancela cada solicitud a los 10 s (`TIEMPO_LIMITE_POR_DEFECTO_MS`), no reintenta y trata los errores de pasarela de una escritura como resultado incierto.
- La API responde 307 hacia su propio origen cuando a una colección le falta la barra final; el cliente siempre la pone.
- Referencia del despliegue de la API en este VPS (`despliegue/DEPLOY.md` del backend, solo lectura): proyecto Easypanel `libreria`; servicio PostgreSQL `db` alcanzable como `libreria_db:5432` por la red interna; App `api` desde Git con ruta de compilación `/despliegue`, compilación **Dockerfile**, **Auto Deploy apagado**; dominio con destino HTTP al puerto interno 8000 y **HTTPS con Let's Encrypt** terminado por el proxy de Easypanel; estado `healthy` según el `HEALTHCHECK` de la imagen; actualizar = **Implementar**; usuario sin privilegios; sin secretos en la imagen.
- Consigna (sección de entrega y rúbrica): se califica la entrega de un archivo `.zip` «correctamente comprimido y con estructura de carpetas respetada»; lo insuficiente es un `.zip` corrupto, que no respeta la estructura «o el proyecto no ejecuta». La consigna no pide despliegue ni contenidos del README.
- Docker está disponible en la máquina de desarrollo; el agente no tiene acceso al VPS ni a Easypanel.

## Goals / Non-Goals

**Goals:**

- Una imagen reproducible que cualquiera construye desde el repositorio y que Easypanel construye desde GitHub sin configuración obligatoria.
- Reenvío de `/api` con la misma semántica que el de desarrollo en lo que el cliente usa, y más estricto en lo que no usa (prefijos parecidos).
- Verificación local completa sin escribir nunca en producción, y una prueba de humo de solo lectura reutilizable después del despliegue.
- Pasos de Easypanel que el usuario sigue sin tener que decidir nada técnico durante el despliegue.

**Non-Goals:**

- Cambiar código de `src/` o el comportamiento de `npm run dev`/`npm run preview`.
- Docker Compose, integración continua, monitoreo, HSTS, compresión previa (`gzip_static`/brotli), página 404 propia.
- Cualquier acción sobre el VPS, el DNS o Easypanel por parte del agente.

## Decisions

### D1 — Imagen multietapa con nginx sin privilegios

`Dockerfile` en la raíz (el contexto de compilación necesita `src/`, `package.json` y `tests/`):

- Etapa `compilacion`: `node:22.<x>.<y>-alpine<z>` con etiqueta exacta (Node 22 LTS cumple `engines`). `COPY package.json package-lock.json` → `npm ci` (capa reutilizable) → `COPY . .` → `npm run build` (el mismo `tsc` estricto sobre `src/` y `tests/` más `vite build`).
- Etapa final: `nginxinc/nginx-unprivileged:<1.x.y>-alpine` con etiqueta exacta. Proceso como usuario `nginx` (uid 101), puerto interno **8080**. Copia `dist/` a `/usr/share/nginx/html`, `despliegue/nginx/default.conf.template` a `/etc/nginx/templates/` y `despliegue/nginx/cabeceras-seguridad.conf` a `/etc/nginx/`. `ENV API_UPSTREAM=https://api.ismaelsuarez.me` y `ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$`, para que el `envsubst` del punto de entrada de la imagen sustituya solo esa variable (las de nginx, `$uri`, `$proxy_host`, quedan intactas). La plantilla se llama `default.conf.template`: su salida reemplaza el `default.conf` de la imagen.
- `EXPOSE 8080`; `HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1` (BusyBox `wget` viene en Alpine).
- Etiquetas exactas: en el apply se elige la última versión de parche disponible de cada línea y se confirma con `docker pull`; sin etiquetas flotantes (`latest`, `22-alpine`). El resumen criptográfico (`@sha256:`) queda como mejora opcional.
- `.dockerignore`: `node_modules`, `dist`, `.git`, `.engram`, `.githooks`, `.claude`, `.atl`, `.codegraph`, `openspec`, `knowledge-base`, `discovery`, `docs`, `*.zip`, `.env` y `.env.*` (así Vite compila con los valores por defecto y ningún `.env` local entra al contexto), `*.md` salvo lo necesario (ninguno). `tests/` **sí** entra: `npm run build` lo comprueba.

Alternativas: `npm run preview` como servidor de producción (descartada: no está hecho para producción y su guarda bloquearía las escrituras legítimas del bibliotecario); `nginx:alpine` oficial (proceso maestro como `root` y puerto 80); Caddy (equivalente, pero sin plantillas por variable integradas y menos conocido por el equipo); el generador estático de Easypanel más un proxy aparte (Easypanel no reenvía una subruta a otro dominio quitando el prefijo sin otro servidor); versionar `dist/` (descartada).

### D2 — Reenvío de `/api` (requiere aprobación: destino por defecto)

Plantilla, en esencia:

```nginx
location = /api { return 404; }
location /api/ {
    proxy_pass ${API_UPSTREAM}/;          # "/api/x" → "/x"
    proxy_http_version 1.1;
    proxy_set_header Host $proxy_host;     # anfitrión del destino (api.ismaelsuarez.me o el local)
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_ssl_server_name on;              # SNI hacia el destino HTTPS
    proxy_ssl_verify on;
    proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    proxy_connect_timeout 5s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    proxy_next_upstream off;               # sin reintentos
    client_max_body_size 64k;
    proxy_redirect ~^(?:https?://[^/]+)?/(.*)$ /api/$1;
    include /etc/nginx/cabeceras-seguridad.conf;
}
```

- **Prefijo**: `location /api/` con URI en `proxy_pass` reemplaza exactamente `/api/` por `/`. A diferencia de Vite, `/apiclientes/` no coincide y cae en el servicio estático (404, sin reenviar); `/api` sin barra responde 404 explícito (el cliente nunca lo pide). nginx compara sobre la ruta decodificada, así que `/api%2Fclientes/` se trata como `/api/clientes/` y se reenvía igual que haría el cliente con la ruta normal; nunca llega a un destino distinto.
- **Host y TLS**: `$proxy_host` sale de `API_UPSTREAM`, así el mismo archivo sirve para la API pública y para el backend local, sin escribir el anfitrión dos veces. SNI y verificación del certificado contra el almacén del sistema. Si la imagen no trae `ca-certificates.crt`, el apply lo instala en la imagen (con `USER root` temporal y vuelta a `USER 101`).
- **Tiempos**: 30 s, mayores que los 10 s del cliente, para que el único tiempo agotado que ve el operador sea el del cliente («El servidor tardó demasiado en responder.» o resultado incierto en una escritura). `proxy_next_upstream off` garantiza que nginx no repita una solicitud aunque el nombre del destino resuelva a varias direcciones.
- **Cuerpo**: 64 KiB alcanzan de sobra para el alta más grande (una venta con muchos renglones); más grande responde 413 sin reenviar.
- **`Location`**: la expresión reescribe toda redirección del destino, absoluta o relativa, a `/api/…` del mismo origen. Supuesto: el destino solo redirige hacia sí mismo (el 307 de barra final de FastAPI); por eso se acepta cualquier anfitrión en la expresión, lo que también cubre el caso en que la API arme el `Location` con `http://` o con su nombre interno.
- **Resolución**: con un nombre literal en `proxy_pass`, nginx resuelve el destino al arrancar. Si no resuelve, el contenedor no inicia y Easypanel lo reinicia. Si la dirección del destino cambia, hace falta reiniciar (Implementar). Alternativa descartada: `resolver` + variable en `proxy_pass` (exige reescritura manual de la ruta y un resolvedor distinto según la red).
- **Destino** (decisión del usuario):
  - **Recomendado para el primer despliegue: la API pública** (`https://api.ismaelsuarez.me`, valor por defecto). Funciona en cualquier red y no depende de nombres internos de Easypanel. Costo: un salto TLS y una vuelta por el proxy público del propio VPS (horquilla).
  - **Opción: red interna de Easypanel** (`API_UPSTREAM=http://libreria_api:8000`). Más rápida, sin TLS ni horquilla. El nombre es **inferido** del patrón `<proyecto>_<servicio>` que muestra `libreria_db` en el DEPLOY del backend y no está comprobado; exige que el servicio del frontend esté en la misma red interna (mismo proyecto `libreria`, recomendado) y se rompe si el servicio de la API cambia de nombre. Se activa sin reconstruir, solo con la variable.

### D3 — Servicio estático, entrada, caché y cabeceras

- `listen 8080`, `root /usr/share/nginx/html`, `server_tokens off`, **`absolute_redirect off`** (toda redirección que arma nginx, incluida la de directorio sin barra, sale como ruta relativa al origen; si no, detrás del proxy HTTPS de Easypanel saldría `http://<anfitrión>:8080/…`).
- **Entrada**: `location = /` y `location = /index.html` responden `302` a `/src/pages/auth/login/login.html`. Motivo: con `script-src 'self'` el script en línea de `index.html` no se ejecuta, y el `<meta refresh>` está dentro de `<noscript>`, así que la entrada quedaría detenida en el enlace «Ir a ingresar». Alternativas: el hash `'sha256-…'` del script en la CSP (frágil: cualquier edición de `index.html` lo rompe sin error de compilación), `'unsafe-inline'` (debilita la política para todas las páginas), o cambiar `index.html` (toca `src/` y el comportamiento de desarrollo). `index.html` sigue intacto para `npm run dev`, `npm run preview` y subrutas. Redirección 302 y no 301: los navegadores no la fijan en caché.
- **Sin respaldo de SPA**: la aplicación es multipágina y la protección de rutas decide por la ruta real; `try_files $uri =404`. 404 con la página por defecto de nginx (sin versión).
- **Caché**: `location /assets/` con `Cache-Control: public, max-age=31536000, immutable` (los nombres llevan huella); `location /` con `Cache-Control: no-cache` (solo quedan HTML fuera de `assets/`).
- **gzip**: `gzip on; gzip_vary on; gzip_min_length 1024; gzip_types text/css application/javascript application/json image/svg+xml;` (HTML siempre).
- **Cabeceras** en `cabeceras-seguridad.conf`, todas con `always` (también en 404, 413 y 502), incluido en **cada** `location` que agrega cabeceras, porque un `add_header` dentro de un `location` anula los heredados del `server`:
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` (`data:` cubre el favicon y las imágenes que Vite incrusta por debajo de 4 KiB; `connect-src` hereda `'self'`, que es `/api`).
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
  - Sin `X-Frame-Options` (lo cubre `frame-ancestors`) y sin HSTS (el TLS lo gestiona Easypanel; fijar HSTS compromete al subdominio y nadie lo pidió).
- `/healthz`: `location = /healthz { access_log off; default_type text/plain; return 200 "ok\n"; }` con las cabeceras de seguridad.

### D4 — La guarda de desarrollo no llega a producción

La guarda vive en el servidor de Vite, que el contenedor no usa; nginx reenvía las escrituras. La compilación no contiene la guarda ni la dirección de producción (lo comprueba la prueba de la imagen con `grep` sobre lo servido). No hace falta tocar `reenvio.ts`. La protección de producción pasa a ser de procedimiento: toda escritura de verificación del contenedor apunta `API_UPSTREAM` a un backend local y se comprueba el destino antes de escribir (D8).

### D5 — Pasos de Easypanel para el usuario (requiere aprobación: rama)

Se documentan en `despliegue/DESPLIEGUE.md`, a imagen del DEPLOY del backend. El agente no los ejecuta:

1. **DNS**: registro `A` `libreria` → la misma IP pública que `api.ismaelsuarez.me` (no hace falta si ya existe un comodín). Esperar a que `dig +short libreria.ismaelsuarez.me` devuelva esa IP **antes** de activar HTTPS (Let's Encrypt la valida).
2. En el proyecto **`libreria`** (el de la API; recomendado para la opción de red interna) agregar una **App** (nombre sugerido `frontend`).
3. **Fuente → Git**: `https://github.com/ismaelsuarez/utn-prog3-tpi-libreria-ts.git`, rama según la decisión de abajo, ruta de compilación `/`. **Compilación → Dockerfile** (archivo `Dockerfile`). **Auto Deploy apagado**.
4. **Entorno**: vacío con el destino por defecto; solo `API_UPSTREAM=…` si se elige la red interna (D2). No hay secretos.
5. **Dominios**: `libreria.ismaelsuarez.me`, ruta `/`, destino HTTP, **puerto 8080**; **HTTPS con Let's Encrypt**.
6. **Implementar**; esperar `healthy`; en **Registros**, el arranque de nginx sin errores (y la plantilla generada).
7. **Prueba de humo de solo lectura**: `sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me` desde cualquier máquina, y en el navegador: la raíz lleva al login, ingreso con el administrador de demostración, Catálogo con los libros de producción, consola sin violaciones de CSP. Sin escrituras salvo D6.
8. **Redesplegar**: llevar los cambios a la rama y pulsar **Implementar**. **Volver atrás**: `git revert` del commit problemático en esa rama e **Implementar** (camino seguro y documentado); si Easypanel ofrece volver a una implementación anterior en su historial, sirve también, pero no está comprobado aquí.

Rama (decisión del usuario): **recomendado `main`** después de integrar la pila de PR #1–#5 y el de este change; Easypanel queda apuntando a la rama estable. Alternativa: desplegar antes desde `feat/despliegue-frontend` para probar en el VPS y cambiar a `main` al integrar (riesgo: olvidar el cambio y dejar producción sobre una rama de trabajo).

### D6 — Escritura de humo en producción (requiere aprobación)

Por defecto, ninguna. Las escrituras se prueban solo contra el backend local (D8). Si el usuario quiere comprobar una escritura real después del despliegue, la hace él mismo desde la aplicación publicada, como operación legítima del bibliotecario: la candidata natural es el sexto libro que falta para el mínimo de la consigna (PA-15), cuyo registro desde la aplicación desplegada ya está planteado como opción en `knowledge-base/10_preguntas_abiertas.md`. Queda irreversible (la API no borra).

### D7 — Paquete de entrega (requiere aprobación: `tests/` y nombre)

`npm run entrega` → `git archive --format=zip --prefix=utn-prog3-tpi-libreria-ts/ --output=utn-prog3-tpi-libreria-ts.zip HEAD -- index.html src package.json package-lock.json tsconfig.json vite.config.ts .env.example README.md Dockerfile .dockerignore despliegue`. `.gitignore` suma `*.zip`.

- `git archive` toma solo lo versionado del último commit: nunca `node_modules/`, `dist/`, `.env` reales ni archivos sueltos de la copia de trabajo; funciona igual en Linux, macOS y Windows (Git ya es requisito del equipo) y no agrega dependencias (regla dura 1).
- Contenido: el de la sección «Entrega» actual del README más `Dockerfile`, `.dockerignore` y `despliegue/` (el README los cita y sin ellos la entrega no reproduce el despliegue).
- `tests/` queda **fuera**, como fija hoy la lista de entrega de `CLAUDE.md`. Consecuencia: desde el `.zip` funcionan `npm ci`, `npm run dev` y `npm run build` (`tsconfig.json` incluye `tests` pero tolera que falte), y `npm test` no encuentra pruebas. Alternativa: incluir `tests/` para que `npm test` también funcione desde el `.zip` (cambia la regla de entrega de `CLAUDE.md`/`AGENTS.md`).
- Nombre `utn-prog3-tpi-libreria-ts.zip`: **supuesto**; el canal y el formato de entrega siguen abiertos (PA-02).
- Alternativas: `zip -r` con exclusiones (no viene en Windows y toma archivos no versionados); un script de Node con una librería de compresión (dependencia nueva); «Download ZIP» de GitHub (incluye todo); `export-ignore` en `.gitattributes` (cambia también las descargas de GitHub y es menos visible).

### D8 — Verificación local

Prueba del contenedor como script versionado, `despliegue/comprobar.sh <base>` (POSIX `sh` + `curl`, solo `GET` y `HEAD`), que comprueba con salida por caso y código distinto de 0 si algo falla: `/healthz`; `/` → 302 con `Location` relativo al login; login 200 con CSP, `nosniff`, `Referrer-Policy` y `no-cache`; un recurso de `assets/` (tomado del HTML del login) con `immutable` y `gzip`; `/no-existe.html` 404 con cabeceras; `/api` y `/apiclientes/` 404; `/api/health/ready` 200 con `"estado":"ok"`; `/api/libros` 307 con `Location: /api/libros/`; `/api/libros/?limit=1` 200 JSON. Sirve igual contra el contenedor local y contra `https://libreria.ismaelsuarez.me` (prueba de humo, D5).

Ciclo (TDD sobre configuración): RED = el script falla contra una imagen `nginx-unprivileged` sin la plantilla (o contra la imagen antes de cada ajuste); GREEN = pasa contra la imagen del change.

Recorrido local:

1. `docker build -t tpi-libreria-web .`; comprobaciones de la imagen: `id` del proceso (uid 101), contenido servido (sin `src/`, `node_modules/`, `.env`), `grep -r api.ismaelsuarez` vacío, estado `healthy`.
2. **Lecturas contra producción**: `docker run -d --name tpi-libreria-web -p 127.0.0.1:8080:8080 tpi-libreria-web` y `sh despliegue/comprobar.sh http://127.0.0.1:8080`. Solo `GET`.
3. **Escrituras contra el backend local** (receta T-05 del README, red `tpi-libreria-red`): `docker run -d --name tpi-libreria-web-local --network tpi-libreria-red -e API_UPSTREAM=http://tpi-libreria-api:8000 -p 127.0.0.1:8081:8080 tpi-libreria-web`. **Antes de escribir**: `curl http://127.0.0.1:8081/api/health/ready` y `docker logs tpi-libreria-api` deben mostrar esa solicitud. Luego: `POST /api/clientes/` 201; `POST /apiclientes/` 404 sin línea nueva en el registro del backend; `GET /api/clientes` 307 con `Location: /api/clientes/`; cuerpo de 65 KiB → 413; backend detenido → `POST` 502 inmediato.
4. **Navegador** (Chrome sin interfaz o manual) por `http://127.0.0.1:8081` (backend local): entrada al login, ingreso del administrador, protección de rutas con un usuario `client`, Catálogo, un alta de cliente, consola sin violaciones de CSP en el login, el registro y las cinco vistas. Por `http://127.0.0.1:8080` (producción): solo entrada, ingreso y Catálogo. `127.0.0.1` es contexto seguro, así que `crypto.subtle` funciona.
5. **Paquete**: `npm run entrega`, listado del `.zip` contra la lista de D7, y `npm ci && npm run build` en una carpeta temporal fuera del repositorio.
6. Los resultados observados se registran en el README como casos manuales nuevos (CM-25 en adelante).

### D9 — Documentación

- `README.md`: dirección publicada al principio; sección «Despliegue» (imagen, `API_UPSTREAM`, puerto, verificación local, enlace a `despliegue/DESPLIEGUE.md`); «Entrega» con `npm run entrega` y la lista final; casos manuales del contenedor; «Estructura de carpetas» con `Dockerfile` y `despliegue/`.
- `knowledge-base/08`: sección de producción (nginx, reenvío, cabeceras) y `API_UPSTREAM` en la tabla de variables. `09`: DD-32 (contenedor nginx y reenvío de producción) y DD-33 (paquete de entrega). `10`: PA-14 resuelta por `npm run entrega`; PA-15 enlazada a D6; PA-02 sigue abierta.
- `CLAUDE.md` y `AGENTS.md` (copias idénticas): comando `npm run entrega`, fila de despliegue en el stack, lista de entrega, y en la regla 4 que la verificación local del contenedor también escribe solo en el backend local.
- `CHANGES.md`: estado de T-06 al archivar.

## Risks / Trade-offs

- [Horquilla: el contenedor llama al dominio público de la API desde el mismo VPS] → La prueba de humo lo detecta (`/api/health/ready`); si falla, se pasa a la red interna (D2) solo con la variable.
- [El destino se resuelve solo al arrancar] → La API y el frontend comparten VPS e IP; un cambio de dirección se corrige con Implementar.
- [Una CSP estricta rompe algo no previsto] → Consola revisada en las siete páginas a través del contenedor (D8, paso 4) antes de desplegar.
- [La imagen no trae el almacén de certificados] → El apply lo comprueba con el reenvío a la API pública; si falta, se instala `ca-certificates`.
- [La expresión de `proxy_redirect` acepta cualquier anfitrión] → Supuesto declarado: el destino solo redirige hacia sí mismo; el 307 real se comprueba contra producción y contra el backend local.
- [La aplicación publicada escribe en producción y las credenciales del administrador de demostración están en el README público] → No amplía la exposición (la API ya acepta escrituras de cualquiera, sin autenticación), pero las facilita desde una interfaz; es la limitación conocida del TPI y queda señalada para el usuario.
- [Etiquetas de imagen fijas no reciben parches solas] → Actualizarlas es un cambio explícito y revisable; se documenta cómo.
- [Let's Encrypt falla si el DNS aún no propagó] → El DNS es el primer paso y se comprueba con `dig` antes de activar HTTPS.
- [Desde el `.zip` no corre `npm test`] → Decisión D7; alternativa disponible.

## Migration Plan

Despliegue nuevo: no reemplaza nada. Orden: aprobación (grupo 0 de `tasks.md`) → imagen y verificación local → documentación y paquete → integración a la rama elegida → pasos de Easypanel por el usuario → prueba de humo de solo lectura. Volver atrás: `git revert` + Implementar, o detener/eliminar la App de Easypanel (la API no se toca, así que quitar el frontend no afecta otros servicios).

## Open Questions

Requieren aprobación explícita antes del apply (el diseño adopta la recomendación y se ajusta si se elige otra):

1. **Destino de `/api`** (D2): API pública por defecto (recomendado) o red interna `libreria_api:8000` (nombre inferido, a confirmar por el usuario en Easypanel).
2. **Rama de Easypanel** (D5): `main` después de integrar #1–#6 (recomendado) o `feat/despliegue-frontend` en forma temporal.
3. **Escritura de humo** (D6): ninguna (recomendado) o el sexto libro de PA-15 registrado por el usuario desde la aplicación publicada.
4. **Paquete** (D7): `tests/` fuera (recomendado, coherente con la regla vigente) o dentro; nombre del `.zip` (supuesto hasta conocer PA-02).

Diferibles sin cambiar el plan: nombre del servicio en Easypanel (`frontend` sugerido); fijar también el resumen `@sha256:` de las imágenes.
