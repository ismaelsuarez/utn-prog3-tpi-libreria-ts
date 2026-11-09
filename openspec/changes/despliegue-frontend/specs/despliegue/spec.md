# Spec Delta

## Purpose

Define el servidor de producción del frontend: cómo sirve la compilación multipágina, cómo reenvía `/api` a la API desde el mismo origen, y qué garantías de salud, caché y cabeceras de seguridad ofrece al publicarse.

## ADDED Requirements

### Requirement: Contenedor de producción

El proyecto SHALL incluir una imagen de contenedor que compila la aplicación y sirve el resultado como un servidor HTTP sin privilegios, escuchando en un único puerto interno sin TLS (el TLS lo termina el proxy de la plataforma). La imagen SHALL construirse sin variables de entorno ni secretos y sin incluir dependencias de desarrollo ni el código fuente.

#### Scenario: Construcción desde un clon limpio

- **WHEN** se construye la imagen desde la raíz de un clon limpio del repositorio
- **THEN** la construcción termina sin errores y la imagen resultante sirve la compilación en el puerto interno documentado

#### Scenario: Proceso sin privilegios

- **WHEN** se consulta el usuario del proceso del servidor dentro del contenedor en marcha
- **THEN** no es `root`

#### Scenario: Contenido de la imagen

- **WHEN** se lista el contenido servido por la imagen
- **THEN** contiene solo los archivos de la compilación (incluidas las páginas compiladas bajo `src/pages/`) y no contiene archivos `.ts`, `node_modules/`, `tests/`, `.git/`, `.engram/` ni archivos `.env`

### Requirement: Salud del contenedor

El servidor SHALL responder `GET /healthz` con estado 200 y un cuerpo de texto corto sin consultar la API, y la imagen SHALL declarar una comprobación de salud que use esa ruta.

#### Scenario: Servidor en marcha

- **WHEN** el contenedor está en marcha y se pide `GET /healthz`
- **THEN** la respuesta es 200 con cuerpo de texto `ok`

#### Scenario: API caída

- **WHEN** el destino de `/api` no responde y se pide `GET /healthz`
- **THEN** la respuesta sigue siendo 200 y el estado de salud del contenedor es `healthy`

### Requirement: Entrada al login servida por el servidor

El servidor SHALL redirigir `GET /` y `GET /index.html` a la página de login con una redirección cuya cabecera `Location` es una ruta relativa al origen (sin esquema, anfitrión ni puerto internos), de modo que funcione detrás del proxy HTTPS de la plataforma.

#### Scenario: Apertura de la raíz

- **WHEN** se pide `GET /` al servidor
- **THEN** la respuesta es una redirección con `Location: /src/pages/auth/login/login.html` y, al seguirla, el navegador muestra el formulario de inicio de sesión

#### Scenario: Redirección detrás del proxy

- **WHEN** se pide `GET /` a través de `https://libreria.ismaelsuarez.me`
- **THEN** el navegador termina en `https://libreria.ismaelsuarez.me/src/pages/auth/login/login.html`, sin pasar por `http://` ni por el puerto interno

### Requirement: Páginas y recursos de la compilación

El servidor SHALL entregar cada archivo de la compilación en su ruta, incluida cada vista como página HTML propia, y SHALL responder 404 a toda ruta que no corresponda a un archivo, sin devolver una página de la aplicación en su lugar.

#### Scenario: Vista existente

- **WHEN** se pide `GET /src/pages/client/catalogo/catalogo.html`
- **THEN** la respuesta es 200 con `Content-Type: text/html` y la página carga sus scripts, estilos e imágenes sin respuestas 404

#### Scenario: Ruta inexistente

- **WHEN** se pide `GET /no-existe.html`
- **THEN** la respuesta es 404

### Requirement: Caché de la compilación

El servidor SHALL marcar los recursos con huella de contenido de la carpeta `assets/` como cacheables por un año e inmutables, y las páginas HTML como `no-cache`, para que una nueva publicación se vea al recargar sin servir recursos viejos.

#### Scenario: Recurso con huella

- **WHEN** se pide un archivo de `/assets/`
- **THEN** la respuesta lleva `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Página HTML

- **WHEN** se pide una página `.html`
- **THEN** la respuesta lleva `Cache-Control: no-cache`

### Requirement: Compresión de las respuestas de texto

El servidor SHALL comprimir con gzip las respuestas HTML, CSS, JavaScript y JSON cuando el cliente lo acepta.

#### Scenario: Cliente que acepta gzip

- **WHEN** se pide un archivo JavaScript de `/assets/` con `Accept-Encoding: gzip`
- **THEN** la respuesta lleva `Content-Encoding: gzip` y `Vary: Accept-Encoding`

### Requirement: Cabeceras de seguridad

Toda respuesta del servidor (páginas, recursos, salud y reenvío) SHALL llevar una política de seguridad de contenido que solo admite recursos del mismo origen (e imágenes `data:`), prohíbe objetos, restringe `base-uri` y `form-action` al mismo origen e impide el encuadre (`frame-ancestors 'none'`), junto con `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`. El servidor SHALL NOT anunciar su versión.

#### Scenario: Cabeceras en una página

- **WHEN** se pide cualquier página HTML
- **THEN** la respuesta lleva `Content-Security-Policy` con `default-src 'self'` y `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`, y la cabecera `Server` no incluye un número de versión

#### Scenario: Cabeceras en un recurso cacheable

- **WHEN** se pide un archivo de `/assets/`
- **THEN** la respuesta lleva las mismas cabeceras de seguridad que una página

#### Scenario: Aplicación sin violaciones de la política

- **WHEN** se recorren el login, el registro y las cinco vistas en el navegador a través del contenedor
- **THEN** la consola no informa ninguna violación de la política de seguridad de contenido y las vistas funcionan como con `npm run preview`

### Requirement: Reenvío de la API en producción

El servidor SHALL reenviar toda solicitud cuya ruta empieza con `/api/` al destino configurado, reemplazando `/api/` por `/` y conservando método, cuerpo y parámetros, y presentando al destino su propio nombre de anfitrión (y, si es HTTPS, verificando su certificado). Las escrituras SHALL reenviarse: el servidor de producción no tiene la guarda de desarrollo.

#### Scenario: Lectura reenviada

- **WHEN** se pide `GET /api/health/ready` al servidor con el destino por defecto
- **THEN** la respuesta es la de `GET /health/ready` de `https://api.ismaelsuarez.me`

#### Scenario: Consulta con parámetros

- **WHEN** se pide `GET /api/libros/?limit=100&offset=0&titulo=r%C3%ADo`
- **THEN** el destino recibe `GET /libros/?limit=100&offset=0&titulo=r%C3%ADo`

#### Scenario: Escritura reenviada a un destino local

- **WHEN** el destino es un backend local y se envía `POST /api/clientes/` con cuerpo JSON
- **THEN** el backend local recibe `POST /clientes/` con el mismo cuerpo y su respuesta 201 llega al navegador

### Requirement: Rutas parecidas a la base de la API

El servidor SHALL reenviar solo las rutas que empiezan exactamente con `/api/`. `/api` sin barra final y las rutas que empiezan con `/api` seguido de otro carácter (por ejemplo `/apiclientes/`) SHALL responderse 404 sin reenviarse.

#### Scenario: Base sin barra

- **WHEN** se pide `GET /api`
- **THEN** la respuesta es 404 y el destino no recibe la solicitud

#### Scenario: Prefijo pegado

- **WHEN** se envía `POST /apiclientes/`
- **THEN** la respuesta es 404 y el destino no recibe la solicitud

### Requirement: Redirecciones del destino dentro del mismo origen

Cuando el destino responde una redirección, el servidor SHALL reescribir su cabecera `Location`, absoluta o relativa, a una ruta bajo `/api/` del mismo origen, de modo que el navegador nunca sea redirigido al origen del destino.

#### Scenario: Colección sin barra final

- **WHEN** se pide `GET /api/libros` y el destino responde 307 con `Location: https://api.ismaelsuarez.me/libros/`
- **THEN** la respuesta al navegador es 307 con `Location: /api/libros/`

#### Scenario: Destino local

- **WHEN** el destino es `http://tpi-libreria-api:8000` y responde 307 con `Location: http://tpi-libreria-api:8000/clientes/`
- **THEN** la respuesta al navegador lleva `Location: /api/clientes/`

### Requirement: Límites del reenvío

El servidor SHALL NOT reintentar una solicitud reenviada ante un error o un tiempo agotado del destino, SHALL esperar la respuesta del destino más que el límite de 10 segundos del cliente (para que sea el cliente quien informe el tiempo agotado) y SHALL rechazar con 413 los cuerpos mayores que el límite documentado.

#### Scenario: Destino que falla una vez

- **WHEN** el destino corta la conexión ante `POST /api/ventas/`
- **THEN** el servidor responde un error de pasarela (502) y el destino recibió la escritura a lo sumo una vez

#### Scenario: Cuerpo demasiado grande

- **WHEN** se envía a `/api/` un cuerpo mayor que el límite documentado
- **THEN** la respuesta es 413 y el destino no recibe la solicitud

### Requirement: Destino de la API configurable

El destino del reenvío SHALL tomarse de la variable de entorno `API_UPSTREAM` al iniciar el contenedor, con `https://api.ismaelsuarez.me` como valor por defecto, sin reconstruir la imagen. La dirección del destino SHALL NOT llegar al código del navegador.

#### Scenario: Destino por defecto

- **WHEN** el contenedor arranca sin `API_UPSTREAM`
- **THEN** `/api/` se reenvía a `https://api.ismaelsuarez.me`

#### Scenario: Destino configurado

- **WHEN** el contenedor arranca con `API_UPSTREAM=http://tpi-libreria-api:8000` en una red donde ese nombre existe
- **THEN** `GET /api/health/ready` responde lo que responde ese backend y el backend registra la solicitud

#### Scenario: Compilación sin la dirección del destino

- **WHEN** se buscan `api.ismaelsuarez.me` y el mensaje de la guarda de desarrollo en los archivos servidos por la imagen
- **THEN** no se encuentra ninguno
