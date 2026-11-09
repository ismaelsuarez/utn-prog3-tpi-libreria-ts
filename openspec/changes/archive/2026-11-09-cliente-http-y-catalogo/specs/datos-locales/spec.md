# Spec Delta

## ADDED Requirements

### Requirement: Almacén local para las vistas de gestión

El almacén local SHALL ser la implementación transitoria de los repositorios que usan las vistas de gestión (Libros, Clientes, Ventas e Historial): lectura de libros, clientes, ventas, editoriales, géneros y autores y las altas existentes, siempre por esos repositorios. El Catálogo SHALL leer los libros de la API, no del almacén. Ninguna página SHALL usar el almacén ni los datos iniciales en forma directa.

#### Scenario: Las vistas de gestión leen a través del almacén

- **WHEN** la vista Libros o la vista Ventas necesita el listado de libros
- **THEN** lo obtiene del repositorio de libros, que hoy lo lee del almacén local, sin acceder a los datos iniciales en forma directa

#### Scenario: El Catálogo no lee el almacén local

- **WHEN** la vista Catálogo necesita el listado de libros
- **THEN** lo obtiene del repositorio de lectura de libros sobre la API, y lo guardado en `libreria.libros` no aparece en el Catálogo

#### Scenario: La interfaz de lectura es estable

- **WHEN** se consulta al repositorio por libros, clientes, ventas, editoriales, géneros o autores
- **THEN** cada operación devuelve el conjunto correspondiente listo para usar, con la misma forma de datos en todas las páginas y la forma de la API de producción

#### Scenario: Formato guardado sin cambios

- **WHEN** un navegador ya tiene guardadas las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` escritas por la versión anterior, en el mismo origen
- **THEN** la aplicación las lee sin migrarlas ni reescribirlas, y las altas posteriores mantienen el mismo formato

## REMOVED Requirements

### Requirement: Lectura centralizada en el Almacén

**Reason**: el Catálogo deja de leer el almacén local y pasa a leer la API de producción; el almacén queda solo para las vistas de gestión hasta `operaciones-contra-api`.
**Migration**: reemplazado por «Almacén local para las vistas de gestión», que conserva los escenarios de interfaz estable y formato guardado sin cambios.
