# Spec Delta

## MODIFIED Requirements

### Requirement: Página de entrada
El proyecto SHALL tener `index.html` en la raíz como página de entrada, y esa página SHALL ser la portada pública de la librería: se muestra sin redirigir, con su presentación y los accesos «Ingresar» y «Crear cuenta» hacia las páginas de login y registro.

#### Scenario: Apertura del proyecto
- **WHEN** el operador abre la dirección raíz de la aplicación (servidor de desarrollo o compilación servida)
- **THEN** el navegador muestra la portada, sin pasar por otra página, con los accesos «Ingresar» y «Crear cuenta»

#### Scenario: Entrada servida desde una subruta
- **WHEN** la compilación se sirve bajo una subruta y el operador abre su `index.html`
- **THEN** se muestra la portada con sus estilos e imágenes, sin respuestas 404, y su acceso «Ingresar» llega a la página de login dentro de esa misma subruta
