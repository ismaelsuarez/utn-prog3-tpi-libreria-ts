# acceso-a-datos Specification

## Purpose
Separa las vistas del origen de los datos de negocio mediante una frontera tipada y asíncrona con la forma de la API de producción, y fija cómo el frontend llega a esa API desde su propio origen.

## Requirements

### Requirement: Repositorios como única vía de acceso a datos

Las vistas SHALL obtener y registrar libros, editoriales, géneros, autores, clientes, ventas, usuarios y la sesión solo mediante repositorios o servicios con operaciones asíncronas que entrega la raíz de composición. Ninguna vista SHALL acceder a `localStorage`, a los datos iniciales ni a la red de forma directa.

#### Scenario: Vista que lista libros

- **WHEN** la vista Catálogo necesita los libros
- **THEN** los pide a un repositorio y espera su respuesta, sin leer `localStorage` ni datos iniciales

#### Scenario: Vista que inicia sesión

- **WHEN** la página de login comprueba las credenciales y guarda la sesión
- **THEN** lo hace mediante el servicio de autenticación de la raíz de composición, sin leer ni escribir `localStorage` en forma directa

#### Scenario: Revisión del código de las vistas

- **WHEN** se revisan los módulos de `src/pages/`
- **THEN** no contienen accesos a `localStorage`, importaciones de los datos iniciales ni llamadas de red

### Requirement: Forma de datos alineada con la API de producción

Los repositorios SHALL entregar y recibir los datos con la forma de los DTO de la API de producción: identificadores enteros, importes como texto decimal con dos decimales, fechas ISO 8601 en UTC, y relaciones de editorial, género y cliente como objetos con identificador y nombre.

#### Scenario: Libro entregado por el repositorio

- **WHEN** el repositorio entrega un libro
- **THEN** tiene `id` entero, `isbn`, `titulo`, `precio` como texto con dos decimales (por ejemplo `"1500.00"`), `stock` entero, `editorial` con `id` y `nombre`, y `genero` con `id` y `nombre` o `null`

#### Scenario: Venta entregada por el repositorio

- **WHEN** el repositorio entrega una venta
- **THEN** tiene `id`, `fecha`, `total` como texto decimal, `cliente` con `id`, `nombre` y `email`, y `renglones` con `libro_id`, `titulo`, `cantidad`, `precio_unitario` y `subtotal`

### Requirement: Fallo de un repositorio sin bloquear la vista

Cuando una operación de un repositorio falla, la vista SHALL terminar de cargar y SHALL mostrar un mensaje de error en texto, sin dejar la página en blanco ni registrar un error no controlado.

#### Scenario: Lectura rechazada

- **WHEN** la lectura inicial de una vista es rechazada
- **THEN** la vista muestra un mensaje de error en texto y la consola no registra un rechazo de promesa no controlado

### Requirement: Base de la API en el mismo origen

Toda solicitud a la API de producción SHALL dirigirse a una base relativa del mismo origen de la aplicación, `/api` por defecto y configurable al compilar, nunca a `https://api.ismaelsuarez.me` en forma directa, porque esa API no admite solicitudes de otros orígenes.

#### Scenario: Base por defecto

- **WHEN** se compila sin configurar la base de la API
- **THEN** la aplicación usa `/api` como base de sus solicitudes

#### Scenario: Base configurada

- **WHEN** se compila con la base configurada en `/servicio`
- **THEN** la aplicación usa `/servicio` como base, sin barra final duplicada

#### Scenario: Sin direcciones de la API en el código del navegador

- **WHEN** se revisa la compilación de producción
- **THEN** no contiene la dirección `https://api.ismaelsuarez.me`

### Requirement: Reenvío a la API en desarrollo

El servidor de desarrollo SHALL reenviar las solicitudes cuya ruta empieza con `/api` a la API de producción, quitando el prefijo `/api` y presentando el origen de la API como destino.

#### Scenario: Consulta de salud por el servidor de desarrollo

- **WHEN** con `npm run dev` en marcha se solicita `GET /api/health/live` al servidor de desarrollo
- **THEN** la respuesta es la de `GET /health/live` de la API de producción, con estado 200

### Requirement: Solicitudes de solo lectura a la API

El acceso a la API de producción SHALL limitarse en este momento a solicitudes `GET` dirigidas a la base del mismo origen, con los parámetros de consulta codificados en la dirección. Ninguna operación de la aplicación SHALL enviar `POST`, `PUT`, `PATCH` ni `DELETE` a la API.

#### Scenario: Dirección de una consulta con parámetros

- **WHEN** se pide el listado de libros con base `/api`, `limit` 100, `offset` 0 y título `río`
- **THEN** la solicitud es `GET /api/libros/?limit=100&offset=0&titulo=r%C3%ADo`, con el texto del título codificado

#### Scenario: Sin escrituras contra la API

- **WHEN** se recorren todas las operaciones que llegan a la API
- **THEN** todas usan el método `GET`

### Requirement: Errores de la API como mensajes en texto

Toda falla al consultar la API SHALL rechazarse con un error cuyo mensaje es texto legible para el operador, sin marcado, derivado del cuerpo de error de la API cuando existe y de un texto fijo cuando no.

#### Scenario: Error con detalle de texto

- **WHEN** la API responde 404 con el cuerpo `{"detail": "Libro no encontrado"}`
- **THEN** el error informa «Libro no encontrado» y conserva el estado 404

#### Scenario: Error de validación con lista de detalles

- **WHEN** la API responde 422 con un cuerpo `{"detail": [...]}` cuyos elementos tienen `loc` y `msg`
- **THEN** el error informa los `msg` de cada elemento y expone por cada uno el campo (último elemento de `loc`) y su mensaje

#### Scenario: Respuesta de error sin cuerpo JSON

- **WHEN** la respuesta tiene estado 502 y un cuerpo que no es JSON
- **THEN** el error informa «El servidor respondió con un error (502).»

#### Scenario: Respuesta correcta que no es JSON

- **WHEN** la respuesta tiene estado 200 pero su cuerpo no es JSON (por ejemplo, una página HTML porque falta el reenvío de `/api`)
- **THEN** el error informa «La respuesta del servidor no tiene el formato esperado.»

#### Scenario: Falla de red

- **WHEN** la solicitud no llega a obtener respuesta
- **THEN** el error informa «No se pudo conectar con el servidor.»

### Requirement: Tiempo límite de las solicitudes

Cada solicitud a la API SHALL cancelarse si no termina dentro de un tiempo límite de 10 segundos, y la operación SHALL rechazarse con un mensaje de texto.

#### Scenario: Servidor que no responde

- **WHEN** una solicitud no recibe respuesta en 10 segundos
- **THEN** la solicitud se cancela y el error informa «El servidor tardó demasiado en responder.»

#### Scenario: Respuesta dentro del tiempo

- **WHEN** la respuesta llega antes del tiempo límite
- **THEN** la operación se resuelve con sus datos y no queda ninguna cancelación pendiente

### Requirement: Listados completos con paginación

Cuando una operación pide un listado completo, el acceso a datos SHALL recorrer las páginas de la API con `limit` 100 y `offset` creciente hasta recibir una página con menos elementos que el límite, y SHALL entregar los elementos en el orden recibido.

#### Scenario: Listado de una sola página

- **WHEN** la API devuelve 5 libros en la primera página
- **THEN** se hace una sola solicitud de página y se entregan los 5 libros

#### Scenario: Listado de varias páginas

- **WHEN** la API tiene 230 libros
- **THEN** se piden las páginas con `offset` 0, 100 y 200, y se entregan los 230 libros en orden

#### Scenario: Página completa seguida de página vacía

- **WHEN** la API tiene exactamente 100 libros
- **THEN** se pide una segunda página con `offset` 100, que llega vacía, y se entregan los 100 libros

#### Scenario: Página pedida en forma explícita

- **WHEN** la operación recibe `limit` u `offset`
- **THEN** se pide solo esa página, con esos valores

### Requirement: Importes de la API sin conversión

Los importes recibidos de la API SHALL entregarse a las vistas como el mismo texto decimal recibido, sin convertirlos a número en el acceso a datos.

#### Scenario: Precio de un libro de la API

- **WHEN** la API entrega un libro con `precio` `"25000.00"`
- **THEN** el repositorio lo entrega con `precio` `"25000.00"`

### Requirement: Libros de la API con sus autores

El listado de libros leído de la API SHALL entregar cada libro con sus autores, obtenidos del detalle de cada libro con a lo sumo 4 consultas de detalle en curso a la vez, en el orden del listado. Si alguna consulta falla, el listado SHALL rechazarse con el mensaje de esa falla.

#### Scenario: Libros con autores

- **WHEN** el listado de la API trae los libros 1 y 2 y sus detalles traen sus autores
- **THEN** el repositorio entrega los libros 1 y 2, en ese orden, cada uno con sus autores, rol y orden

#### Scenario: Concurrencia acotada

- **WHEN** el listado trae 10 libros
- **THEN** nunca hay más de 4 consultas de detalle en curso a la vez y se hacen 10 consultas de detalle en total

#### Scenario: Falla de un detalle

- **WHEN** la consulta de detalle de uno de los libros responde 404
- **THEN** el listado se rechaza con el mensaje de error de esa consulta

#### Scenario: Listado vacío

- **WHEN** la API no tiene libros
- **THEN** el repositorio entrega una lista vacía sin consultar detalles

### Requirement: Orígenes de datos durante la transición

Hasta que las escrituras pasen a la API, la vista Catálogo SHALL leer los libros de la API de producción, y las vistas Libros, Clientes, Ventas e Historial SHALL seguir leyendo y escribiendo en el almacén local, de modo que cada vista de gestión trabaje con un único origen coherente.

#### Scenario: Catálogo desde la API

- **WHEN** el operador abre el Catálogo con el servidor de desarrollo en marcha
- **THEN** la vista pide los libros a `/api/libros/` y muestra los libros de producción

#### Scenario: Gestión sobre el almacén local

- **WHEN** el operador abre Libros, Clientes, Ventas o Historial
- **THEN** la vista lee y escribe en el almacén local y no hace solicitudes a `/api`
