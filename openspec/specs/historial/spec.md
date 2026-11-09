# historial Specification

## Purpose

Permite al operador consultar las ventas confirmadas y revisar el detalle de cada una.

## Requirements

### Requirement: Listado de ventas
La vista Historial SHALL mostrar las ventas en una tabla con las columnas identificador, fecha, cliente y total.

#### Scenario: Columnas del listado
- **WHEN** el operador abre la vista Historial
- **THEN** la tabla de ventas tiene las columnas identificador, fecha, cliente y total

#### Scenario: Total con dos decimales
- **WHEN** el operador mira el total de una venta
- **THEN** el importe se presenta con dos decimales

### Requirement: Acceso al detalle de una venta
Cada venta del listado SHALL ofrecer un control para consultar su detalle, y el detalle SHALL mostrarse en la misma página.

#### Scenario: Control de acceso al detalle
- **WHEN** el operador mira una venta del listado
- **THEN** encuentra un botón para ver su detalle, identificado con esa venta

#### Scenario: Detalle en la misma página
- **WHEN** se muestra el detalle de una venta
- **THEN** aparece en la vista Historial, sin abrir otra página

### Requirement: Contenido del detalle de una venta
El detalle SHALL identificar la venta consultada y SHALL mostrar sus renglones en una tabla con las columnas libro, cantidad, precio unitario y subtotal, junto con el total.

#### Scenario: Renglones del detalle
- **WHEN** el operador mira el detalle de una venta
- **THEN** ve a qué venta corresponde, una tabla con libro, cantidad, precio unitario y subtotal de cada renglón, y el total

### Requirement: Ventas no modificables
La vista Historial no SHALL ofrecer controles para editar ni para eliminar ventas.

#### Scenario: Ausencia de controles de edición
- **WHEN** el operador revisa el listado y el detalle de una venta
- **THEN** no encuentra ningún control para editarla ni para eliminarla

### Requirement: Historial desde ventas guardadas
El Historial SHALL listar las ventas que entrega la API, recorriendo todas sus páginas y en el orden recibido, sin filas de ejemplo, con identificador, fecha, cliente y total. Si no hay ventas SHALL mostrar un mensaje de lista vacía y no presentar un detalle ficticio. Un fallo de lectura SHALL comunicarse como error, no como una consulta exitosa sin ventas.

#### Scenario: Venta recuperada al abrir
- **WHEN** se confirma una venta y luego se abre Historial
- **THEN** aparece esa venta con los importes que registró la API

#### Scenario: Más ventas que una página
- **WHEN** la API tiene 120 ventas
- **THEN** el Historial muestra las 120, pedidas en páginas de 100

#### Scenario: Ninguna venta confirmada
- **WHEN** la API devuelve una lista de ventas vacía
- **THEN** se muestra «No hay ventas confirmadas.» y el detalle permanece oculto

#### Scenario: Lectura fallida
- **WHEN** falla la consulta de ventas a la API
- **THEN** se informa el error sin presentar las filas de maqueta ni afirmar que la consulta terminó correctamente

### Requirement: Fecha local de presentación
El Historial SHALL presentar la fecha de cada venta como `dd/mm/aaaa HH:mm`, con ceros iniciales y reloj de 24 horas, según la zona horaria local del navegador. La fecha ISO almacenada SHALL conservarse sin modificación.

#### Scenario: Fecha y hora local
- **WHEN** el instante guardado corresponde localmente al 5 de enero de 2026 a las 9 horas y 7 minutos
- **THEN** se muestra `05/01/2026 09:07`

#### Scenario: Cambio de día entre UTC y hora local
- **WHEN** una venta tiene fecha `2026-01-06T01:07:00.000Z` y el navegador está en UTC-03:00
- **THEN** se muestra `05/01/2026 22:07` y la fecha ISO guardada no cambia

### Requirement: Detalle histórico independiente del catálogo
El detalle SHALL mostrar en la misma página los renglones de la venta seleccionada y su total, leyendo solo los datos de esa venta que entrega la API, sin consultar el catálogo. El precio unitario, los subtotales y el total SHALL ser los registrados al confirmar; el título y el cliente, los que la API informa al consultar. La consulta SHALL ser accesible por teclado y no ofrecer edición ni eliminación.

#### Scenario: Seleccionar otra venta
- **WHEN** se activa el botón identificado de una venta distinta
- **THEN** el detalle se actualiza con su identificador y sus renglones, sin mezclar filas de la venta anterior, y el usuario puede localizarlo mediante el foco

#### Scenario: Cambio exclusivo del precio del catálogo
- **WHEN** en un backend local se cambia el precio de un libro ya vendido y se recarga el historial
- **THEN** la venta anterior conserva unitario, subtotales y total confirmados (CM-6)

#### Scenario: Datos descriptivos posteriores
- **WHEN** después de la venta cambian, en la API, el título de un libro vendido o el nombre del cliente
- **THEN** el detalle muestra el título y el cliente que la API informa al consultar, conserva unitario, subtotales y total confirmados, y no muestra ISBN porque la API no lo entrega
