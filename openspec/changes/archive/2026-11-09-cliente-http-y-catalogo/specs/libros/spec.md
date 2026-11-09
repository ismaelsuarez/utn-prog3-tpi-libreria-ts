# Spec Delta

## MODIFIED Requirements

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
