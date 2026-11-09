# Spec Delta

## MODIFIED Requirements

### Requirement: Página de entrada
El proyecto SHALL tener `index.html` en la raíz como página de entrada, y esa página SHALL redirigir de inmediato a la vista Catálogo, sin contenido propio de la librería.

#### Scenario: Apertura del proyecto
- **WHEN** el operador abre la dirección raíz de la aplicación (servidor de desarrollo o compilación servida)
- **THEN** el navegador pasa a la vista Catálogo, que muestra el título de la librería

#### Scenario: Entrada servida desde una subruta
- **WHEN** la compilación se sirve bajo una subruta y el operador abre su `index.html`
- **THEN** la redirección llega a la vista Catálogo dentro de esa misma subruta

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Apertura sin servidor
**Reason**: el TPI de TypeScript exige Vite y TypeScript; los módulos ES y la compilación no se pueden abrir desde `file://`, y los datos de negocio pasarán a la API de producción, que solo es alcanzable a través del mismo origen.
**Migration**: ejecutar `npm install` y luego `npm run dev` para desarrollar, o `npm run build` y `npm run preview` para servir la compilación (requisito «Comandos del proyecto» de `compilacion-y-pruebas`). La ausencia de recursos externos se conserva en «Recursos propios y solicitudes del mismo origen».
