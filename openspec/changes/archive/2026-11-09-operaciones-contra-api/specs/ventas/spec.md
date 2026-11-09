# Spec Delta

## ADDED Requirements

### Requirement: Venta sin control de stock

La venta no SHALL validar las cantidades contra el stock de los libros ni modificarlo, porque la API no lo descuenta y el alcance excluye la gestión de stock.

#### Scenario: Cantidad mayor que el stock

- **WHEN** se agregan 12 unidades de un libro cuyo stock informado por la API es 10
- **THEN** el renglón se acepta y la venta puede confirmarse

#### Scenario: Stock después de vender

- **WHEN** se confirma una venta y luego se consulta el libro vendido
- **THEN** su stock es el mismo que antes de la venta

### Requirement: Cantidad dentro del límite del servidor

Una cantidad, o una acumulación de cantidades de un mismo libro, mayor que 2 147 483 647 SHALL rechazarse como cantidad inválida, porque la API no la admite y fallaría.

#### Scenario: Cantidad excesiva

- **WHEN** se intenta agregar la cantidad 2147483648
- **THEN** se muestra un error de cantidad y no cambia la venta

## MODIFIED Requirements

### Requirement: Selección desde los registros vigentes
La vista Ventas SHALL obtener de la API los clientes y los libros al abrirse, incluyendo las altas anteriores, sin conservar opciones ni renglones ficticios de la maqueta, y SHALL reutilizar esa lectura mientras compone la venta, sin volver a pedir los libros en cada cambio del borrador.

#### Scenario: Altas disponibles para vender
- **WHEN** se registra un libro o cliente y después se abre Ventas
- **THEN** el registro nuevo aparece en el selector correspondiente (CM-2 y CM-3)

#### Scenario: Borrador inicial vacío
- **WHEN** se abre Ventas
- **THEN** no hay cliente seleccionado ni renglones, se informa el estado vacío y el total es $ 0,00

#### Scenario: Una sola lectura al componer
- **WHEN** el operador agrega, cambia y quita renglones
- **THEN** no se hacen solicitudes nuevas a la API hasta confirmar la venta

#### Scenario: Lectura inicial fallida
- **WHEN** falla la lectura de clientes o de libros al abrir Ventas
- **THEN** se muestra el error en texto y no se puede confirmar una venta

### Requirement: Precio unitario redondeado antes del cálculo
El borrador SHALL redondear el precio del catálogo al centavo antes de multiplicar, con mitades hacia arriba para precios positivos, y usar ese unitario para mostrar y calcular el importe estimado, sin modificar el precio original del catálogo. Los importes de la venta confirmada son los que calcula la API.

#### Scenario: Mitad de centavo confirmada
- **WHEN** se componen 2 unidades de un libro cuyo precio de catálogo es 1500,125
- **THEN** el precio unitario estimado es 1500,13 y el subtotal estimado es 3000,26; el catálogo conserva 1500,125

#### Scenario: Mitad no representable exactamente en binario
- **WHEN** se compone una unidad de un libro de precio 1,005
- **THEN** el unitario y el subtotal estimados son 1,01

#### Scenario: Redondeo hacia abajo
- **WHEN** se componen 2 unidades a precio de catálogo 10,124
- **THEN** el unitario estimado es 10,12 y el subtotal estimado es 20,24

### Requirement: Subtotales y total monetarios coherentes
El borrador SHALL calcular cada subtotal como cantidad por unitario redondeado y el total como suma de subtotales, sin residuos visibles de punto flotante. Todos los importes SHALL mostrarse con dos decimales. Entradas no finitas o cálculos fuera del rango entero seguro de centavos SHALL rechazarse, sin confirmar importes corruptos.

#### Scenario: Venta de referencia
- **WHEN** se componen 2 unidades a 1500 y 1 unidad a 2000
- **THEN** los subtotales son 3000 y 2000 y el total es 5000, mostrados con dos decimales (CM-5)

#### Scenario: Suma decimal exacta al centavo
- **WHEN** se componen 3 unidades a 0,10 y 1 unidad a 0,20
- **THEN** los subtotales son 0,30 y 0,20 y el total visible del borrador es 0,50

#### Scenario: Precio no utilizable
- **WHEN** un libro tiene un precio no numérico, no finito o menor o igual que cero
- **THEN** se rechaza su incorporación y no se confirma una venta que lo incluya

#### Scenario: Rango inseguro
- **WHEN** una cantidad, una acumulación de cantidades, un subtotal o un total no puede representarse con enteros seguros en su unidad de cálculo
- **THEN** se informa el error sin enviar la venta ni sustituir los últimos valores válidos

### Requirement: Confirmación validada con instantánea
La confirmación SHALL requerir cliente existente, al menos un renglón, libros existentes y cantidades e importes válidos, y SHALL enviar a la API solo el identificador del cliente y, por renglón, el identificador del libro y la cantidad. La venta confirmada SHALL ser la que devuelve la API, con el precio unitario vigente al confirmar, los subtotales y el total calculados por el servidor.

#### Scenario: Sin cliente o sin renglones
- **WHEN** se confirma sin cliente, con cliente inexistente o sin renglones
- **THEN** se informa el error y no se envía ninguna venta (CM-4)

#### Scenario: Cuerpo enviado
- **WHEN** se confirma una venta del cliente 2 con 2 unidades del libro 1 y 1 unidad del libro 4
- **THEN** la API recibe `POST /ventas/` con el cuerpo `{"cliente_id":2,"renglones":[{"libro_id":1,"cantidad":2},{"libro_id":4,"cantidad":1}]}`

#### Scenario: Venta confirmada completa
- **WHEN** la API responde 201 a una venta válida
- **THEN** el comprobante muestra el identificador, la fecha, el cliente, los renglones y los importes que devolvió la API

#### Scenario: Precio cambiado antes de confirmar
- **WHEN** el precio de un libro cambia en la API entre la apertura de Ventas y la confirmación
- **THEN** el comprobante muestra el precio unitario, el subtotal y el total que calculó la API, aunque difieran del borrador

#### Scenario: Independencia de las entradas
- **WHEN** después de confirmar se modifica el borrador o cambia en la API el precio del libro vendido
- **THEN** la venta confirmada conserva el precio unitario, los subtotales y el total que registró la API

### Requirement: Resultado accesible y conservación ante fallo
La interfaz SHALL limpiar cliente y renglones y anunciar éxito solo después de que la API confirme la venta. Ante un rechazo de la API SHALL informar su mensaje y conservar el borrador; ante una falta de respuesta SHALL informar que no se sabe si la venta se registró, conservar el borrador y pedir revisar el Historial antes de reintentar. Los errores de entrada SHALL identificar el control y permitir su corrección por teclado; los datos de usuario SHALL mostrarse como texto.

#### Scenario: Nueva venta tras el éxito
- **WHEN** la API confirma la venta
- **THEN** se anuncia el resultado, queda un borrador vacío con total $ 0,00 y el mismo envío no vuelve a registrar sus renglones

#### Scenario: Fallo de almacenamiento
- **WHEN** la API responde 409 con `{"detail": "No se pudo registrar la venta: cliente o libros invalidos"}`
- **THEN** no se anuncia éxito, se muestra ese mensaje y el cliente y los renglones permanecen

#### Scenario: Resultado desconocido
- **WHEN** la confirmación no recibe respuesta de la API
- **THEN** no se anuncia éxito, se informa que no se pudo confirmar si la venta se registró y que conviene revisar el Historial antes de reintentar, y el borrador permanece sin reenviarse automáticamente

#### Scenario: Corrección accesible
- **WHEN** un envío contiene un campo inválido
- **THEN** se muestra texto de error asociado, se identifica el control inválido y se enfoca el primer error corregible sin recargar la página
