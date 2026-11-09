# Proposal

## Why

El paso 3 del TPI de TypeScript («Protección de Rutas (El "Guard")») pide que las páginas no sean accesibles mediante su dirección si no hay sesión, con una función en `src/main.ts` que intercepte la carga de la página, y que un usuario con rol `client` que intenta entrar a una carpeta `/admin/` sea «redirigido automáticamente al login o a su zona permitida». Hoy, con `registro-login-y-sesion` (T-03) archivado, la sesión existe y está tipada, pero las cinco vistas todavía se abren por su dirección sin sesión y la navegación ofrece las vistas de gestión a cualquier usuario (`knowledge-base/03_actores_y_roles.md`, «Rutas públicas»). Este change es el siguiente del camino crítico (`T-01 → T-03 → T-04 → T-05`).

## What Changes

- **Intercepción de la carga en `src/main.ts`**, que todas las vistas importan primero: decide por la zona de la dirección (`auth`, `client`, `admin`) y por la sesión vigente si la página se muestra o se redirige.
  - Sin sesión: cualquier página de las zonas `client` y `admin` redirige al login.
  - Rol `client`: alcanza el Catálogo (zona `client`); una página de la zona `admin` lo redirige al Catálogo, el destino de su rol.
  - Rol `admin`: alcanza las zonas `admin` y `client`.
  - Con sesión, login y registro (zona `auth`) siguen redirigiendo al destino del rol; esa comprobación pasa de cada página al punto común.
- **Sin contenido protegido a la vista antes de decidir**: el cuerpo de las páginas nace oculto y solo se muestra cuando el acceso se permite; mientras se redirige, el código de la vista no se ejecuta.
- **Recarga y caché de ida y vuelta**: la decisión se repite al recargar y cuando el navegador restaura la página desde la caché de ida y vuelta (`pageshow` con `persisted`), por ejemplo al volver atrás después de cerrar la sesión.
- **Navegación según el rol**: la navegación del encabezado ofrece a `client` solo las vistas de su zona (Catálogo) y a `admin` las cinco; el cierre de sesión sigue igual.
- **Sesión cotejada con `users`**: la sesión vigente exige además que su email exista en `users` con el mismo rol; un `userData` editado a mano con un rol distinto del registrado se trata como sesión ausente. Sigue siendo una protección solo del cliente (ver `design.md`, D2).
- Las redirecciones usan las rutas relativas existentes (`rutaDe`, `navegar`), de modo que funcionan servidas bajo una subruta (`base: "./"`).
- Documentación: README (limitación de la protección solo en el cliente, casos manuales nuevos y actualización de CM-10 y CM-11), `knowledge-base/` (rutas públicas, arquitectura, decisión nueva), `CHANGES.md`.

## Capabilities

### New Capabilities

- `proteccion-de-rutas`: decisión de acceso por zona y rol al cargar cada página, destino de cada redirección, ocultamiento del contenido hasta decidir, repetición de la decisión al recargar y al restaurar desde la caché de ida y vuelta, y funcionamiento bajo una subruta.

### Modified Capabilities

- `usuarios-y-sesion`: la lectura validada de la sesión coteja el email y el rol de `userData` con `users`; la limitación de seguridad documentada incluye la protección de rutas.
- `estructura-y-navegacion`: la navegación de las vistas deja de mostrar siempre los cinco enlaces y ofrece solo las vistas que el rol puede abrir.

## Impact

- Código: `src/main.ts` (intercepción), `src/logica/sesion.ts` (zona de una dirección, decisión de acceso, cotejo con `users`; funciones puras), `src/datos/autenticacion.ts` (sesión cotejada), `src/utils/dom.ts` y `src/utils/auth.ts` (adaptador de DOM y de navegación), los siete HTML de `src/pages/` (cuerpo oculto al nacer) y `src/pages/auth/{login,registro}/*.ts` (se quita la comprobación de sesión que pasa a `main.ts`).
- Pruebas: `tests/logica/sesion.test.ts` y `tests/datos/autenticacion.test.ts`; el DOM se verifica con casos manuales en el navegador.
- Sin red: el change no hace solicitudes ni toca la API de producción, que no se puede modificar.
- Sin dependencias nuevas ni cambios en `vite.config.ts`.
- Gobernanza CRÍTICA (control de acceso, aunque solo en el cliente): no se escribe código hasta que el usuario apruebe el plan.
