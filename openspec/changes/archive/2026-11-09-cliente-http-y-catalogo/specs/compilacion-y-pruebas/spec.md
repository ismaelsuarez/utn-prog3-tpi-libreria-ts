# Spec Delta

## ADDED Requirements

### Requirement: Pruebas del acceso a la API sin red

La suite automatizada SHALL cubrir el cliente HTTP y los repositorios sobre la API con una función de solicitud simulada e inyectada, y SHALL ejecutarse sin realizar ninguna solicitud de red real.

#### Scenario: Suite sin conexión

- **WHEN** se ejecuta `npm test` en una máquina sin conexión a Internet
- **THEN** las pruebas del cliente HTTP y de los repositorios sobre la API pasan con el mismo resultado que con conexión

#### Scenario: Casos de error cubiertos

- **WHEN** se revisan las pruebas del cliente HTTP
- **THEN** cubren respuesta correcta, error con `detail` de texto, error 422 con lista de detalles, respuesta que no es JSON, falla de red y tiempo agotado
