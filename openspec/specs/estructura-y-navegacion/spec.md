# estructura-y-navegacion Specification

## Purpose

Define la página de entrada, las cinco vistas de la librería y la navegación entre ellas, de modo que cualquier operación sea alcanzable desde cualquier página abriendo el proyecto directamente en el navegador.

## Requirements

### Requirement: Página de entrada
El proyecto SHALL tener `index.html` en la raíz como página de entrada, y esa página SHALL redirigir de inmediato a la vista Catálogo, sin contenido propio de la librería.

#### Scenario: Apertura del proyecto
- **WHEN** el operador abre la dirección raíz de la aplicación (servidor de desarrollo o compilación servida)
- **THEN** el navegador pasa a la vista Catálogo, que muestra el título de la librería

#### Scenario: Entrada servida desde una subruta
- **WHEN** la compilación se sirve bajo una subruta y el operador abre su `index.html`
- **THEN** la redirección llega a la vista Catálogo dentro de esa misma subruta

### Requirement: Cinco vistas
El proyecto SHALL ofrecer cinco vistas, cada una en su propia página: Catálogo, Libros, Clientes, Ventas e Historial.

#### Scenario: Existencia de las vistas
- **WHEN** el operador recorre la navegación
- **THEN** puede llegar a las vistas Catálogo, Libros, Clientes, Ventas e Historial

### Requirement: Navegación entre vistas
Cada página SHALL incluir una navegación con enlaces a las cinco vistas, en el mismo orden en todas las páginas, y SHALL indicar cuál es la vista actual de un modo que no dependa solo del color.

#### Scenario: Navegación desde cualquier página
- **WHEN** el operador está en cualquier vista y elige el enlace de otra
- **THEN** se abre la página de la vista elegida

#### Scenario: Indicación de la vista actual
- **WHEN** el operador está en la vista Ventas
- **THEN** el enlace Ventas de la navegación está marcado como la página actual y los demás no

### Requirement: Regiones semánticas
Cada página SHALL estructurarse con encabezado, navegación, contenido principal y pie mediante etiquetas semánticas, y SHALL tener un único título principal que nombre la vista.

#### Scenario: Estructura de una página
- **WHEN** se inspecciona cualquier página
- **THEN** contiene un encabezado, una navegación, un contenido principal y un pie, cada uno con su etiqueta semántica, y exactamente un título principal

#### Scenario: Título del documento
- **WHEN** el operador tiene varias vistas abiertas en pestañas
- **THEN** el título de cada pestaña nombra la vista y la librería

### Requirement: Identificación de maquetas
Todo control cuya operación todavía no esté implementada SHALL identificarse visiblemente con texto como maqueta, y el README SHALL indicar qué pantallas son maquetas y qué interacciones ya funcionan.

#### Scenario: Control aún no funcional
- **WHEN** el operador ve un formulario o un botón cuya operación no está implementada
- **THEN** un texto visible junto a ese control indica que es una maqueta

#### Scenario: Estado declarado en el README
- **WHEN** el docente lee el README durante la Etapa 1
- **THEN** encuentra la lista de pantallas que son maquetas y la lista de interacciones que ya funcionan

### Requirement: Vistas organizadas por zona
Cada vista SHALL publicarse en `src/pages/<zona>/<vista>/<vista>.html`, con las zonas `auth`, `admin` y `client`. La vista Catálogo SHALL estar en la zona `client`; las vistas Libros, Clientes, Ventas e Historial SHALL estar en la zona `admin`.

#### Scenario: Rutas de las vistas
- **WHEN** se recorren las cinco vistas
- **THEN** la dirección del Catálogo contiene `/client/` y las direcciones de Libros, Clientes, Ventas e Historial contienen `/admin/`

#### Scenario: Navegación con las rutas nuevas
- **WHEN** el operador usa cualquier enlace de la navegación
- **THEN** llega a la vista elegida en su zona, sin respuestas 404

### Requirement: Recursos propios y solicitudes del mismo origen
Las páginas SHALL cargar solo estilos, scripts, tipografías e imágenes del propio proyecto, y toda solicitud de datos SHALL dirigirse al mismo origen de la aplicación.

#### Scenario: Recursos solicitados por una vista
- **WHEN** se revisan las solicitudes de red de cualquier vista
- **THEN** todas se dirigen al mismo origen de la aplicación y ninguna a otra dirección
