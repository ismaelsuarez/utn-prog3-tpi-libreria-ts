# formularios-y-mensajes Specification

## Purpose

Establece las reglas comunes a todas las vistas para campos, botones, tablas y mensajes, de modo que el operador entienda qué se espera en cada control y qué ocurrió después de cada acción.

## Requirements

### Requirement: Etiquetas de campos
Cada campo de formulario SHALL tener una etiqueta de texto asociada, y cada grupo de opciones relacionadas SHALL tener un título de grupo.

#### Scenario: Campo con etiqueta
- **WHEN** el operador hace clic sobre la etiqueta de un campo
- **THEN** el foco pasa a ese campo

#### Scenario: Grupo de opciones
- **WHEN** el operador llega al grupo de autores del formulario de libros
- **THEN** el grupo tiene un título que indica que se trata de los autores

### Requirement: Textos de botones
Cada botón SHALL tener un texto visible que describa la acción que realiza.

#### Scenario: Botón de envío
- **WHEN** el operador ve el botón de envío del formulario de clientes
- **THEN** el texto del botón nombra la acción, por ejemplo «Registrar cliente»

#### Scenario: Botones repetidos en un listado
- **WHEN** un listado tiene un botón por cada elemento
- **THEN** cada botón permite distinguir sobre qué elemento actúa

### Requirement: Encabezados de tablas
Cada tabla SHALL tener un título que la describa y un encabezado por cada columna.

#### Scenario: Tabla de un listado
- **WHEN** se inspecciona la tabla de clientes
- **THEN** tiene un título y los encabezados de columna Nombre completo y Email

### Requirement: Mensaje de lista vacía
Cada listado SHALL tener previsto un mensaje de texto que se muestra en lugar del listado cuando no hay elementos.

#### Scenario: Listado sin elementos
- **WHEN** un listado no tiene elementos
- **THEN** se muestra un mensaje que indica que no hay elementos registrados

#### Scenario: Listado con elementos
- **WHEN** un listado tiene al menos un elemento
- **THEN** el mensaje de lista vacía no se muestra

### Requirement: Mensajes de resultado de una operación
Cada vista con un formulario de alta o de venta SHALL tener, cerca del formulario, un lugar para el mensaje de operación correcta y otro para el de operación rechazada, y ambos SHALL expresarse con texto.

#### Scenario: Lugares previstos
- **WHEN** se inspecciona una vista con un formulario de alta o de venta
- **THEN** existe un lugar para el mensaje de operación correcta y otro para el de operación rechazada, ubicados junto al formulario

#### Scenario: Sin operación realizada
- **WHEN** el operador abre la vista y todavía no realizó ninguna operación
- **THEN** no se muestra ningún mensaje de resultado

### Requirement: Error por campo
Cada campo que se valida SHALL tener previsto un lugar propio para su mensaje de error, ubicado junto al campo y asociado a él.

#### Scenario: Lugar del error de un campo
- **WHEN** se inspecciona el campo ISBN del formulario de libros
- **THEN** existe junto a él un lugar para su mensaje de error, asociado a ese campo

#### Scenario: Campo sin error
- **WHEN** el campo no tiene errores
- **THEN** su lugar de error no muestra ningún texto

### Requirement: Envío único mientras la operación está en curso

Mientras una operación de un formulario espera la respuesta de la API, su botón de envío SHALL quedar deshabilitado y un segundo envío del mismo formulario no SHALL producir otra solicitud. Al terminar, con éxito o con error, el botón SHALL volver a habilitarse.

#### Scenario: Doble clic en registrar

- **WHEN** el operador activa dos veces seguidas «Registrar cliente» antes de que la API responda
- **THEN** se envía un solo `POST /clientes/`

#### Scenario: Envío con Enter durante la espera

- **WHEN** el operador pulsa Enter en un campo mientras la confirmación de la venta está en curso
- **THEN** no se envía otra venta

#### Scenario: Botón disponible tras un error

- **WHEN** la API rechaza el alta
- **THEN** el botón de envío vuelve a estar habilitado y el operador puede corregir y reenviar
