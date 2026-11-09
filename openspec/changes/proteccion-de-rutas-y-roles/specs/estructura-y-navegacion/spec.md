# Spec Delta

## MODIFIED Requirements

### Requirement: Navegación entre vistas
Cada página de las cinco vistas SHALL incluir una navegación con enlaces solo a las vistas que el rol de la sesión puede abrir, en el mismo orden en todas las páginas: las cinco vistas para `admin` y solo el Catálogo para `client`. SHALL indicar cuál es la vista actual de un modo que no dependa solo del color. Las páginas de login y registro no SHALL mostrar esa navegación; cada una SHALL enlazar a la otra.

#### Scenario: Navegación desde cualquier página
- **WHEN** el operador está en cualquier vista y elige el enlace de otra
- **THEN** se abre la página de la vista elegida

#### Scenario: Indicación de la vista actual
- **WHEN** el operador está en la vista Ventas
- **THEN** el enlace Ventas de la navegación está marcado como la página actual y los demás no

#### Scenario: Navegación del administrador
- **WHEN** un usuario con sesión `admin` abre cualquiera de las cinco vistas
- **THEN** la navegación muestra los enlaces Catálogo, Libros, Clientes, Ventas e Historial, en ese orden

#### Scenario: Navegación del cliente
- **WHEN** un usuario con sesión `client` abre el Catálogo
- **THEN** la navegación muestra solo el enlace Catálogo, marcado como la página actual, y los enlaces a Libros, Clientes, Ventas e Historial no quedan en la página, tampoco para las tecnologías de asistencia

#### Scenario: Páginas de acceso
- **WHEN** el visitante está en la página de login o en la de registro
- **THEN** no ve los enlaces a las cinco vistas y sí un enlace a la otra página de acceso
