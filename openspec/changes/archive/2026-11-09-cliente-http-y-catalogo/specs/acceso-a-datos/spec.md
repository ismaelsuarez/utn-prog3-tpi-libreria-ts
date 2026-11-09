# Spec Delta

## ADDED Requirements

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
