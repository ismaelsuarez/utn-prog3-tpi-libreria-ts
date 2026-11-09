# libros Specification

## Purpose

Permite al operador registrar libros de la librería y consultar el listado de los libros registrados.

## Requirements

### Requirement: Formulario de alta de libro
La vista Libros SHALL presentar un formulario de alta con los campos título, ISBN, precio, editorial, género y autores, y un botón para registrar el libro.

#### Scenario: Campos del formulario
- **WHEN** el operador abre la vista Libros
- **THEN** ve un formulario con los campos título, ISBN, precio, editorial, género y autores, y un botón para registrar el libro

### Requirement: Selección de editorial y de género
El formulario SHALL ofrecer la editorial y el género mediante listas desplegables, y la lista de género SHALL incluir la opción «Sin clasificar», que representa la ausencia de género.

#### Scenario: Opción sin género
- **WHEN** el operador despliega la lista de género
- **THEN** encuentra la opción «Sin clasificar» junto a los géneros disponibles

#### Scenario: Lista de editoriales
- **WHEN** el operador despliega la lista de editorial
- **THEN** ve las editoriales disponibles

### Requirement: Selección de autores
El formulario SHALL permitir seleccionar uno o más autores mediante una casilla por cada autor disponible.

#### Scenario: Varios autores
- **WHEN** el operador marca las casillas de dos autores
- **THEN** ambos quedan seleccionados al mismo tiempo

#### Scenario: Selección con teclado
- **WHEN** el operador recorre el grupo de autores con el teclado
- **THEN** puede marcar y desmarcar cada casilla sin usar el ratón

### Requirement: Listado de libros registrados
La vista Libros SHALL mostrar los libros registrados en una tabla con las columnas título, ISBN, editorial, género, autores y precio.

#### Scenario: Columnas del listado
- **WHEN** el operador mira el listado de libros
- **THEN** la tabla tiene las columnas título, ISBN, editorial, género, autores y precio

#### Scenario: Libro sin género en el listado
- **WHEN** el listado incluye un libro sin género asignado
- **THEN** la columna género de ese libro muestra «Sin clasificar»

### Requirement: Validación del alta de libro

El sistema SHALL rechazar el registro de un libro cuando el título esté vacío, el ISBN esté vacío o ya exista en el conjunto de libros (comparado sin espacios ni guiones y sin validar el dígito de control), el precio no sea numérico o no sea mayor que cero, la editorial esté vacía o no exista en los datos locales, no se haya seleccionado ningún autor, un autor seleccionado no exista en los datos locales o el género, estando asignado, no exista en los datos locales.

#### Scenario: Título o ISBN vacío

- **WHEN** el operador envía el formulario con el título vacío o con el ISBN vacío
- **THEN** el sistema rechaza el registro y señala el campo vacío

#### Scenario: ISBN existente con separadores distintos

- **WHEN** el operador registra un libro cuyo ISBN coincide con el de un libro existente únicamente en espacios y guiones (por ejemplo `978 987 000 001 1` frente a `978-987-000-001-1`)
- **THEN** el sistema rechaza el registro como ISBN existente, sin validar el dígito de control

#### Scenario: Precio no numérico o no mayor que cero

- **WHEN** el operador envía un precio que no es numérico, igual a cero o negativo
- **THEN** el sistema rechaza el registro y señala el precio

#### Scenario: Editorial vacía o desconocida

- **WHEN** el operador envía la editorial vacía o con un identificador que no existe en los datos locales
- **THEN** el sistema rechaza el registro y señala la editorial

#### Scenario: Autores faltantes o desconocidos

- **WHEN** el operador envía el formulario sin marcar ningún autor, o marcando un autor que no existe en los datos locales
- **THEN** el sistema rechaza el registro y señala el grupo de autores

#### Scenario: Género desconocido

- **WHEN** el operador asigna un género cuyo identificador no existe en los datos locales
- **THEN** el sistema rechaza el registro y señala el género

### Requirement: Género opcional en el alta de libro

El género SHALL ser opcional: un valor vacío o ausente no produce ningún error y el libro se registra sin género, representado como «Sin clasificar».

#### Scenario: Sin género asignado

- **WHEN** el operador envía el formulario eligiendo «Sin clasificar» en el género
- **THEN** el sistema no muestra error de género y el libro queda registrado sin género

### Requirement: Errores por campo sin registrar el libro

El formulario de libro SHALL mostrar un mensaje de error junto a cada campo rechazado, pudiendo acumular varios mensajes a la vez, y SHALL registrar el libro solo cuando todas las comprobaciones pasan. Mientras haya errores no se escribe nada en el almacén.

#### Scenario: Varios errores a la vez

- **WHEN** el operador envía un formulario con título vacío y precio cero
- **THEN** se muestran los dos mensajes, cada uno junto a su campo, y no se registra ningún libro

#### Scenario: Sin errores

- **WHEN** el operador envía un formulario que pasa todas las comprobaciones
- **THEN** no se muestra ningún mensaje de error y el libro se registra

### Requirement: Opciones de editorial, género y autores desde los datos locales

Las opciones del selector de editorial, las del selector de género (incluida «Sin clasificar» como primera opción, con valor vacío) y las casillas de autores SHALL generarse a partir de los datos locales que expone el Almacén, con sus identificadores reales.

#### Scenario: Opciones generadas al abrir la página

- **WHEN** el operador abre la vista Libros
- **THEN** los selectores de editorial y género y las casillas de autores ofrecen exactamente los registros que expone el Almacén, identificadores incluidos

#### Scenario: Selección múltiple de autores

- **WHEN** el operador marca las casillas de dos autores
- **THEN** ambos autores quedan seleccionados al enviar el formulario

### Requirement: Listado de libros generado desde el Almacén

El listado de libros SHALL generarse con JavaScript a partir de los datos del Almacén, mostrando título, ISBN, editorial, género, autores y precio resueltos por identificador («Sin clasificar» si el libro no tiene género). Si no hay libros registrados se muestra un mensaje de lista vacía.

#### Scenario: Listado con los libros vigentes

- **WHEN** el operador abre la vista Libros
- **THEN** las filas de la tabla se generan desde el Almacén y muestran cada libro con sus relaciones resueltas

#### Scenario: Sin libros registrados

- **WHEN** no hay libros en el Almacén
- **THEN** la tabla se oculta o queda vacía y se muestra el mensaje de lista vacía

### Requirement: Efecto del alta de libro

Al registrar un libro válido, el sistema SHALL persistirlo en el Almacén, actualizar el listado sin recargar la página, limpiar el formulario para un nuevo registro y mostrar un mensaje de operación correcta. El libro quedará visible en las demás vistas que leen el Almacén (por ejemplo, el selector de libros de Ventas) cuando éstas se abran. Mientras el Catálogo lea los libros de la API, el libro registrado en el Almacén no SHALL aparecer en el Catálogo.

#### Scenario: Alta correcta en la página

- **WHEN** el operador envía un libro válido
- **THEN** el libro aparece en el listado de la misma página, el formulario queda limpio y se muestra el mensaje de éxito sin recargar

#### Scenario: Libro nuevo en el Catálogo

- **WHEN** el operador registra un libro y después abre el Catálogo, mientras el Catálogo lee los libros de la API
- **THEN** el Catálogo muestra solo los libros de la API de producción, sin el libro registrado en el Almacén

#### Scenario: Libro nuevo en la venta

- **WHEN** el operador registra un libro y después abre Ventas
- **THEN** el selector de libros de la venta incluye el libro recién registrado

#### Scenario: Duplicado dentro de la misma sesión

- **WHEN** el operador registra dos veces un libro con el mismo ISBN sin recargar la página
- **THEN** el segundo envío se rechaza como ISBN existente
