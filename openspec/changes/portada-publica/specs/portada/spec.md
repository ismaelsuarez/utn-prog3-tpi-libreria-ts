# Spec Delta

## Purpose

Define la portada pública de la librería: la página de presentación que se ve al abrir la raíz del sitio, con un texto sobre la librería y los accesos para ingresar o crear una cuenta, sin datos de negocio ni solicitudes a la API.

## ADDED Requirements

### Requirement: Contenido de la portada

La portada SHALL presentar la identidad de «Librería El Faro» (encabezado con la marca, presentación con la imagen de la estantería del proyecto y pie con los integrantes del equipo) y un texto breve que describe la librería y lo que permite hacer la aplicación.

#### Scenario: Apertura de la portada

- **WHEN** el visitante abre la raíz de la aplicación
- **THEN** ve el nombre «Librería El Faro», un título principal, un texto de presentación de la librería y de la aplicación, y el pie con los nombres Avalos Pablo, Blangetti Sofia y Suarez Ismael

#### Scenario: Título del documento

- **WHEN** la portada está abierta en una pestaña
- **THEN** el título de la pestaña nombra la portada y la librería

### Requirement: Accesos para ingresar y crear cuenta

La portada SHALL ofrecer dos accesos visibles con apariencia de botón, «Ingresar» y «Crear cuenta», que llevan respectivamente a la página de login y a la de registro mediante enlaces relativos.

#### Scenario: Ingresar desde la portada

- **WHEN** sin sesión el visitante elige «Ingresar»
- **THEN** el navegador abre la página de login con su formulario

#### Scenario: Crear cuenta desde la portada

- **WHEN** sin sesión el visitante elige «Crear cuenta»
- **THEN** el navegador abre la página de registro con su formulario

#### Scenario: Accesos bajo una subruta

- **WHEN** la compilación se sirve bajo una subruta y desde su portada se elige cualquiera de los dos accesos
- **THEN** el navegador llega a la página elegida dentro de esa misma subruta, sin respuestas 404

### Requirement: Portada sin datos ni solicitudes a la API

La portada SHALL NOT mostrar datos de negocio (libros, editoriales, géneros, autores, clientes ni ventas), SHALL NOT hacer ninguna solicitud a `/api` y SHALL NOT ejecutar scripts: sus únicas solicitudes son su propio HTML, sus hojas de estilo y sus imágenes, todas del mismo origen.

#### Scenario: Solicitudes de red de la portada

- **WHEN** se abre la portada con las herramientas de red del navegador y se espera a que termine de cargar
- **THEN** ninguna solicitud se dirige a `/api` ni a otro origen, y todas corresponden al HTML, las hojas de estilo y las imágenes de la portada

#### Scenario: Portada sin scripts

- **WHEN** se inspecciona el HTML de la portada, en el código fuente y en la compilación
- **THEN** no contiene ningún elemento `script` ni manejadores de eventos en línea

### Requirement: Portada igual con o sin sesión

La portada SHALL mostrarse con el mismo contenido haya o no una sesión iniciada, y SHALL NOT leer ni modificar la sesión. Con una sesión vigente, los accesos SHALL llevar a las páginas de login y registro, cuya protección existente lleva al destino del rol.

#### Scenario: Portada con sesión de administrador

- **WHEN** con sesión `admin` se abre la portada y se elige «Ingresar»
- **THEN** la portada se muestra igual que sin sesión, y al elegir «Ingresar» el navegador termina en la vista Libros

#### Scenario: Portada con sesión de cliente

- **WHEN** con sesión `client` se abre la portada y se elige «Crear cuenta»
- **THEN** la portada se muestra igual que sin sesión, y el navegador termina en el Catálogo sin mostrar el formulario de registro

#### Scenario: Sesión intacta

- **WHEN** se abre la portada con `userData` y `users` guardados
- **THEN** ambas claves quedan con el mismo contenido que antes de abrirla

### Requirement: Protección de las demás páginas sin cambios

Agregar la portada SHALL NOT cambiar la decisión de acceso de ninguna página de las zonas `auth`, `client` y `admin`: sin sesión, toda página de `client` y `admin` sigue llevando al login, y cada rol conserva las páginas que puede abrir.

#### Scenario: Vista protegida después de pasar por la portada

- **WHEN** sin sesión se abre la portada y luego se escribe la dirección del Catálogo
- **THEN** el navegador pasa a la página de login y el Catálogo no solicita libros

### Requirement: Regreso a la portada desde las páginas de acceso

Las páginas de login y de registro SHALL enlazar a la portada desde la marca de su encabezado, con un enlace relativo que funcione también bajo una subruta.

#### Scenario: Volver a la portada desde el login

- **WHEN** en la página de login el visitante elige la marca «Librería El Faro» del encabezado
- **THEN** el navegador abre la portada

#### Scenario: Volver a la portada desde el registro

- **WHEN** en la página de registro el visitante elige la marca «Librería El Faro» del encabezado
- **THEN** el navegador abre la portada

### Requirement: Portada accesible y adaptable

La portada SHALL estructurarse con encabezado, navegación, contenido principal y pie mediante etiquetas semánticas y un único título principal, SHALL poder recorrerse con el teclado con foco visible en sus enlaces y SHALL verse sin desplazamiento horizontal de 320 px a 1280 px de ancho, con texto legible sobre la imagen de fondo.

#### Scenario: Recorrido con teclado

- **WHEN** el visitante recorre la portada con la tecla Tab
- **THEN** cada enlace recibe el foco en orden de lectura y el foco se ve en todos

#### Scenario: Anchos extremos

- **WHEN** la portada se ve a 320 px y a 1280 px de ancho
- **THEN** no hay desplazamiento horizontal de la página y los dos accesos se ven completos y se pueden usar

#### Scenario: Estructura semántica

- **WHEN** se inspecciona la portada
- **THEN** contiene un encabezado, una navegación, un contenido principal y un pie, cada uno con su etiqueta semántica, y exactamente un título principal
