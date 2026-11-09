# Spec Delta

## MODIFIED Requirements

### Requirement: Página de entrada
El proyecto SHALL tener `index.html` en la raíz como página de entrada, y esa página SHALL redirigir de inmediato a la página de login, sin contenido propio de la librería.

#### Scenario: Apertura del proyecto
- **WHEN** el operador abre la dirección raíz de la aplicación (servidor de desarrollo o compilación servida)
- **THEN** el navegador pasa a la página de login, que muestra el formulario de inicio de sesión

#### Scenario: Entrada servida desde una subruta
- **WHEN** la compilación se sirve bajo una subruta y el operador abre su `index.html`
- **THEN** la redirección llega a la página de login dentro de esa misma subruta

### Requirement: Navegación entre vistas
Cada página de las cinco vistas SHALL incluir una navegación con enlaces a las cinco vistas, en el mismo orden en todas las páginas, y SHALL indicar cuál es la vista actual de un modo que no dependa solo del color. Las páginas de login y registro no SHALL mostrar esa navegación; cada una SHALL enlazar a la otra.

#### Scenario: Navegación desde cualquier página
- **WHEN** el operador está en cualquier vista y elige el enlace de otra
- **THEN** se abre la página de la vista elegida

#### Scenario: Indicación de la vista actual
- **WHEN** el operador está en la vista Ventas
- **THEN** el enlace Ventas de la navegación está marcado como la página actual y los demás no

#### Scenario: Páginas de acceso
- **WHEN** el visitante está en la página de login o en la de registro
- **THEN** no ve los enlaces a las cinco vistas y sí un enlace a la otra página de acceso

### Requirement: Vistas organizadas por zona
Cada vista SHALL publicarse en `src/pages/<zona>/<vista>/<vista>.html`, con las zonas `auth`, `admin` y `client`. La vista Catálogo SHALL estar en la zona `client`; las vistas Libros, Clientes, Ventas e Historial SHALL estar en la zona `admin`; las páginas de login y registro SHALL estar en la zona `auth`.

#### Scenario: Rutas de las vistas
- **WHEN** se recorren las cinco vistas
- **THEN** la dirección del Catálogo contiene `/client/` y las direcciones de Libros, Clientes, Ventas e Historial contienen `/admin/`

#### Scenario: Rutas de las páginas de acceso
- **WHEN** se abren las páginas de login y de registro
- **THEN** sus direcciones contienen `/auth/login/` y `/auth/registro/` respectivamente

#### Scenario: Navegación con las rutas nuevas
- **WHEN** el operador usa cualquier enlace de la navegación
- **THEN** llega a la vista elegida en su zona, sin respuestas 404
