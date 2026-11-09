# catalogo Specification

## Purpose

Presenta al operador los libros de la librería con sus datos y le permite encontrarlos escribiendo parte del título.

## Requirements

### Requirement: Contenido de la vista Catálogo
La vista Catálogo SHALL mostrar el título de la librería, un buscador por título y el listado de libros.

#### Scenario: Elementos de la vista
- **WHEN** el operador abre la vista Catálogo
- **THEN** ve el título de la librería, un campo de búsqueda por título con su etiqueta y el listado de libros

### Requirement: Datos de cada libro
Cada libro del listado SHALL mostrarse como una tarjeta con título, ISBN, editorial, género, autores y precio. El título SHALL ser el encabezado de la tarjeta y los demás datos SHALL estar identificados con su nombre.

#### Scenario: Libro completo
- **WHEN** el operador mira la tarjeta de un libro
- **THEN** ve su título como encabezado de la tarjeta y su ISBN, editorial, género, autores y precio, cada uno con su nombre

#### Scenario: Libro con varios autores
- **WHEN** un libro tiene más de un autor
- **THEN** la tarjeta muestra todos sus autores

#### Scenario: Precio con dos decimales
- **WHEN** el operador mira el precio de un libro
- **THEN** el importe se presenta con dos decimales

### Requirement: Libro sin género
Cuando un libro no tiene género asignado, su tarjeta SHALL mostrar el texto «Sin clasificar» en el lugar del género.

#### Scenario: Libro sin género asignado
- **WHEN** el listado incluye un libro sin género
- **THEN** su tarjeta muestra «Sin clasificar» como género

### Requirement: Filtro por título
El buscador SHALL mostrar solo los libros cuyo título contiene el texto buscado, sin distinguir mayúsculas de minúsculas, con coincidencias parciales y sin considerar los espacios de los extremos del texto buscado.

#### Scenario: Coincidencia parcial sin distinguir mayúsculas
- **WHEN** el operador escribe en mayúsculas una parte del título de un libro
- **THEN** el listado muestra ese libro y oculta los que no contienen ese texto en el título

#### Scenario: Espacios en los extremos
- **WHEN** el operador escribe una parte de un título con espacios antes y después
- **THEN** el resultado es el mismo que sin esos espacios

### Requirement: Búsqueda vacía
Cuando el texto buscado está vacío o contiene solo espacios, el Catálogo SHALL mostrar todos los libros.

#### Scenario: Borrado de la búsqueda
- **WHEN** el operador borra el texto del buscador después de haber filtrado
- **THEN** el listado vuelve a mostrar todos los libros

### Requirement: Búsqueda sin resultados
Cuando ningún título contiene el texto buscado, el Catálogo SHALL mostrar un mensaje de texto que lo indique en lugar del listado.

#### Scenario: Texto inexistente
- **WHEN** el operador escribe un texto que no aparece en ningún título
- **THEN** no se muestra ningún libro y aparece un mensaje que indica que no hay resultados para esa búsqueda

#### Scenario: Vuelta a tener resultados
- **WHEN** el operador corrige la búsqueda y vuelve a haber coincidencias
- **THEN** el mensaje de búsqueda sin resultados deja de mostrarse

### Requirement: Listado generado desde los datos

El listado del Catálogo SHALL generarse con TypeScript a partir de los libros que entrega el repositorio de lectura de libros (hoy, la API de producción), mostrando de cada libro su título como encabezado de la tarjeta y su ISBN, editorial, género, autores y precio, tomados de las relaciones anidadas que trae cada libro. Los datos SHALL insertarse en el documento como texto.

#### Scenario: Al abrir la vista

- **WHEN** el operador abre el Catálogo
- **THEN** las tarjetas se generan desde los libros entregados por el repositorio, una por libro, con editorial, género y autores tomados de cada libro

#### Scenario: Datos con marcas de texto

- **WHEN** un título o nombre de los datos contiene caracteres propios de HTML (por ejemplo `<` o `&`)
- **THEN** se muestran como texto literal, sin interpretarse como marcado

#### Scenario: Cambio en los datos

- **WHEN** el conjunto de libros de la API cambia
- **THEN** el listado refleja el conjunto vigente al abrir la vista

### Requirement: Catálogo sin libros

Cuando el repositorio de lectura de libros no entrega ningún libro, el Catálogo SHALL mostrar el mensaje de lista vacía en lugar del listado.

#### Scenario: API sin libros

- **WHEN** la API no tiene ningún libro
- **THEN** el listado no se muestra y aparece el mensaje de lista vacía

#### Scenario: Búsqueda sin resultados se distingue del vacío

- **WHEN** hay libros pero ninguno coincide con la búsqueda
- **THEN** se muestra el mensaje de búsqueda sin resultados, no el de lista vacía

### Requirement: Estado de carga del Catálogo

Mientras el Catálogo espera los libros, SHALL mostrar un mensaje de carga en texto anunciado como estado, y no SHALL mostrar el listado, el mensaje de lista vacía ni el de búsqueda sin resultados.

#### Scenario: Carga en curso

- **WHEN** el operador abre el Catálogo y la API todavía no respondió
- **THEN** se ve el mensaje «Cargando libros…» y no se ve ninguna tarjeta ni mensaje de lista vacía

#### Scenario: Carga terminada

- **WHEN** llegan los libros
- **THEN** el mensaje de carga se oculta y se muestra el listado o el mensaje que corresponda

### Requirement: Error de carga del Catálogo

Si los libros no se pueden obtener, el Catálogo SHALL ocultar el mensaje de carga y SHALL mostrar en su región de error un mensaje en texto con el motivo, sin mostrar el mensaje de lista vacía ni dejar un rechazo de promesa sin controlar. El buscador SHALL seguir presente.

#### Scenario: API no disponible

- **WHEN** el operador abre el Catálogo y la API no responde dentro del tiempo límite
- **THEN** se ve «No se pudieron cargar los datos. El servidor tardó demasiado en responder.» y no se ve el mensaje de lista vacía

#### Scenario: Error con detalle de la API

- **WHEN** la API responde con un error cuyo cuerpo trae un `detail` de texto
- **THEN** el mensaje de error del Catálogo incluye ese texto, insertado como texto
