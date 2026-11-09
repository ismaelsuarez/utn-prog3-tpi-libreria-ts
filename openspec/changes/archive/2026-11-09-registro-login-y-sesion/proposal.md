# Proposal

## Why

El TPI de TypeScript pide registro e inicio de sesión sobre `localStorage`: el registro (`src/pages/auth/registro/`) debe pedir email y contraseña, sin selector de rol, y guardar los usuarios en un arreglo de objetos bajo la clave `"users"`; el login (`src/pages/auth/login/`) debe buscar en `"users"` una coincidencia de email y contraseña y, si es correcta, guardar el objeto del usuario en `"userData"` para iniciar la sesión. La rúbrica premia que «Registro y Login validan datos correctamente en localStorage» (frente a «permite registros duplicados») y que se usen «interfaces y tipos específicos en todo el proyecto». La API de producción no tiene usuarios ni autenticación y no se puede modificar, por lo que todo vive en el navegador (DD-19). Este change es el siguiente en el camino crítico (`T-01 → T-03 → T-04`): `proteccion-de-rutas-y-roles` necesita una sesión tipada que leer.

## What Changes

- Vista **Registro** en `src/pages/auth/registro/` con email, contraseña y repetición de la contraseña, sin selector de rol: valida formato y duplicados de email (normalizado), largo de la contraseña y coincidencia de ambas contraseñas, y agrega el usuario con rol `client` al arreglo de la clave `"users"`.
- Vista **Login** en `src/pages/auth/login/`: busca en `"users"` la coincidencia de email y contraseña; si es correcta guarda en `"userData"` un `IUser` (`email`, `loggedIn: true`, `role`) —nunca la contraseña— y navega según el rol (`admin` → vista Libros; `client` → Catálogo). Ante credenciales incorrectas muestra un único mensaje que no revela cuál de los dos datos falló.
- La contraseña se guarda en `"users"` como huella derivada con sal (PBKDF2-SHA-256 de la Web Crypto API del navegador), nunca en texto plano. **Pendiente de confirmación del usuario** (ver «Preguntas abiertas» en `design.md`): la alternativa literal de la consigna es el texto plano.
- Usuario `admin` sembrado en el primer inicio, con credenciales de demostración documentadas en el README para el evaluador.
- API de sesión tipada en `src/utils/auth.ts` (obtener la sesión vigente validada, cerrar sesión) y `src/utils/navigate.ts`, lista para que `src/main.ts` la use en `proteccion-de-rutas-y-roles`. Botón «Cerrar sesión» en el encabezado de las cinco vistas.
- Las páginas de login y registro redirigen según el rol si ya hay una sesión válida.
- **BREAKING (entrada)**: el `index.html` de la raíz redirige al login en lugar del Catálogo.
- Almacenamiento de usuarios y sesión en un almacén propio de `src/datos/local/` que recibe el almacenamiento inyectado; la regla dura 7 se reformula para admitirlo (sigue habiendo un único archivo que nombra `localStorage`).
- Documentación: README (credenciales de demostración, casos manuales nuevos, limitación de seguridad), `knowledge-base/` (actores y roles, modelo de datos, arquitectura, decisiones), `CLAUDE.md`/`AGENTS.md` (entrada al login, regla 7).

## Capabilities

### New Capabilities

- `usuarios-y-sesion`: registro de usuarios, inicio y cierre de sesión, usuario administrador inicial, forma de lo guardado en `"users"` y `"userData"`, lectura validada de la sesión y comportamiento ante almacenamiento no disponible; todo solo en el cliente.

### Modified Capabilities

- `estructura-y-navegacion`: la página de entrada redirige al login; la zona `auth` aloja las páginas de login y registro; la navegación de las cinco vistas suma el cierre de sesión y no se muestra en las páginas de `auth`.
- `acceso-a-datos`: la frontera única de acceso a datos de las vistas incluye también los usuarios y la sesión.

## Impact

- Código nuevo: `src/pages/auth/login/{login.html,login.ts}`, `src/pages/auth/registro/{registro.html,registro.ts}`, `src/types/usuario.ts`, `src/logica/usuarios.ts`, `src/logica/sesion.ts`, `src/datos/local/almacen-usuarios.ts`, `src/datos/local/contrasenas.ts`, `src/datos/autenticacion.ts`, `src/utils/auth.ts`, `src/utils/navigate.ts`, pruebas en `tests/logica/` y `tests/datos/`.
- Código modificado: `index.html`, `vite.config.ts` (dos entradas nuevas), `src/datos/proveedor.ts`, `src/main.ts` (solo conecta el cierre de sesión; la intercepción es de T-04), encabezados de las cinco vistas, `src/styles/componentes.css` (estilos mínimos de la página de acceso, si hacen falta).
- Datos: claves nuevas `users` y `userData` en `localStorage`, sin prefijo `libreria.` porque las fija la consigna. Las claves existentes no cambian.
- Sin dependencias nuevas (la Web Crypto API es nativa del navegador y de Node 20+). Sin llamadas a la API de producción.
- Seguridad: protección solo en el cliente; quien tenga acceso al navegador puede editar `"userData"` y la API sigue abierta (limitación documentada, no una medida de seguridad real). Gobernanza CRÍTICA: la implementación requiere aprobación explícita de este plan antes de escribir código.
- Fuera de alcance: intercepción de la carga de página, redirecciones por zona y ocultamiento de enlaces según el rol (`proteccion-de-rutas-y-roles`); recuperación o cambio de contraseña, edición o borrado de usuarios (regla dura 9).
