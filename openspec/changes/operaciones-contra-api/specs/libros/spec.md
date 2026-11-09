# Spec Delta

## ADDED Requirements

### Requirement: Stock y límites del servidor en el alta de libro

El alta SHALL rechazar, señalando el campo, un stock vacío, no entero, negativo o mayor que 2 147 483 647, un título de más de 200 caracteres, un ISBN de más de 20 caracteres y un precio mayor que 99 999 999,99, porque la API no los valida y fallaría. El precio SHALL enviarse redondeado al centavo, con mitades hacia arriba.

#### Scenario: Stock inválido

- **WHEN** el operador envía el stock vacío, `-1`, `2,5` o `abc`
- **THEN** el sistema rechaza el registro, señala el stock y no envía nada a la API

#### Scenario: Stock cero

- **WHEN** el operador envía el stock `0` y el resto de los campos es válido
- **THEN** el libro se registra con stock 0

#### Scenario: Texto más largo que el admitido

- **WHEN** el operador envía un título de 201 caracteres o un ISBN de 21 caracteres
- **THEN** el sistema rechaza el registro y señala ese campo

#### Scenario: Precio con más de dos decimales

- **WHEN** el operador envía el precio `1500,125`
- **THEN** la API recibe el precio `"1500.13"`

### Requirement: Opciones de editorial, género y autores desde la API

Las opciones del selector de editorial, las del selector de género (incluida «Sin clasificar» como primera opción, con valor vacío) y las casillas de autores SHALL generarse a partir de las editoriales, los géneros y los autores que entrega la API, con sus identificadores reales.

#### Scenario: Opciones generadas al abrir la página

- **WHEN** el operador abre la vista Libros
- **THEN** los selectores de editorial y género y las casillas de autores ofrecen exactamente los registros que entrega la API, identificadores incluidos

#### Scenario: Selección múltiple de autores

- **WHEN** el operador marca las casillas de dos autores
- **THEN** ambos autores quedan seleccionados al enviar el formulario

#### Scenario: Error al cargar las opciones

- **WHEN** falla la lectura de editoriales, géneros o autores
- **THEN** la vista muestra el error en texto y no permite registrar un libro con opciones incompletas

### Requirement: Listado de libros generado desde la API

El listado de libros SHALL generarse a partir de los libros que entrega la API, con sus autores, mostrando título, ISBN, editorial, género, autores y precio («Sin clasificar» si el libro no tiene género). Si la API no tiene libros se muestra un mensaje de lista vacía.

#### Scenario: Listado con los libros vigentes

- **WHEN** el operador abre la vista Libros
- **THEN** las filas de la tabla muestran los libros de la API con su editorial, género y autores

#### Scenario: Sin libros registrados

- **WHEN** la API no tiene libros
- **THEN** la tabla se oculta o queda vacía y se muestra el mensaje de lista vacía

## MODIFIED Requirements

### Requirement: Formulario de alta de libro
La vista Libros SHALL presentar un formulario de alta con los campos título, ISBN, precio, stock, editorial, género y autores (con el rol de cada autor elegido), y un botón para registrar el libro.

#### Scenario: Campos del formulario
- **WHEN** el operador abre la vista Libros
- **THEN** ve un formulario con los campos título, ISBN, precio, stock, editorial, género y autores, y un botón para registrar el libro

### Requirement: Selección de autores
El formulario SHALL permitir seleccionar uno o más autores mediante una casilla por cada autor disponible y, para cada autor marcado, elegir su rol entre «autor», «coautor», «traductor» e «ilustrador», con «autor» por defecto. El orden de autoría SHALL ser el de los autores marcados en la lista, empezando en 1.

#### Scenario: Varios autores
- **WHEN** el operador marca las casillas de dos autores
- **THEN** ambos quedan seleccionados al mismo tiempo

#### Scenario: Selección con teclado
- **WHEN** el operador recorre el grupo de autores con el teclado
- **THEN** puede marcar y desmarcar cada casilla y elegir su rol sin usar el ratón

#### Scenario: Rol y orden enviados
- **WHEN** el operador marca, en ese orden de la lista, a un autor con rol «autor» y a otro con rol «traductor»
- **THEN** la API recibe `autores` con el primero en `orden` 1 y rol `autor` y el segundo en `orden` 2 y rol `traductor`

### Requirement: Validación del alta de libro

El sistema SHALL rechazar el registro de un libro cuando el título esté vacío, el ISBN esté vacío o ya exista entre los libros de la API (comparado sin espacios ni guiones y sin validar el dígito de control), el precio no sea numérico o no sea mayor que cero, la editorial esté vacía o no exista en la API, no se haya seleccionado ningún autor, un autor seleccionado no exista en la API o el género, estando asignado, no exista en la API.

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

- **WHEN** el operador envía la editorial vacía o con un identificador que no existe en la API
- **THEN** el sistema rechaza el registro y señala la editorial

#### Scenario: Autores faltantes o desconocidos

- **WHEN** el operador envía el formulario sin marcar ningún autor, o marcando un autor que no existe en la API
- **THEN** el sistema rechaza el registro y señala el grupo de autores

#### Scenario: Género desconocido

- **WHEN** el operador asigna un género cuyo identificador no existe en la API
- **THEN** el sistema rechaza el registro y señala el género

### Requirement: Errores por campo sin registrar el libro

El formulario de libro SHALL mostrar un mensaje de error junto a cada campo rechazado, pudiendo acumular varios mensajes a la vez, y SHALL enviar el libro a la API solo cuando todas las comprobaciones pasan. Si la API rechaza el alta, SHALL mostrar su mensaje en texto, junto al campo cuando la API lo identifica, y conservar lo escrito.

#### Scenario: Varios errores a la vez

- **WHEN** el operador envía un formulario con título vacío y precio cero
- **THEN** se muestran los dos mensajes, cada uno junto a su campo, y no se envía nada a la API

#### Scenario: Sin errores

- **WHEN** el operador envía un formulario que pasa todas las comprobaciones
- **THEN** no se muestra ningún mensaje de error y el libro se envía a la API

#### Scenario: Conflicto informado por la API

- **WHEN** la API responde 409 con `{"detail": "No se pudo crear el libro: editorial, genero, autor o isbn invalidos"}`
- **THEN** el formulario muestra ese mensaje como error de la operación y conserva los datos escritos

#### Scenario: Validación informada por la API

- **WHEN** la API responde 422 con un elemento cuyo `loc` termina en `stock`
- **THEN** el mensaje se muestra junto al campo stock

### Requirement: Efecto del alta de libro

Al registrar un libro válido, el sistema SHALL enviarlo a la API y, cuando la API lo confirma, actualizar el listado con los libros de la API sin recargar la página, limpiar el formulario para un nuevo registro y mostrar un mensaje de operación correcta. El libro quedará visible en el Catálogo y en el selector de libros de Ventas cuando éstas se abran.

#### Scenario: Alta correcta en la página

- **WHEN** el operador envía un libro válido y la API responde 201
- **THEN** el libro aparece en el listado de la misma página, el formulario queda limpio y se muestra el mensaje de éxito sin recargar

#### Scenario: Libro nuevo en el Catálogo

- **WHEN** el operador registra un libro y después abre el Catálogo
- **THEN** el Catálogo muestra el libro registrado, leído de la API

#### Scenario: Libro nuevo en la venta

- **WHEN** el operador registra un libro y después abre Ventas
- **THEN** el selector de libros de la venta incluye el libro recién registrado

#### Scenario: Duplicado dentro de la misma sesión

- **WHEN** el operador registra dos veces un libro con el mismo ISBN sin recargar la página
- **THEN** el segundo envío se rechaza como ISBN existente

#### Scenario: Resultado desconocido

- **WHEN** el alta no recibe respuesta de la API
- **THEN** no se anuncia éxito, se informa que no se pudo confirmar si se guardó y se vuelve a leer el listado para que el operador compruebe antes de reintentar

## REMOVED Requirements

### Requirement: Opciones de editorial, género y autores desde los datos locales

**Reason**: Las opciones salen de la API, no del almacén local.
**Migration**: La reemplaza «Opciones de editorial, género y autores desde la API».

### Requirement: Listado de libros generado desde el Almacén

**Reason**: El listado sale de la API, no del almacén local.
**Migration**: La reemplaza «Listado de libros generado desde la API».
