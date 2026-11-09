# Spec Delta

## ADDED Requirements

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
