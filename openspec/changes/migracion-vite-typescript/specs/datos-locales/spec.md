# Spec Delta

## MODIFIED Requirements

### Requirement: Identificadores estables

Toda entidad del modelo (editorial, género, autor, libro y cliente) SHALL tener un identificador de texto único, de forma prefijo más contador (por ejemplo `edi-01`, `lib-03`), que NO cambie una vez asignado y NO dependa de servicios externos. Fuera del almacén local, cada identificador SHALL exponerse como el número entero de su contador (`lib-03` → `3`), y un número recibido SHALL resolverse al registro cuyo contador vale ese número.

#### Scenario: Cada entidad tiene su identificador

- **WHEN** se inspecciona cualquier registro de los datos iniciales
- **THEN** posee un identificador de texto único que lo distingue dentro de su entidad

#### Scenario: El esquema no depende de servicios del navegador

- **WHEN** se generan o leen identificadores sin conexión a Internet
- **THEN** los identificadores pueden generarse y leerse sin usar servicios de contexto seguro ni conexión

#### Scenario: Identificador expuesto como entero

- **WHEN** el repositorio entrega el libro guardado con identificador `lib-07`
- **THEN** su identificador es el entero `7`, y pedir el libro `7` devuelve ese mismo registro

### Requirement: Lectura centralizada en el Almacén

El almacén local SHALL ser la implementación vigente y transitoria de los repositorios de acceso a datos (capacidad `acceso-a-datos`): expone lectura de libros, clientes, ventas, editoriales, géneros y autores y las altas existentes, siempre a través de esos repositorios. Ningún script de página SHALL usar el almacén ni los datos iniciales en forma directa. Los changes `cliente-http-y-catalogo` y `operaciones-contra-api` lo reemplazarán por la API sin cambiar las vistas.

#### Scenario: El Catálogo lee a través del almacén

- **WHEN** la vista Catálogo necesita el listado de libros
- **THEN** lo obtiene del repositorio de libros, que hoy lo lee del almacén local, sin acceder a los datos iniciales en forma directa

#### Scenario: La interfaz de lectura es estable

- **WHEN** se consulta al repositorio por libros, clientes, ventas, editoriales, géneros o autores
- **THEN** cada operación devuelve el conjunto correspondiente listo para usar, con la misma forma de datos en todas las páginas y la forma de la API de producción

#### Scenario: Formato guardado sin cambios

- **WHEN** un navegador ya tiene guardadas las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` escritas por la versión anterior, en el mismo origen
- **THEN** la aplicación las lee sin migrarlas ni reescribirlas, y las altas posteriores mantienen el mismo formato
