# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Catálogo vacío

**Reason**: el Catálogo ya no lee el Almacén local; la condición de lista vacía pasa a depender de lo que entrega la API.
**Migration**: reemplazado por «Catálogo sin libros», con el mismo mensaje de lista vacía y la misma distinción respecto de la búsqueda sin resultados.
