# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Entrada al login servida por el servidor`
- TO: `### Requirement: Portada servida en la entrada`

## MODIFIED Requirements

### Requirement: Portada servida en la entrada

El servidor SHALL responder `GET /` y `GET /index.html` con estado 200 y la portada de la compilación (`index.html`), sin redirigir, con `Cache-Control: no-cache` y las mismas cabeceras de seguridad que el resto de las páginas.

#### Scenario: Apertura de la raíz

- **WHEN** se pide `GET /` al servidor
- **THEN** la respuesta es 200 con `Content-Type: text/html`, `Cache-Control: no-cache` y el contenido de la portada, sin cabecera `Location`

#### Scenario: Entrada por index.html

- **WHEN** se pide `GET /index.html` al servidor
- **THEN** la respuesta es 200 con el mismo contenido que `GET /`

#### Scenario: Cabeceras de seguridad en la portada

- **WHEN** se pide `GET /`
- **THEN** la respuesta lleva `Content-Security-Policy` con `default-src 'self'` y `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`

#### Scenario: Portada detrás del proxy

- **WHEN** se abre `https://libreria.ismaelsuarez.me/` en el navegador y se elige «Ingresar»
- **THEN** se ve la portada sin violaciones de la política de seguridad de contenido y el navegador llega a `https://libreria.ismaelsuarez.me/src/pages/auth/login/login.html`, sin pasar por `http://` ni por el puerto interno
