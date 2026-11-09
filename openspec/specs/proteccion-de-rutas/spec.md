# proteccion-de-rutas Specification

## Purpose
Decide al cargar cada página, según su zona (`auth`, `client`, `admin`) y la sesión vigente, si la página se muestra o a dónde se redirige. Es una protección solo del lado del cliente: ordena el uso de la aplicación, no protege los datos.

## Requirements

### Requirement: Intercepción común de la carga
Toda página de las zonas `auth`, `client` y `admin` SHALL decidir su acceso en el punto de entrada común que cada vista carga antes que su propio código, y SHALL tomar la zona de la dirección de la página (`/auth/`, `/client/`, `/admin/`).

#### Scenario: Apertura por dirección
- **WHEN** se abre por su dirección cualquiera de las siete páginas (login, registro, Catálogo, Libros, Clientes, Ventas o Historial)
- **THEN** la decisión de acceso se toma antes de que la vista muestre contenido o conecte sus controles

### Requirement: Sin sesión, al login
Si no hay una sesión válida, toda página de las zonas `client` y `admin` SHALL redirigir a la página de login sin mostrar su contenido. Las páginas de la zona `auth` SHALL mostrarse sin sesión.

#### Scenario: Vista de gestión sin sesión
- **WHEN** sin `userData` se abre la dirección de la vista Ventas
- **THEN** el navegador pasa a la página de login y no se ve el contenido de Ventas

#### Scenario: Catálogo sin sesión
- **WHEN** sin sesión se abre la dirección del Catálogo
- **THEN** el navegador pasa a la página de login y el Catálogo no solicita libros

#### Scenario: Sesión inválida
- **WHEN** `userData` contiene texto que no es JSON, un objeto con `loggedIn` en `false` o un `role` desconocido, y se abre la vista Libros
- **THEN** el navegador pasa a la página de login

#### Scenario: Página de acceso sin sesión
- **WHEN** sin sesión se abre la página de registro
- **THEN** se muestra el formulario de registro

### Requirement: Rol client fuera de su zona
Un usuario con rol `client` SHALL poder abrir las páginas de la zona `client`; si abre una página de la zona `admin`, el navegador SHALL pasar a la vista Catálogo, el destino de su rol, sin mostrar el contenido de la página pedida.

#### Scenario: Cliente en el Catálogo
- **WHEN** un usuario con sesión `client` abre el Catálogo
- **THEN** el Catálogo se muestra

#### Scenario: Cliente en una vista de gestión
- **WHEN** un usuario con sesión `client` escribe la dirección de la vista Clientes
- **THEN** el navegador pasa a la vista Catálogo y no se ve el contenido de Clientes

### Requirement: Rol admin en ambas zonas
Un usuario con rol `admin` SHALL poder abrir las páginas de las zonas `admin` y `client`.

#### Scenario: Administrador en gestión y en el Catálogo
- **WHEN** un usuario con sesión `admin` abre la vista Historial y luego el Catálogo
- **THEN** ambas páginas se muestran

### Requirement: Contenido oculto hasta decidir
Ninguna página de las zonas `client` y `admin` SHALL mostrar su contenido antes de que el acceso se permita; si la decisión es redirigir, la vista SHALL no leer datos, no solicitar datos a la red y no conectar sus controles.

#### Scenario: Redirección sin parpadeo
- **WHEN** un usuario con sesión `client` abre la dirección de la vista Libros
- **THEN** en ningún momento se ve el formulario ni la tabla de Libros antes de llegar al Catálogo

#### Scenario: Página permitida
- **WHEN** un usuario con sesión `admin` abre la vista Libros
- **THEN** la página se muestra completa, con su encabezado, su navegación y su contenido

### Requirement: Decisión al recargar y al volver con el historial
La decisión de acceso SHALL repetirse en cada carga, incluida la recarga, y cada vez que el navegador restaura la página desde la caché de ida y vuelta. Una página restaurada SHALL mostrarse solo si la sesión vigente en ese momento la permite.

#### Scenario: Recarga después de quitar la sesión
- **WHEN** con la vista Ventas abierta se quita `userData` desde otra pestaña y se recarga Ventas
- **THEN** el navegador pasa a la página de login

#### Scenario: Volver atrás después de cerrar la sesión
- **WHEN** un administrador pasa de Libros a Ventas, usa «Cerrar sesión» y luego el botón Atrás del navegador
- **THEN** no se ve el contenido de Libros y el navegador vuelve a la página de login

#### Scenario: Volver atrás con la sesión vigente
- **WHEN** un administrador pasa de Libros a Clientes y usa el botón Atrás
- **THEN** la vista Libros se muestra

### Requirement: Redirecciones bajo una subruta
Las redirecciones de la protección de rutas SHALL llegar a la página de destino dentro de la misma subruta desde la que se sirve la aplicación.

#### Scenario: Compilación servida bajo una subruta
- **WHEN** la compilación se sirve bajo una subruta y sin sesión se abre la vista Libros dentro de ella
- **THEN** el navegador llega a la página de login dentro de esa misma subruta, sin respuestas 404

### Requirement: Protección sin red
La protección de rutas SHALL decidir solo con lo guardado en el navegador y SHALL no hacer solicitudes de red.

#### Scenario: Redirección sin solicitudes
- **WHEN** sin sesión se abre el Catálogo y el navegador pasa al login
- **THEN** no hubo ninguna solicitud a `/api`
