# Design

## Context

Ver [proposal.md](proposal.md) para la motivación y el alcance, y `specs/usuarios-y-sesion/spec.md` para el comportamiento exigido. Se requiere diseño porque el change agrega autenticación (gobernanza CRÍTICA), un almacén nuevo sobre `localStorage`, un contrato que consume `proteccion-de-rutas-y-roles` y una reformulación de la regla dura 7.

Estado observado (lectura, sin cambios), sobre la rama `feat/migracion-vite-typescript` con T-01 archivado:

- `src/types/IUser.ts` (`email`, `loggedIn`, `role: Rol`) y `src/types/Rol.ts` (`"client" | "admin"`) existen, copiados del repositorio base sin uso todavía. `src/pages/auth/` no existe (git no versiona carpetas vacías). `src/utils/` solo tiene `dom.ts`; T-01 (D4) anticipó que este change crearía `navigate.ts`, `auth.ts` y `localStorage.ts`.
- `src/main.ts` está vacío (`export {}`) y todas las vistas lo importan en primer lugar; es el gancho de T-04.
- `src/datos/local/almacen-local.ts` es el único archivo que nombra `localStorage` (`obtenerAlmacenamientoDelNavegador()`); el almacén se crea con almacenamiento inyectado (`AlmacenamientoInyectable = Partial<Pick<Storage, "getItem" | "setItem">>`), siembra solo claves ausentes y degrada a memoria. `src/datos/proveedor.ts` compone e inicializa una vez al importarse.
- `src/logica/texto.ts` ya tiene `normalizarEmail` (recorta y pasa a minúsculas) y `src/logica/clientes.ts` valida email con `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` y los mensajes «El email es obligatorio.», «El email no tiene un formato válido.», «Ese email ya está registrado.». Los formularios usan `novalidate`, `aria-describedby` hacia un `p.campo__error`, `aria-invalid` en el campo con error, un resumen en `role="alert"`, un mensaje de estado en `role="status"` y foco al primer error (`src/pages/admin/clientes/clientes.ts`).
- Vitest corre con `environment: "node"` (sin DOM); `tsconfig.json` incluye `lib` `DOM`, así que los tipos de `crypto.subtle` están disponibles. Node 20+ expone `globalThis.crypto` con la Web Crypto API.
- Repositorio base `chiro45/proteger_rutas`: `src/utils/localStorage.ts` (`saveUser`/`getUSer`/`removeUser` sobre `"userData"`), `src/utils/auth.ts` (`logout()` quita `userData` y navega a `/src/pages/auth/login/login.html`), `src/utils/navigate.ts`; el `index.html` raíz redirige al login. La ruta absoluta de `logout()` del base no funciona servida bajo subruta con `base: "./"`.

## Goals / Non-Goals

**Goals:**

- Cumplir los pasos 1 y 2 del TPI con tipos específicos y sin registros duplicados.
- Dejar a T-04 una API de sesión tipada y validada (`obtenerSesion(): IUser | null`, `cerrarSesion()`, destino por rol) que pueda llamar desde `src/main.ts` sin tocar las vistas.
- Mantener las reglas duras 4, 5, 6 y 7 con una sola excepción documentada para la regla 7.

**Non-Goals:**

- Interceptar la carga de páginas, redirigir por zona u ocultar enlaces según el rol (T-04).
- Recuperación o cambio de contraseña, edición o borrado de usuarios, bloqueo por intentos fallidos, vencimiento de la sesión.
- Pruebas automatizadas de DOM: las páginas se verifican con casos manuales nuevos en el README.

## Decisions

### D1 — Contraseña: huella PBKDF2-SHA-256 con sal (recomendación, pendiente de confirmación)

Cada usuario guarda `contrasena: { algoritmo: "PBKDF2-SHA-256", iteraciones: 100000, sal, huella }`, con `sal` de 16 bytes aleatorios (`crypto.getRandomValues`) y `huella` de 32 bytes (`crypto.subtle.deriveBits`), ambas en hexadecimal. Verificar recalcula con la sal y los parámetros guardados y compara.

Por qué: la consigna no exige texto plano, solo «capturar los datos y guardarlos»; muchos usuarios reutilizan contraseñas reales y `localStorage` es legible por cualquiera con acceso al navegador o a sus herramientas. PBKDF2 es la función de derivación nativa de la Web Crypto API (bcrypt y argon2 requerirían una librería, prohibida por la regla dura 1) y su costo es ajustable. La operación es asíncrona, lo que encaja con servicios que ya devuelven `Promise`.

Alternativas:

| Opción | A favor | En contra |
|---|---|---|
| Texto plano (literal del TPI) | Lo más simple; el docente ve la contraseña en `users` y puede comprobar la coincidencia a ojo | Expone contraseñas reutilizadas; contradice la práctica que la materia debería mostrar |
| SHA-256 + sal | Simple y nativo | Una sola pasada: rápido de forzar por diccionario |
| **PBKDF2-SHA-256 + sal (elegida)** | Nativo, práctica estándar sin librerías | `crypto.subtle` solo existe en contextos seguros: funciona en `localhost` y en HTTPS (`libreria.ismaelsuarez.me`), no en `http://<IP de la red>`; ~50–100 ms por verificación |

Ninguna opción es seguridad real: quien accede al navegador puede escribir `userData` con `role: "admin"` sin conocer ninguna contraseña. La huella solo evita exponer la contraseña escrita. La derivación vive detrás de `src/datos/local/contrasenas.ts` (`protegerContrasena`, `verificarContrasena`), con el `Crypto` inyectable para probar el caso «no disponible»; si el usuario elige texto plano cambian solo ese módulo, el tipo `ContrasenaGuardada`, el requisito «Contraseña nunca guardada en texto plano» y las tareas 3.1–3.2.

### D2 — Forma de lo guardado en `users` y en `userData`

- `src/types/usuario.ts`:
  - `UsuarioRegistrado { email: string; role: Rol; contrasena: ContrasenaGuardada; creadoEn: FechaIso }` — un elemento del arreglo `users`. `email` y `role` conservan los nombres de `IUser` del base (excepción a la regla 13 por nombres fijados por el base) para que ambas formas se lean igual en `localStorage`.
  - `ContrasenaGuardada { algoritmo: "PBKDF2-SHA-256"; iteraciones: number; sal: string; huella: string }`.
  - `BorradorRegistro { email; contrasena; repeticion }` y `CredencialesIngreso { email; contrasena }`, como los arma el formulario.
- `userData` guarda exactamente un `IUser` (`email`, `loggedIn: true`, `role`), sin la contraseña ni su huella, tal como el base.
- Sin identificador numérico: el email normalizado es la identidad (único por la regla de duplicados) y la API no tiene usuarios con los que alinear.
- Las claves `users` y `userData` no llevan el prefijo `libreria.` porque las fija la consigna. Los emails se guardan normalizados (`normalizarEmail`); la contraseña no se recorta (los espacios cuentan).

### D3 — Dónde vive el acceso a `users` y `userData` (regla dura 7)

`src/datos/local/almacen-usuarios.ts`: `crearAlmacenUsuarios(almacenamiento)` recibe el mismo almacenamiento que entrega `obtenerAlmacenamientoDelNavegador()` (ampliado con `removeItem`) y expone `inicializar()`, `obtenerUsuarios()`, `agregarUsuario(usuario)`, `leerSesion(): unknown`, `guardarSesion(IUser)` y `eliminarSesion()`. No nombra `localStorage`.

Se separa de `almacen-local.ts` porque aquel es transitorio (lo reemplaza la API en T-02 y T-05) y los usuarios y la sesión se quedan en el navegador para siempre; mezclarlos obligaría a desarmar el archivo más adelante. Esto exige reformular la regla dura 7 (tarea 3.6): «**NUNCA** nombrar `localStorage` fuera de `src/datos/local/almacen-local.ts` → ese archivo es el único que obtiene el almacenamiento del navegador; los almacenes de `src/datos/local/` (datos de negocio, usuarios y sesión) lo reciben inyectado y son la única vía de lectura y escritura». El sentido de la regla (un único punto de acceso al almacenamiento, almacenes probables con un almacenamiento simulado) se conserva.

Alternativa descartada: sumar usuarios y sesión a `almacen-local.ts` (cumple la letra de la regla sin enmienda, pero acopla datos permanentes a un adaptador que se va a retirar).

Comportamiento ante almacenamiento ausente: a diferencia de libros y clientes, no hay reserva en memoria. En una aplicación multipágina la sesión en memoria se pierde al navegar, así que fingirla engañaría: `agregarUsuario` y `guardarSesion` lanzan `ErrorDeAlmacenamiento` (nuevo, en `src/datos/errores.ts`) y las páginas muestran el mensaje del requisito «Almacenamiento no disponible». `inicializar()` no lanza (la página debe cargar).

Lectura de `users`: clave ausente o contenido ilegible → se usa la lista de la semilla sin escribir; los elementos que no cumplen `esUsuarioRegistrado` se ignoran. Un alta escribe la lista válida más el nuevo usuario (mismo criterio que `agregarLibro`).

### D4 — Semilla del administrador

`inicializar()` escribe `users` con el administrador solo si la clave no existe (misma regla de siembra que el almacén local). Para que la siembra siga siendo síncrona, el administrador se declara en `src/datos/local/usuarios-iniciales.ts` con sal y huella precalculadas; una prueba verifica que la huella corresponde a la contraseña documentada.

Credenciales propuestas: `admin@libreria.test` / `Faro-Admin-2026` (dominio reservado `.test`, como los clientes de ejemplo). Se documentan en el README en una sección «Usuarios de demostración», aclarando que son datos de prueba de una aplicación sin seguridad de servidor; no se muestran en la página de login. No se escriben en Engram (regla dura 18).

### D5 — Lógica pura

- `src/logica/usuarios.ts`: `validarRegistro(borrador, usuarios): ErrorDeCampo[]` (reutiliza `normalizarEmail` y la expresión de email de `clientes.ts`, extraída a una constante compartida en `texto.ts` sin cambiar su regla; contraseña de 8 a 64 caracteres sin reglas de composición, criterio NIST SP 800-63B; repetición idéntica), `validarIngreso(credenciales): ErrorDeCampo[]` (solo campos vacíos) y `buscarPorEmail(usuarios, email)`.
- `src/logica/sesion.ts`: `esRol`, `esSesion(valor: unknown): valor is IUser` (requisito «Lectura validada de la sesión»), `esUsuarioRegistrado`, `aSesion(usuario): IUser`, `destinoPorRol(rol)` (`admin` → `"libros"`, `client` → `"catalogo"`) y `rutaDe(destino, opciones?)`, que arma rutas relativas a una página de `src/pages/<zona>/<vista>/` (todas las páginas están a esa profundidad), por ejemplo `../../auth/login/login.html?cuenta=creada`. T-04 reutiliza `esSesion` y `rutaDe`.

Mensajes (español neutro con el voseo ya usado en la interfaz): ver el spec; se suman «Repetí la contraseña.» (repetición vacía) y «La contraseña es obligatoria.» (registro con contraseña vacía).

### D6 — Servicio de autenticación y raíz de composición

`src/datos/autenticacion.ts` declara `ServicioAutenticacion` y `crearServicioAutenticacion(almacen, contrasenas)`:

- `registrar(borrador): Promise<ErrorDeCampo[]>` — valida, protege la contraseña y agrega `{ email normalizado, role: "client", contrasena, creadoEn }`; devuelve los errores (vacío si se registró).
- `ingresar(credenciales): Promise<IUser | null>` — busca por email normalizado y verifica; si coincide guarda y devuelve la sesión; si no, `null` sin tocar `userData`. Un email inexistente también ejecuta una verificación contra una huella ficticia para que ambos fallos tarden lo mismo (coherencia con el mensaje único; no es una defensa real en el cliente).
- `obtenerSesion(): IUser | null` (lee y valida con `esSesion`) y `cerrarSesion(): void`.

`src/datos/proveedor.ts` crea el almacén de usuarios con `obtenerAlmacenamientoDelNavegador()`, llama a `inicializar()` una vez y exporta `autenticacion`. Las páginas de acceso solo importan `proveedor` (regla dura 4). Alternativa descartada: una interfaz `RepositorioUsuarios` en `repositorios.ts`; ese archivo describe la frontera con la API y los usuarios nunca irán a la API.

### D7 — `src/utils/` y `src/main.ts`

- `src/utils/navigate.ts`: `navegar(ruta)` con `window.location.replace` (después de login, logout y redirecciones no tiene sentido volver atrás a la página anterior).
- `src/utils/auth.ts`: `obtenerSesion()`, `cerrarSesion()` (quita `userData` y navega al login con `rutaDe("login")`, relativa para funcionar bajo subruta, a diferencia de la ruta absoluta del base) e `irAlDestinoDelRol(sesion)`. Es la API que T-04 importa en `src/main.ts`.
- No se crea `src/utils/localStorage.ts`: sus funciones (`saveUser`/`getUSer`/`removeUser`) las cumple `almacen-usuarios.ts` en español y dentro de `src/datos/local/`, y un archivo con ese nombre fuera de `src/datos/local/` contradiría la regla 7. Se aparta así de lo anticipado en T-01 D4.
- Encabezado de las cinco vistas: se agrega `<p class="encabezado__sesion" hidden>` con `<span data-sesion="email">` y `<button type="button" data-accion="cerrar-sesion">Cerrar sesión</button>`. `src/utils/dom.ts` suma `conectarCierreDeSesion(sesion, alCerrar)` (muestra el bloque y el email con `textContent` si hay sesión; si no, lo deja oculto), y `src/main.ts` lo invoca con `obtenerSesion()` y `cerrarSesion`. Así el DOM queda en `src/utils/dom.ts` (regla 6) y `main.ts` solo compone; T-04 agrega antes la intercepción.

### D8 — Páginas de acceso

`src/pages/auth/login/` y `src/pages/auth/registro/` con `<vista>.html` + `<vista>.ts`, misma estructura semántica (encabezado con la marca, `nav` con el enlace a la otra página de acceso, `main` con un único `h1`, pie), mismas hojas `base`, `disposicion` y `componentes`, y las clases de formulario existentes (`formulario--panel`, `campo`, `campo__error`, `mensaje--correcto`/`mensaje--error`). Accesibilidad: `type="email"` con `autocomplete="email"` (`username` en login), `type="password"` con `autocomplete="current-password"` en login y `new-password` en registro, se admite pegar (WCAG 2.2, 3.3.8), ayuda visible del largo mínimo asociada por `aria-describedby`, `aria-invalid` y foco al primer error. Cada página, al cargar, redirige con `irAlDestinoDelRol` si ya hay sesión válida. El login muestra el mensaje de cuenta creada solo si la dirección trae `?cuenta=creada` (sin datos del usuario en la dirección). `vite.config.ts` suma las entradas `login` y `registro`; `index.html` redirige a `src/pages/auth/login/login.html`.

## Risks / Trade-offs

- [Seguridad solo en el cliente: `userData` editable, API abierta] → limitación declarada en el README y en DD-19; la huella evita exponer contraseñas reutilizadas, nada más.
- [`crypto.subtle` ausente fuera de contextos seguros (`http://<IP>`)] → el servicio lanza un error explícito y la página muestra el mensaje de almacenamiento/navegador; el README indica usar `localhost` o HTTPS.
- [Credenciales de demostración públicas en un repositorio público] → son datos de prueba de una simulación; se documentan como tales y nunca se reutilizan en otro sistema.
- [Pérdida del acceso si se borra `users` del navegador] → la siembra recrea al administrador al abrir cualquier página; los usuarios registrados se pierden (esperable en una simulación local).
- [Regla dura 7 reformulada] → la reformulación conserva un único archivo que nombra `localStorage` y se aplica en `CLAUDE.md` y `AGENTS.md` en el mismo commit que crea el almacén.
- [PBKDF2 alarga las pruebas] → 100 000 iteraciones tardan decenas de milisegundos en Node; las pruebas que no verifican el costo inyectan un `Crypto` con iteraciones reducidas por parámetro.
- [Conflictos con T-02 en paralelo] → T-03 no toca `repositorios.ts`, los adaptadores HTTP ni el Catálogo salvo su encabezado; los encabezados de las cinco vistas son la única superficie compartida y el cambio es aditivo.

## Migration Plan

1. Rama `feat/registro-login-y-sesion` desde `feat/migracion-vite-typescript` (el PR #1 no está fusionado); si se fusiona antes de terminar, se rebasa sobre `main`.
2. Línea base (229 pruebas, `tsc`, `build`) → tipos y lógica pura → contraseñas, almacén de usuarios, servicio y proveedor (con la regla 7) → páginas de acceso, entrada y encabezados → documentación y verificación integral, con commits por unidad de trabajo (ver `tasks.md`).
3. Sin migración de datos: las claves nuevas se crean en el primer inicio. Reversión: revertir la rama; las claves `users` y `userData` quedan huérfanas en el navegador sin afectar a la versión anterior.

## Preguntas abiertas (decisiones del usuario)

Las tareas asumen la recomendación de cada una; si el usuario elige otra, cambian los artefactos indicados antes de aplicar.

1. **Contraseña en `users`: huella PBKDF2 con sal o texto plano.** Recomendación: huella PBKDF2 (D1). Cambia lo que el docente ve en `localStorage`. Si se elige texto plano: se reemplaza el requisito «Contraseña nunca guardada en texto plano» por uno que lo declare como limitación y se simplifican las tareas 3.1–3.2.
2. **Credenciales del administrador y dónde se publican.** Recomendación: `admin@libreria.test` / `Faro-Admin-2026`, solo en el README. Alternativa: mostrarlas también en la página de login para el evaluador (más cómodo, peor ejemplo de práctica). Solo cambia datos de la tarea 3.2 y del README.
3. **Campo «Repetir contraseña» en el registro.** Recomendación: incluirlo (sin recuperación de contraseña, un error de tipeo deja la cuenta inutilizable). La consigna menciona solo email y contraseña; si se quita, sale un escenario del spec y cambian las tareas 2.1 y 4.2.
4. **Destino del administrador después del login.** Recomendación: vista Libros (primera vista de la zona `admin` en la navegación). Alternativa: Catálogo para ambos roles. Cambia `destinoPorRol` y un escenario.

## Decisiones del usuario (2026-11-09)

El usuario respondió «si acepto» a la recomendación de cada pregunta abierta; ninguna difiere, así que el spec y las tareas no cambian.

1. Contraseña en `users`: huella PBKDF2-SHA-256 con sal aleatoria por usuario mediante Web Crypto (D1), no texto plano.
2. Credenciales del administrador: `admin@libreria.test` / `Faro-Admin-2026`, documentadas solo en el README para el evaluador y no mostradas en la página de login.
3. El registro conserva el campo «Repetir contraseña».
4. Después del login, el administrador llega a Libros (`src/pages/admin/libros/`) y el cliente al Catálogo.
