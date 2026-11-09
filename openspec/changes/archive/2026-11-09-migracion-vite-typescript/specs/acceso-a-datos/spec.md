# Spec Delta

## Purpose

Separa las vistas del origen de los datos de negocio mediante una frontera tipada y asíncrona con la forma de la API de producción, y fija cómo el frontend llega a esa API desde su propio origen.

## ADDED Requirements

### Requirement: Repositorios como única vía de acceso a datos

Las vistas SHALL obtener y registrar libros, editoriales, géneros, autores, clientes y ventas solo mediante repositorios con operaciones asíncronas. Ninguna vista SHALL acceder a `localStorage`, a los datos iniciales ni a la red de forma directa.

#### Scenario: Vista que lista libros

- **WHEN** la vista Catálogo necesita los libros
- **THEN** los pide a un repositorio y espera su respuesta, sin leer `localStorage` ni datos iniciales

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
