# Spec Delta

## ADDED Requirements

### Requirement: Métodos de las solicitudes a la API

El acceso a la API SHALL usar `GET` para las lecturas, con los parámetros codificados en la dirección, y `POST` con cuerpo JSON (`Content-Type: application/json`) para las altas, siempre sobre la base del mismo origen. Ninguna operación de la aplicación SHALL enviar `PUT` ni `DELETE`, y `PATCH` solo SHALL usarse si una spec de vista lo exige.

#### Scenario: Alta con cuerpo JSON

- **WHEN** se registra un cliente con nombre `Ana Gómez` y email `ana@example.com` con base `/api`
- **THEN** la solicitud es `POST /api/clientes/` con el cuerpo JSON `{"nombre":"Ana Gómez","email":"ana@example.com"}` y la cabecera `Content-Type: application/json`

#### Scenario: Dirección de una consulta con parámetros

- **WHEN** se pide el listado de libros con base `/api`, `limit` 100, `offset` 0 y título `río`
- **THEN** la solicitud es `GET /api/libros/?limit=100&offset=0&titulo=r%C3%ADo`, con el texto del título codificado

#### Scenario: Métodos usados

- **WHEN** se recorren todas las operaciones que llegan a la API
- **THEN** usan solo `GET` y `POST` (y `PATCH` únicamente donde una spec de vista lo pide), nunca `PUT` ni `DELETE`

### Requirement: Escrituras con el resultado del servidor

Cada alta SHALL resolverse con la representación que devuelve la API (`201`), incluidos los identificadores, importes y fechas que asigna el servidor, y no con los datos enviados.

#### Scenario: Libro creado

- **WHEN** la API responde `201` al alta de un libro con el libro creado, su `id` y sus autores
- **THEN** el repositorio entrega ese libro tal como lo devolvió la API

#### Scenario: Venta creada

- **WHEN** la API responde `201` al alta de una venta con `id`, `fecha`, `total` y renglones con `precio_unitario` y `subtotal`
- **THEN** el repositorio entrega esos valores sin recalcularlos

### Requirement: Resultado desconocido de una escritura

Cuando una escritura no recibe respuesta (falla de red o tiempo agotado), recibe un 502 o un 504 (estados del intermediario, no de la API) o recibe una respuesta 2xx cuyo cuerpo no es JSON, el error SHALL indicar que no se sabe si la API la registró, y el acceso a datos no SHALL reintentarla automáticamente.

#### Scenario: Tiempo agotado en un alta

- **WHEN** un `POST` no recibe respuesta en 10 segundos
- **THEN** la operación se rechaza con un error que informa que no se pudo confirmar si se guardó, y se hizo una sola solicitud

#### Scenario: Error del intermediario en un alta

- **WHEN** un `POST` recibe un 502 o un 504
- **THEN** la operación se rechaza con el mismo error de resultado desconocido, conserva el estado y se hizo una sola solicitud

#### Scenario: Alta aceptada con un cuerpo ilegible

- **WHEN** un `POST` recibe un 201 cuyo cuerpo no es JSON
- **THEN** la operación se rechaza con el error de resultado desconocido, no con el de formato

#### Scenario: Rechazo con respuesta

- **WHEN** un `POST` recibe una respuesta 409 o 422
- **THEN** el error informa el rechazo del servidor y no indica un resultado desconocido

### Requirement: Listados de clientes y autores por sondeo

Como la API no ofrece `GET /clientes/` ni `GET /autores/`, el listado completo SHALL pedir `GET /clientes/{id}` o `GET /autores/{id}` desde el identificador 1 en orden creciente, con a lo sumo 4 consultas en curso, y SHALL detenerse tras 10 identificadores seguidos con 404 posteriores al mayor identificador ya conocido.

#### Scenario: Clientes consecutivos

- **WHEN** existen los clientes 1, 2 y 3 y los identificadores 4 a 13 responden 404
- **THEN** el listado entrega los clientes 1, 2 y 3 en ese orden y no pide el identificador 14

#### Scenario: Hueco menor que el límite

- **WHEN** existen los clientes 1, 2 y 9 y los identificadores 3 a 8 responden 404
- **THEN** el listado entrega los clientes 1, 2 y 9

#### Scenario: Identificador conocido por otra fuente

- **WHEN** las ventas mencionan al cliente 25 y los identificadores 4 a 24 responden 404
- **THEN** el sondeo no se detiene antes del 25 y el listado lo incluye

#### Scenario: Autores conocidos por los libros

- **WHEN** el detalle de algún libro menciona al autor 7
- **THEN** el sondeo de autores no se detiene antes del 7

#### Scenario: Falla distinta de 404

- **WHEN** una consulta del sondeo responde 500 o no recibe respuesta
- **THEN** el listado se rechaza con el mensaje de esa falla, sin entregar un listado parcial

### Requirement: Datos de negocio desde la API

Las vistas Catálogo, Libros, Clientes, Ventas e Historial SHALL leer y registrar libros, editoriales, géneros, autores, clientes y ventas solo en la API por medio de los repositorios. Los usuarios y la sesión SHALL seguir en el navegador.

#### Scenario: Gestión sobre la API

- **WHEN** el operador abre Libros, Clientes, Ventas o Historial
- **THEN** la vista pide sus datos a `/api` y no lee ni escribe `libreria.libros`, `libreria.clientes` ni `libreria.ventas`

#### Scenario: Alta visible en todas las vistas

- **WHEN** el operador registra un libro en Libros y luego abre el Catálogo o Ventas
- **THEN** el libro aparece en ambas vistas, leído de la API

#### Scenario: Sesión en el navegador

- **WHEN** el operador inicia o cierra sesión
- **THEN** `users` y `userData` se leen y escriben en el navegador y no se hace ninguna solicitud a `/api` por ese motivo

## MODIFIED Requirements

### Requirement: Reenvío a la API en desarrollo

El servidor de desarrollo y el de previsualización SHALL reenviar las solicitudes cuya ruta empieza con `/api` al destino configurado (la API de producción por defecto), quitando el prefijo `/api` y presentando el origen del destino. Cuando el destino es la API de producción, SHALL responder ellos mismos `403` con un `detail` de texto a toda solicitud que no sea `GET`, `HEAD` ni `OPTIONS`, sin reenviarla.

#### Scenario: Consulta de salud por el servidor de desarrollo

- **WHEN** con `npm run dev` en marcha se solicita `GET /api/health/live` al servidor de desarrollo
- **THEN** la respuesta es la de `GET /health/live` de la API de producción, con estado 200

#### Scenario: Escritura bloqueada hacia producción

- **WHEN** con `npm run dev` o `npm run preview` y el destino por defecto se envía `POST /api/clientes/`
- **THEN** la respuesta es `403` con un cuerpo `{"detail": "…"}` que explica que el servidor de desarrollo no reenvía escrituras a la API de producción, y la API de producción no recibe la solicitud

#### Scenario: Ruta que empieza con la base sin barra

- **WHEN** con el destino por defecto se envía `POST /apiclientes/` (o `/apiX/libros/`, `/api%2Fclientes/`), que el reenvío tomaría porque empieza con `/api`
- **THEN** la respuesta también es `403`, sin reenviarla: la guarda usa la misma regla de prefijo que el reenvío

#### Scenario: Producción configurada en forma explícita

- **WHEN** `API_PROXY_TARGET` vale `https://api.ismaelsuarez.me` y se envía `POST /api/ventas/`
- **THEN** la escritura también se rechaza con `403`, sin reenviarla

#### Scenario: Escritura hacia un backend local

- **WHEN** `API_PROXY_TARGET` apunta a `http://127.0.0.1:8000` y se envía `POST /api/clientes/`
- **THEN** la solicitud se reenvía a `POST /clientes/` de ese destino

### Requirement: Errores de la API como mensajes en texto

Toda falla de una solicitud a la API SHALL rechazarse con un error cuyo mensaje es texto legible para el operador, sin marcado, derivado del cuerpo de error de la API cuando existe y de un texto fijo cuando no.

#### Scenario: Error con detalle de texto

- **WHEN** la API responde 404 con el cuerpo `{"detail": "Libro no encontrado"}`
- **THEN** el error informa «Libro no encontrado» y conserva el estado 404

#### Scenario: Conflicto en un alta

- **WHEN** la API responde 409 con el cuerpo `{"detail": "Ya existe un cliente con ese email"}`
- **THEN** el error informa «Ya existe un cliente con ese email» y conserva el estado 409

#### Scenario: Error de validación con lista de detalles

- **WHEN** la API responde 422 con un cuerpo `{"detail": [...]}` cuyos elementos tienen `loc` y `msg`
- **THEN** el error informa los `msg` de cada elemento y expone por cada uno el campo (último elemento de `loc`) y su mensaje

#### Scenario: Respuesta de error sin cuerpo JSON

- **WHEN** la respuesta a una lectura tiene estado 502 y un cuerpo que no es JSON
- **THEN** el error informa «El servidor respondió con un error (502).»

#### Scenario: Respuesta correcta que no es JSON

- **WHEN** la respuesta a una lectura tiene estado 200 pero su cuerpo no es JSON (por ejemplo, una página HTML porque falta el reenvío de `/api`)
- **THEN** el error informa «La respuesta del servidor no tiene el formato esperado.»

#### Scenario: Falla de red

- **WHEN** una lectura no llega a obtener respuesta
- **THEN** el error informa «No se pudo conectar con el servidor.»

## REMOVED Requirements

### Requirement: Solicitudes de solo lectura a la API

**Reason**: Las altas de libros, clientes, perfiles y ventas pasan a la API; la garantía «sin escrituras» deja de existir en el cliente HTTP.
**Migration**: La reemplazan «Métodos de las solicitudes a la API» (métodos permitidos y codificación) y la guarda de «Reenvío a la API en desarrollo» (sin escrituras a producción desde desarrollo). La codificación de parámetros de consulta se conserva sin cambios.

### Requirement: Orígenes de datos durante la transición

**Reason**: La transición termina: las vistas de gestión dejan el almacén local.
**Migration**: La reemplaza «Datos de negocio desde la API».
