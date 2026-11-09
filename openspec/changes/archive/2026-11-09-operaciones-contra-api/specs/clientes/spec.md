# Spec Delta

## ADDED Requirements

### Requirement: Teléfono, dirección y límites del servidor en el alta de cliente

El alta SHALL exigir un teléfono de 7 a 15 dígitos (admite `+`, espacios, paréntesis, puntos y guiones) de hasta 30 caracteres, y SHALL admitir una dirección opcional de hasta 255 caracteres. SHALL rechazar, señalando el campo, un nombre de más de 100 caracteres o un email de más de 255, porque la API no los valida y fallaría.

#### Scenario: Teléfono ausente o inválido

- **WHEN** el operador envía el teléfono vacío, con 6 dígitos o con letras
- **THEN** el sistema rechaza el registro, señala el teléfono y no envía nada a la API

#### Scenario: Dirección vacía

- **WHEN** el operador deja la dirección vacía y el resto es válido
- **THEN** el cliente se registra y su perfil queda sin dirección

#### Scenario: Texto más largo que el admitido

- **WHEN** el operador envía un nombre de 101 caracteres, una dirección de 256 o un teléfono válido de 31 caracteres
- **THEN** el sistema rechaza el registro y señala ese campo

### Requirement: Listado de clientes generado desde la API

El listado de clientes SHALL generarse a partir de los clientes que entrega la API, mostrando nombre completo, email, teléfono y dirección («—» cuando el cliente no tiene perfil o el dato falta). Si la API no tiene clientes se muestra un mensaje de lista vacía.

#### Scenario: Listado con los clientes vigentes

- **WHEN** el operador abre la vista Clientes
- **THEN** las filas de la tabla muestran los clientes de la API con su nombre, email, teléfono y dirección

#### Scenario: Cliente sin perfil

- **WHEN** la API entrega un cliente con `perfil` `null`
- **THEN** su fila muestra «—» en teléfono y dirección

#### Scenario: Sin clientes registrados

- **WHEN** la API no tiene clientes
- **THEN** la tabla se oculta o queda vacía y se muestra el mensaje de lista vacía

### Requirement: Perfil del cliente de una sola vez

El teléfono y la dirección de un cliente que ya tiene perfil SHALL mostrarse sin controles de edición, porque la API no permite modificarlo. Un cliente sin perfil SHALL ofrecer «Completar perfil», que registra teléfono y dirección una única vez con las mismas reglas del alta.

#### Scenario: Cliente con perfil

- **WHEN** el operador mira un cliente que ya tiene perfil
- **THEN** no encuentra ningún control para cambiar su teléfono ni su dirección

#### Scenario: Completar el perfil

- **WHEN** el operador completa el perfil de un cliente sin perfil con un teléfono válido y la API responde 201
- **THEN** el listado muestra el teléfono y la dirección, y el cliente deja de ofrecer «Completar perfil»

#### Scenario: Perfil ya existente en la API

- **WHEN** la API responde 409 con `{"detail": "El cliente ya tiene un perfil"}`
- **THEN** se muestra ese mensaje y se vuelve a leer el listado

### Requirement: Alta de cliente con perfil fallido

El alta SHALL registrar primero el cliente y después su perfil. Si el cliente se registra pero el perfil falla, SHALL informar que el cliente quedó registrado sin teléfono ni dirección, con el motivo, actualizar el listado y no reintentar automáticamente.

#### Scenario: Perfil rechazado después del cliente

- **WHEN** `POST /clientes/` responde 201 y `POST /clientes/{id}/perfil` responde con error o sin respuesta
- **THEN** se informa que el cliente se registró sin perfil y que puede completarlo con «Completar perfil», el cliente aparece en el listado con «—» y no se envía otro `POST /clientes/`

#### Scenario: Cliente rechazado

- **WHEN** `POST /clientes/` responde con error
- **THEN** no se envía el perfil y no se anuncia ningún registro

### Requirement: Clientes no modificables

La vista Clientes no SHALL ofrecer controles para editar ni para eliminar clientes; la única escritura posterior al alta es «Completar perfil».

#### Scenario: Ausencia de controles de edición

- **WHEN** el operador revisa el listado de clientes
- **THEN** no encuentra ningún control para editar ni eliminar un cliente, y no se envía `PATCH` a la API

## MODIFIED Requirements

### Requirement: Formulario de alta de cliente
La vista Clientes SHALL presentar un formulario de alta con los campos nombre completo, email, teléfono y dirección, sin un campo de apellido separado, y un botón para registrar el cliente.

#### Scenario: Campos del formulario
- **WHEN** el operador abre la vista Clientes
- **THEN** ve un formulario con los campos nombre completo, email, teléfono y dirección, y un botón para registrar el cliente

#### Scenario: Nombre en un solo campo
- **WHEN** el operador busca dónde escribir el apellido
- **THEN** encuentra un único campo para el nombre completo

### Requirement: Listado de clientes registrados
La vista Clientes SHALL mostrar los clientes registrados en una tabla con las columnas nombre completo, email, teléfono y dirección.

#### Scenario: Columnas del listado
- **WHEN** el operador mira el listado de clientes
- **THEN** la tabla tiene las columnas nombre completo, email, teléfono y dirección

### Requirement: Errores por campo sin registrar el cliente

El formulario de cliente SHALL mostrar un mensaje de error junto a cada campo rechazado, pudiendo acumular varios mensajes a la vez, y SHALL enviar el cliente a la API solo cuando todas las comprobaciones pasan. Un rechazo 409 del alta del cliente SHALL mostrarse junto al email; otros rechazos de la API, como error de la operación.

#### Scenario: Varios errores a la vez

- **WHEN** el operador envía un formulario con nombre vacío y email sin arroba
- **THEN** se muestran los dos mensajes, cada uno junto a su campo, y no se envía nada a la API

#### Scenario: Sin errores

- **WHEN** el operador envía un formulario que pasa todas las comprobaciones
- **THEN** no se muestra ningún mensaje de error y el cliente se envía a la API

#### Scenario: Email repetido en la API

- **WHEN** la API responde 409 con `{"detail": "Ya existe un cliente con ese email"}` al alta del cliente
- **THEN** el mensaje se muestra junto al email, el formulario conserva lo escrito y no se envía el perfil

### Requirement: Efecto del alta de cliente

Al registrar un cliente válido, el sistema SHALL enviarlo a la API con su perfil y, cuando la API confirma ambos, actualizar el listado con los clientes de la API sin recargar la página, limpiar el formulario y mostrar un mensaje de operación correcta. El cliente quedará visible en las demás páginas (por ejemplo la de Ventas) cuando éstas se abran.

#### Scenario: Alta correcta en la página

- **WHEN** el operador envía un cliente válido y la API confirma el cliente y el perfil
- **THEN** el cliente aparece en el listado de la misma página con su teléfono y dirección, el formulario queda limpio y se muestra el mensaje de éxito sin recargar

#### Scenario: Cliente nuevo en otra vista

- **WHEN** el operador registra un cliente y después abre otra vista que lista clientes
- **THEN** esa vista incluye al cliente recién registrado

#### Scenario: Duplicado dentro de la misma sesión

- **WHEN** el operador registra dos veces el mismo email sin recargar la página
- **THEN** el segundo envío se rechaza como email repetido

## REMOVED Requirements

### Requirement: Listado de clientes generado desde el Almacén

**Reason**: El listado sale de la API, no del almacén local.
**Migration**: La reemplaza «Listado de clientes generado desde la API».
