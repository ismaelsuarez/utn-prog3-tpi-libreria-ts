# Spec Delta

## MODIFIED Requirements

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
