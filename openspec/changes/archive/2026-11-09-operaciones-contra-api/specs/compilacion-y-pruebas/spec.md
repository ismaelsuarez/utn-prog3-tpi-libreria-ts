# Spec Delta

## MODIFIED Requirements

### Requirement: Suite automatizada de lógica y almacén

La suite automatizada SHALL cubrir la lógica pura (normalización, filtro, validaciones, cálculos de venta) y los almacenes locales de usuarios y sesión, conservando cada caso aplicable de la suite anterior con el mismo resultado esperado, y SHALL ejecutarse sin navegador.

#### Scenario: Casos heredados conservados

- **WHEN** se compara la suite nueva con la anterior
- **THEN** cada caso anterior aplicable tiene un caso equivalente con el mismo resultado esperado, y los casos que dejan de aplicar (los del almacén local de negocio retirado) están identificados con su motivo

#### Scenario: Sin dependencia del almacenamiento del entorno

- **WHEN** la suite se ejecuta en una máquina cuyo entorno ofrece o no un `localStorage` global
- **THEN** las pruebas de los almacenes locales usan un almacenamiento simulado propio y producen el mismo resultado

### Requirement: Pruebas del acceso a la API sin red

La suite automatizada SHALL cubrir el cliente HTTP, los repositorios sobre la API (lecturas, altas y sondeos) y la regla del reenvío de desarrollo con una función de solicitud simulada e inyectada, y SHALL ejecutarse sin realizar ninguna solicitud de red real.

#### Scenario: Suite sin conexión

- **WHEN** se ejecuta `npm test` en una máquina sin conexión a Internet
- **THEN** las pruebas del cliente HTTP y de los repositorios sobre la API pasan con el mismo resultado que con conexión

#### Scenario: Casos de error cubiertos

- **WHEN** se revisan las pruebas del cliente HTTP
- **THEN** cubren respuesta correcta, error con `detail` de texto, error 422 con lista de detalles, respuesta que no es JSON, falla de red y tiempo agotado, tanto en lecturas como en altas

#### Scenario: Altas sin reintentos

- **WHEN** se revisan las pruebas de las altas
- **THEN** comprueban el método, la dirección y el cuerpo JSON de cada alta, el rechazo 409 y que una falta de respuesta produce una sola solicitud

#### Scenario: Red real no disponible para las pruebas

- **WHEN** una prueba invoca el `fetch` global sin inyectar una función de solicitud
- **THEN** la prueba falla en lugar de llegar a la red
