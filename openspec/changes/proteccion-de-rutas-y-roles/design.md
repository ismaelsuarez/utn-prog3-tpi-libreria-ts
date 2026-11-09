# Design

## Context

Ver [proposal.md](proposal.md) para la motivación y el alcance, y los specs `proteccion-de-rutas`, `usuarios-y-sesion` y `estructura-y-navegacion` para el comportamiento exigido. Se requiere diseño porque el change es de control de acceso (gobernanza CRÍTICA), cambia el orden de ejecución de las siete páginas y toca la definición de sesión vigente que ya consumen el encabezado y las páginas de acceso.

Estado observado (lectura, sin cambios), sobre la rama `feat/proteccion-de-rutas-y-roles` con T-01, T-02 y T-03 archivados (línea base: `npm test` 465/465):

- `src/main.ts` solo conecta el cierre de sesión: `conectarCierreDeSesion(obtenerSesion(), cerrarSesion)`. Las siete vistas (`src/pages/{auth,client,admin}/<vista>/<vista>.ts`) lo importan en primer lugar (`import "../../../main"`); `index.html` no lo importa (redirige al login con un script clásico).
- `src/logica/sesion.ts` ya ofrece `esSesion`, `aSesion`, `destinoPorRol` (`admin` → `libros`, `client` → `catalogo`) y `rutaDe(destino)`, que arma rutas relativas `../../<zona>/<vista>/<vista>.html` válidas desde cualquier página (todas a la misma profundidad) y bajo subruta. `src/utils/navigate.ts` navega con `location.replace`.
- `autenticacion.obtenerSesion()` valida solo la forma de `userData` (`esSesion`); no consulta `users`. `almacen.obtenerUsuarios()` devuelve los usuarios válidos o la semilla si `users` falta o es ilegible.
- Login y registro comprueban por su cuenta si hay sesión y redirigen con `irAlDestinoDelRol`; su `<main id="contenido-acceso">` nace `hidden`. Las cinco vistas no ocultan nada: el HTML estático (navegación con los cinco enlaces, formularios, tablas) se pinta antes de que corra el módulo.
- `src/styles/base.css` declara `[hidden] { display: none !important; }`, de modo que un `body` con `hidden` no se muestra aunque `body` tenga `display: flex`.
- Vitest corre con `environment: "node"`: el DOM no tiene pruebas automatizadas; se verifica con casos manuales del README.
- Vite 7.3 compila para su objetivo por defecto (Chrome 107, Firefox 104, Safari 16, Edge 107) y `tsconfig.json` usa `target` ES2022 y `module` ESNext: ambos admiten `await` en el nivel superior de un módulo.
- Repositorio base `chiro45/proteger_rutas`: la intercepción vive en `src/main.ts` y confía en `userData.role`. La consigna admite redirigir al cliente «al login o a su zona permitida».

## Goals / Non-Goals

**Goals:**

- Una sola decisión de acceso, pura y probada con Vitest, que consumen la intercepción de carga, la restauración desde la caché de ida y vuelta y la navegación por rol.
- La función de intercepción vive en `src/main.ts`, como pide la consigna, y las vistas no cambian su forma de importarlo.
- Ningún contenido protegido visible y ningún código de vista ejecutado antes de decidir.

**Non-Goals:**

- Protección real: la API de producción no exige autenticación y no se puede modificar; todo lo que decide el navegador se puede alterar desde el navegador (DD-19).
- Reaccionar en vivo al cierre de sesión hecho en otra pestaña (evento `storage`): la decisión se repite al cargar y al restaurar la página, no mientras está abierta.
- Volver a la página pedida después del login, vencimiento de la sesión, mensajes de «sin permiso».
- Los otros dos avisos abiertos de la revisión de T-03 (el registro descarta las entradas ilegibles de `users`; un `iteraciones` adulterado puede congelar el login): la protección de rutas no deriva contraseñas ni escribe `users`, así que no los necesita. Quedan como seguimiento.

## Decisions

### D1 — La zona sale de la dirección

Función pura `zonaDeRuta(ruta: string): Zona | null` en `src/logica/sesion.ts`: toma los tres últimos segmentos de `location.pathname` (`<zona>/<vista>/<archivo>`) y devuelve `"auth"`, `"client"` o `"admin"` si el primero es una zona conocida; si no, `null`. Al mirar solo el final de la ruta funciona igual en `npm run dev` (`/src/pages/admin/libros/libros.html`), en la compilación y bajo cualquier subruta (`/libreria/src/pages/…`). El tipo `Zona` se declara en `src/types/` (regla dura 3).

- Alternativa: atributo `data-zona` en cada HTML. Descartada: duplica en siete archivos lo que la estructura por zonas ya fija (spec «Vistas organizadas por zona», DD-19) y la consigna habla de «carpeta /admin/».
- Alternativa: que cada vista llame `protegerPagina("admin")`. Descartada: obliga a cambiar las siete vistas y saca la intercepción de `src/main.ts`.

### D2 — La sesión se coteja con `users` (cotejo, no confianza ciega en `userData`)

Función pura `sesionVigente(guardada: unknown, usuarios: readonly UsuarioRegistrado[]): IUser | null` en `src/logica/sesion.ts`: exige `esSesion(guardada)` y, además, que `buscarPorEmail(usuarios, guardada.email)` exista con el mismo `role`. `autenticacion.obtenerSesion()` pasa a usarla con `almacen.obtenerUsuarios()`, de modo que la intercepción, el encabezado y las páginas de acceso comparten una sola definición de sesión vigente.

Balance honesto:

- A favor: cierra la falsificación más obvia (editar `role` a `admin` en `userData` desde DevTools, el aviso abierto de la revisión de T-03); una sesión cuyo usuario ya no está en `users` deja de valer; cuesta leer y validar `users` una vez por carga, sin red; es puro y se prueba con Vitest.
- En contra: sigue siendo del cliente. Quien edite `userData` puede editar también el `role` de su entrada en `users` (la forma se valida, la autoría no), y las credenciales de demostración del administrador están publicadas en el README. No es una medida de seguridad; ordena el uso y hace coherente lo guardado.
- Efecto aceptado: si `users` es ilegible, `obtenerUsuarios()` devuelve la semilla y solo la sesión del administrador sembrado sigue valiendo (falla cerrado). La prueba existente de `obtenerSesion` que guarda `userData` de `a@b.test` sin usuario en `users` cambia de resultado por diseño y se actualiza.
- Alternativa: confiar en `userData.role`, como el repositorio base. Más simple y literal, pero deja abierta la falsificación de un solo campo. Descartada por el bajo costo del cotejo.
- Alternativa: firmar `userData` con una clave. Descartada: la clave viviría en el mismo navegador.

### D3 — Decisión de acceso pura

`decidirAcceso(zona: Zona | null, sesion: IUser | null): DecisionDeAcceso`, con `DecisionDeAcceso = { tipo: "permitir" } | { tipo: "redirigir"; destino: DestinoDeRuta }` (tipo en `src/types/`):

| Zona | Sin sesión | `client` | `admin` |
|---|---|---|---|
| `auth` | permitir | redirigir a `catalogo` | redirigir a `libros` |
| `client` | redirigir a `login` | permitir | permitir |
| `admin` | redirigir a `login` | redirigir a `catalogo` | permitir |
| `null` (desconocida) | redirigir a `login` | redirigir al destino del rol | redirigir al destino del rol |

Los destinos con sesión salen de `destinoPorRol`. La zona desconocida falla cerrado; no puede producir un bucle porque el login vive bajo `/auth/login/` (spec «Vistas organizadas por zona») y una prueba fija que `zonaDeRuta` de la ruta del login es `auth`.

### D4 — Destino del `client` que entra a `admin`: el Catálogo

Se redirige al destino de su rol (`destinoPorRol("client")` → Catálogo), no al login: el cliente ya tiene sesión, y mandarlo al login produciría dos saltos (login → Catálogo, porque el login redirige con sesión) o, peor, sugeriría que su sesión se perdió. La consigna admite «al login o a su zona permitida»; es el mismo destino que recibe al iniciar sesión. Sin mensaje de «sin permiso» (no se pidió; supuesto registrado).

### D5 — La intercepción en `src/main.ts` corta la ejecución de la vista

`src/main.ts` define `interceptarCargaDePagina()` (la función que pide la consigna): lee la zona de `location.pathname`, la sesión con `obtenerSesion()`, llama a `decidirAcceso` y, si la decisión es redirigir, navega con `navegar(rutaDe(destino))` (`location.replace`: la página denegada no queda en el historial). Si redirige, `main.ts` espera en el nivel superior una promesa que nunca se cumple (`await new Promise<never>(() => {})`): como cada vista importa `main` en primer lugar, el módulo de la vista no llega a evaluarse, no lee repositorios, no pide `/api` y no conecta controles, mientras el navegador ya está cambiando de página. Si permite, ajusta la navegación (D7), conecta el cierre de sesión como hoy y muestra la página.

- Alternativa: exportar un indicador `accesoPermitido` que cada vista consulte. Descartada: siete cambios y una vista futura que lo olvide corre sin protección.
- Alternativa: lanzar un error en `main.ts` para abortar el grafo de módulos. Descartada: deja un error sin controlar en la consola en cada redirección.
- Alternativa: que `main.ts` importe dinámicamente la vista. Descartada: invierte la estructura de los siete HTML.
- Con la decisión en `main.ts`, login y registro dejan de comprobar la sesión por su cuenta (ese código ya no se alcanza); conservan `irAlDestinoDelRol` después de un ingreso correcto.

### D6 — Sin parpadeo: `<body hidden>` hasta permitir

Los siete HTML de `src/pages/` declaran `<body hidden>`. El atributo lo oculta la hoja del propio navegador antes de cargar CSS y `base.css` lo refuerza con `!important`. `interceptarCargaDePagina()` quita `hidden` solo después de permitir, ajustar la navegación y conectar el cierre de sesión. El DOM se toca con funciones nuevas de `src/utils/dom.ts` (`mostrarPagina`, `ocultarPagina`, `ajustarNavegacion`), nunca en `src/logica/` (regla dura 6). Login y registro conservan su `contenido-acceso` oculto (redundante, sin costo).

- Alternativa: ocultar solo `<main>`. Descartada: la navegación con enlaces de gestión se vería un instante para un `client`.
- Alternativa: clase en `<html>` con una regla CSS. Descartada: depende de que la hoja cargue antes de pintar; el atributo `hidden` no.
- Riesgo aceptado: si el módulo falla antes de decidir, la página queda en blanco (falla cerrado).

### D7 — Navegación según el rol con la misma decisión

`ajustarNavegacion(puedeAbrir)` recorre los `a.navegacion__enlace` del encabezado y quita del DOM el `<li>` de cada enlace cuya dirección resuelta (`new URL(enlace.href).pathname`) da una zona que `decidirAcceso(zona, sesion)` no permite. Así el `client` ve solo Catálogo y el `admin` los cinco, sin duplicar en el HTML qué rol ve qué. Se quitan del DOM (no `hidden`) para que tampoco los anuncien las tecnologías de asistencia.

### D8 — Recarga y caché de ida y vuelta

- Recarga: el módulo se vuelve a evaluar y la decisión se repite (D5).
- `pagehide`: la página se oculta (`ocultarPagina()`) antes de entrar a la caché, para que la copia restaurada no muestre contenido antes de volver a decidir.
- `pageshow` con `persisted`: se repite la decisión con la sesión vigente. Si redirige, navega al destino (la página sigue oculta). Si permite y la sesión es la misma de la carga (email y rol), se muestra. Si permite pero la sesión cambió (otro usuario o rol), se recarga la página para rehacer el encabezado y la navegación.
- Caso pedido: Libros → Ventas → «Cerrar sesión» (`replace` por el login) → Atrás restaura Libros desde la caché → `pageshow` sin sesión → login.

### D9 — Subruta

Las redirecciones usan `rutaDe`, relativa a la página actual, y `navegar`; no hay rutas absolutas. `zonaDeRuta` ignora el prefijo de la subruta. `vite.config.ts` no cambia.

## Risks / Trade-offs

- [Protección solo del cliente] → documentada en el README y en DD-19 y DD-25; la API sigue abierta.
- [El cotejo de D2 cambia la sesión que ven el encabezado y las páginas de acceso, código compartido] → mismo contrato (`IUser | null`); las pruebas de `autenticacion` fijan el comportamiento nuevo y CM-10 y CM-11 se repiten.
- [`await` en el nivel superior no admitido por un navegador viejo] → fuera del objetivo de Vite 7; si el objetivo no lo admitiera, `npm run build` falla en lugar de compilar algo sin protección.
- [Página en blanco ante un error previo a la decisión] → falla cerrado; los casos manuales revisan la consola.
- [Servidor que reescriba las direcciones sin `/<zona>/<vista>/`] → la zona desconocida redirige al login; la estructura de `dist/` la fija la compilación.
- [Otra pestaña cierra la sesión] → la página abierta sigue visible hasta recargar o volver con el historial (no-objetivo).

## Migration Plan

1. Rama `feat/proteccion-de-rutas-y-roles` (ya creada). Línea base: `npm test` 465/465, `npx tsc --noEmit`, `npm run build`.
2. Unidades de trabajo con commit propio (ver `tasks.md`): lógica pura y cotejo de la sesión → intercepción, páginas y navegación → documentación → verificación integral.
3. Sin migración de datos: no cambian las claves ni su forma. Reversión: revertir la rama; las páginas vuelven a abrirse sin sesión.

## Puntos para la aprobación del usuario

Gobernanza CRÍTICA: las tareas asumen estas recomendaciones; si el usuario elige otra, cambian los artefactos indicados antes de aplicar.

1. **Cotejo de `userData` con `users` (D2).** Recomendación: cotejar. Si se elige confiar en `userData`, salen los escenarios «Rol editado a mano» y «Email que no está registrado» de `usuarios-y-sesion` y la tarea 2.2.
2. **Destino del `client` en una página `admin` (D4).** Recomendación: Catálogo, sin mensaje. Si se elige el login, cambian D3, un escenario de `proteccion-de-rutas` y la tarea 2.3.
