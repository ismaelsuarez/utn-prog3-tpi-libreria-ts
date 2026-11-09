# Actores y Roles

## Actores del sistema

| Actor | Descripción | Cómo interactúa |
|---|---|---|
| Operador de la librería | Única persona que usa la aplicación | Navega las cinco vistas, completa formularios, arma ventas y consulta el historial desde el navegador |
| Docente evaluador | Revisa la entrega | Abre `index.html`, reproduce los casos manuales y los contrasta con el README. En la comprobación del precio histórico modifica `localStorage` con las herramientas del navegador |
| Equipo de desarrollo | Avalos Pablo, Blangetti Sofia, Suarez Ismael | Construye el proyecto y registra en el README el resultado observado de cada caso |

El docente evaluador y el equipo no son roles dentro de la aplicación: la
usan con las mismas capacidades que el operador.

## Usuarios y roles (serie TypeScript)

Desde `registro-login-y-sesion`, la aplicación distingue dos roles, guardados
solo en el navegador (la API de producción no tiene usuarios y queda abierta):

| Rol | Origen | Destino al iniciar sesión | Capacidades |
|---|---|---|---|
| `admin` | Sembrado en el primer inicio; credenciales de demostración en el README | Libros | Las de la matriz siguiente: las cinco vistas |
| `client` | Se registra desde el formulario, sin selector de rol | Catálogo | Solo consulta el Catálogo con su buscador |

El docente evaluador ingresa con el administrador de demostración o registra
un usuario `client`. El bloqueo de las vistas `admin` para usuarios sin permiso
lo implementa `proteccion-de-rutas-y-roles` (T-04); esta protección es solo del
lado del cliente.

## RBAC — Matriz de permisos

La matriz describe las capacidades del rol `admin` (antes, el único perfil de
uso de la serie JavaScript, sin autenticación):

| Recurso | Crear | Leer | Actualizar | Eliminar |
|---|---|---|---|---|
| Libro | Sí | Sí | No | No |
| Cliente | Sí | Sí | No | No |
| Venta en composición (antes de confirmar) | Sí | Sí | Sí (cantidades) | Sí (quitar renglones) |
| Venta confirmada | Sí (al confirmar) | Sí | No | No |
| Editorial, género, autor | No | Sí | No | No |

Las editoriales, los géneros y los autores provienen únicamente de los datos
iniciales.

## Rutas públicas

Páginas sin sesión requerida (zona `auth`):

- `index.html` (entrada): redirige a la página de login.
- `src/pages/auth/login/login.html`
- `src/pages/auth/registro/registro.html`

Si ya hay una sesión iniciada, login y registro redirigen al destino del rol.

Páginas que requieren sesión, según la zona:

- Zona `client` (`client` y `admin`): Catálogo.
- Zona `admin` (solo `admin`): Libros, Clientes, Ventas e Historial.

`src/main.ts` decide el acceso al cargar cada página (`proteccion-de-rutas-y-roles`,
DD-25), por la zona de la dirección y la sesión vigente (la de `userData`, que
debe coincidir con un usuario de `users`):

| Sesión | Zona `auth` | Zona `client` | Zona `admin` |
|---|---|---|---|
| Sin sesión | se muestra | login | login |
| `client` | Catálogo | se muestra | Catálogo (sin mensaje) |
| `admin` | Libros | se muestra | se muestra |

La página pedida no se ve mientras se redirige, la decisión se repite al
recargar y al volver con el historial, y la navegación del encabezado ofrece a
cada rol solo las vistas que puede abrir (el `client`, solo el Catálogo). Es una
guía de uso del lado del cliente, no seguridad real. La estructura de archivos
está en `08_arquitectura_propuesta.md`.

## Consideraciones de accesibilidad para el operador

- Todos los controles se recorren con el teclado y conservan un foco visible.
- Cada campo tiene una etiqueta asociada.
- Los botones tienen textos que describen su acción.
- Los mensajes de error se expresan con texto y no dependen solo del color.
- Las imágenes informativas tienen texto alternativo; las decorativas no
  repiten información.
