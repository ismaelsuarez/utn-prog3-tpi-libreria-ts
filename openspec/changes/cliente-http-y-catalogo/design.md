# Design

## Context

Ver [proposal.md](proposal.md) para la motivación y el alcance. Se requiere diseño porque el change agrega la primera dependencia de red real, fija el formato de errores y de paginación que reutilizará `operaciones-contra-api`, y obliga a decidir cómo conviven dos orígenes de datos hasta ese change.

Evidencia de la exploración (lectura, sin cambios):

- Frontera vigente (change `migracion-vite-typescript`, D5, D6, D10 y D12): `src/datos/repositorios.ts` declara `RepositorioLibros.listar(filtro?: FiltroLibros): Promise<LibroDetalle[]>`, `obtener` y `crear`; `src/datos/proveedor.ts` crea todos los repositorios sobre el almacén local y los exporta (`repositorioLibros`, `repositorioEditoriales`…); `src/datos/api/base.ts` ofrece `obtenerBaseApi(valor)`; `src/types/api.ts` declara `ErrorApi`, `ErrorValidacion`, `Paginacion` y `FiltroLibros`; `src/datos/errores.ts` declara `ErrorDeRepositorio(mensaje, errores: ErrorDeCampo[])`. `vite.config.ts` reenvía la base a `API_PROXY_TARGET` en `server.proxy` y `preview.proxy`.
- Consumidores: `repositorioLibros.listar` lo usan Catálogo, Libros (listado) y Ventas (selector y confirmación); `repositorioEditoriales` y `repositorioGeneros` solo el formulario de Libros. El adaptador local valida el alta de un libro contra las editoriales, géneros y autores de los datos iniciales, y la venta local resuelve libros por su identificador local.
- Vista Catálogo (`src/pages/client/catalogo/catalogo.ts`): `await repositorioLibros.listar()`, filtro local `filtrarPorTitulo` (normaliza con `trim().toLowerCase()`), tarjetas por `<template>` con `textContent`; `arrancar` muestra «No se pudieron cargar los datos. …» en `#catalogo-error` (`role="alert"`). No hay estado de carga. Portadas (`portadas.ts`) y sinopsis (`ficha-libro.ts`) se buscan por el título de los seis libros de ejemplo; si no hay portada se ve la cubierta textual de respaldo.
- API de producción (OpenAPI en vivo y código del despliegue, solo lectura): sin autenticación; `GET /libros/` acepta `limit` (1–100, por defecto 20), `offset`, `titulo` (`ILIKE '%…%'`, sin escapar `%` ni `_`, sensible a acentos) y `genero_id`, ordena por `id` y no trae autores; `GET /libros/{id}` trae `autores[{autor_id, nombre, rol, orden}]`; `GET /editoriales/` y `GET /generos/` paginan igual; 404 con `{"detail": "Libro no encontrado"}`; 422 con `{"detail": [{type, loc, msg, input, ctx}]}`; colecciones con barra final (`/libros/`). Datos actuales: 5 libros, 3 editoriales, 3 géneros («Policial», «Novela», «Cuento»).
- Línea base de la rama `feat/migracion-vite-typescript`: `npm test` 229/229, `tsc` y `npm run build` sin errores.

## Goals / Non-Goals

**Goals:**

- Un cliente HTTP de solo lectura, probado sin red, cuyo manejo de errores, tiempo límite y paginación reutilice `operaciones-contra-api` sin rediseñar.
- El Catálogo leyendo de la API con estados de carga y error honestos, sin cambiar el resto de su comportamiento visible.
- Cada vista con un único origen de datos coherente durante la transición.

**Non-Goals:**

- Escrituras contra la API, conexión de las vistas de gestión a la API, listados sin endpoint (clientes, autores).
- Búsqueda en el servidor, filtro por género, caché entre páginas, reintentos automáticos, botón de reintento.
- Portadas o sinopsis para los libros de producción (la API no tiene esos datos).

## Decisions

### D1 — Cliente HTTP mínimo con `fetch` inyectable

`src/datos/api/cliente-http.ts` exporta `crearClienteHttp({ base, solicitar?, tiempoLimiteMs? })`, que devuelve un objeto con una sola operación, `obtener(ruta, parametros?): Promise<unknown>`:

- Dirección: `base + ruta`, con la ruta tal como la publica la API (colecciones con barra final, `/libros/`), para evitar la redirección 307 de FastAPI, que apuntaría a otro origen. Los parámetros se codifican con `URLSearchParams`, omitiendo los `undefined`.
- Método `GET` y cabecera `Accept: application/json`. El cliente no ofrece otros métodos: la garantía «sin escrituras» se comprueba por construcción y por prueba.
- `solicitar` por defecto es `(url, init) => globalThis.fetch(url, init)`: se resuelve en cada llamada y no se guarda `fetch` suelto, porque invocarlo desligado de `window` lanza «Illegal invocation» en Chrome. Las pruebas inyectan un doble.
- Tiempo límite: `AbortController` más `setTimeout` de 10 000 ms, que se limpia en `finally`; una bandera distingue la cancelación por tiempo de otras.
- Respuesta correcta: se exige `content-type` con `application/json` y un cuerpo que se pueda interpretar; si no, error de formato. Devuelve `unknown`: el cliente no afirma tipos.

Los adaptadores (D4) estrechan el `unknown`: comprueban que un listado sea un arreglo (si no, error de formato) y asignan el tipo de dominio. Es la única frontera de confianza: la forma de cada elemento la garantizan los fixtures reales con `satisfies` (change anterior, D5), sin validar campo por campo en tiempo de ejecución.

Alternativas descartadas: validar cada DTO en tiempo de ejecución (mucho código sin librerías y sin beneficio para un contrato ya fijado por fixtures); un cliente con `post`/`patch` desde ya (abriría la puerta a escrituras antes de `operaciones-contra-api`); `AbortSignal.timeout` (más difícil de controlar con temporizadores simulados en las pruebas).

### D2 — Errores: `ErrorDeApi` con mensaje en texto

`src/datos/api/errores-api.ts`:

- `ErrorDeApi extends ErrorDeRepositorio`, con `tipo: "http" | "red" | "tiempo" | "formato"` y `estado: number | null`. Al extender `ErrorDeRepositorio`, las vistas (y `textoDeError`) lo tratan igual que hoy, y `errores: ErrorDeCampo[]` queda lista para los formularios de `operaciones-contra-api`.
- Función pura `interpretarCuerpoDeError(estado, cuerpo: unknown)` → `{ mensaje, errores }`: `detail` de texto → ese texto; `detail` arreglo de objetos con `msg` de texto → mensajes unidos con «; » y un `ErrorDeCampo` por elemento (`campo` = último elemento de `loc` como texto); cualquier otra forma o cuerpo ausente → «El servidor respondió con un error (estado).».
- Textos fijos: «No se pudo conectar con el servidor.», «El servidor tardó demasiado en responder.», «La respuesta del servidor no tiene el formato esperado.».

Alternativa descartada: mostrar `statusText` o el cuerpo crudo (texto en inglés o HTML del proxy ante el operador).

### D3 — Paginación completa y concurrencia acotada

- `src/datos/api/paginacion.ts`: `recorrerPaginas(pedirPagina, tamanio = 100)` pide `offset` 0, 100, 200… y se detiene con la primera página de menos de `tamanio` elementos (si el total es múltiplo de 100, la última página llega vacía). Tope de 100 páginas: si se alcanza, error de formato (protege de un servidor que ignore `offset`).
- Mismo módulo: `mapearConLimite(elementos, limite, funcion)` ejecuta a lo sumo `limite` promesas a la vez y devuelve los resultados en el orden de entrada; ante el primer rechazo, rechaza con ese error (no inicia elementos nuevos).

### D4 — Adaptadores HTTP de lectura

`src/datos/api/repositorios-api.ts` exporta `crearRepositoriosApi(cliente)` → `{ libros, editoriales, generos }`:

- `libros.listar(filtro?)`: si `filtro` trae `limit` u `offset`, pide solo esa página; si no, recorre todas las páginas. Pasa `titulo` y `genero_id` cuando existen. Luego completa cada libro con `obtener(id)` mediante `mapearConLimite(…, 4, …)` y entrega el detalle recibido (que ya trae todos los campos del libro).
- `libros.obtener(id)`: `GET /libros/{id}`.
- `editoriales.listar()` y `generos.listar()`: recorren `GET /editoriales/` y `GET /generos/`.
- No hay `crear`: el tipo del repositorio de libros sobre la API es `RepositorioLecturaLibros` (D5).

### D5 — Interfaz de lectura de libros

`src/datos/repositorios.ts` separa `RepositorioLecturaLibros { listar; obtener }` y declara `RepositorioLibros extends RepositorioLecturaLibros { crear }`. El adaptador local cumple ambas sin cambios; el adaptador HTTP de este change cumple solo la de lectura, y `operaciones-contra-api` le agrega `crear`. Así el compilador impide que el Catálogo (o cualquier vista que reciba la lectura) escriba.

### D6 — Composición: Catálogo sobre la API, gestión sobre el almacén local

`proveedor.ts` agrega `repositorioCatalogo: RepositorioLecturaLibros`, creado con `crearRepositoriosApi(crearClienteHttp({ base: obtenerBaseApi(import.meta.env.VITE_API_BASE) })).libros`. Las demás exportaciones siguen siendo las locales. La creación no hace solicitudes: la red se usa recién al llamar `listar`. La vista Catálogo cambia una importación (`repositorioLibros` → `repositorioCatalogo`); ninguna vista de gestión cambia.

Los adaptadores de editoriales y géneros no se exportan todavía desde `proveedor.ts`: su único consumidor es el formulario de Libros, cuyo alta local valida contra editoriales y géneros locales (el identificador 1 es «Ediciones del Puerto» en local y «Emecé» en la API). Se conectan en `operaciones-contra-api`, junto con el alta de libros sobre la API.

Alternativas consideradas:

- Cambiar todos los repositorios de lectura juntos: Ventas mostraría libros de la API y confirmaría la venta contra libros locales con los mismos números de identificador (venta incoherente); Libros mostraría libros de la API y el alta local nunca aparecería. Descartada.
- Repositorio de libros mixto (lectura HTTP, alta local): mismos problemas en Libros y Ventas. Descartada.
- Decidir el origen por la zona de la dirección (`/client/`) dentro de `proveedor.ts`: oculta la regla y no se puede probar sin navegador. Descartada.
- Construir y probar todo pero dejar `proveedor.ts` local hasta `operaciones-contra-api`: sin divergencia, pero el Catálogo no lee la API en esta entrega. Queda como alternativa en «Preguntas abiertas» de la propuesta.

Consecuencia aceptada (specs `libros` y `datos-locales`): un alta local no aparece en el Catálogo hasta `operaciones-contra-api`; se documenta en el README y en los casos manuales, sin interfaz nueva.

### D7 — Autores: detalle por libro con concurrencia 4

La tarjeta muestra autores (spec `catalogo`) y `GET /libros/` no los trae. Se completa cada libro con `GET /libros/{id}`: `1 + n` solicitudes para `n ≤ 100` (hoy 6), en `⌈n/4⌉` tandas aproximadas. Si un detalle falla, el listado completo se rechaza y el Catálogo muestra el error: un catálogo con autores faltantes sería engañoso y degradar tarjeta por tarjeta exigiría cambiar el tipo `LibroDetalle`.

Alternativas: `GET /autores/{id}/libros` (requiere conocer los autores; no hay `GET /autores/`); cargar los autores al abrir la ficha (la tarjeta perdería los autores: cambia la spec `catalogo`); quitar los autores de la tarjeta (ídem). Ambas quedan como alternativa en la propuesta.

### D8 — Filtro por título en el cliente

El filtro sigue siendo `filtrarPorTitulo` sobre la lista ya cargada: conserva la regla de la spec (sin distinguir mayúsculas, coincidencia parcial, sin espacios de los extremos), responde en cada tecla sin red y sin repetir las `1 + n` solicitudes. El parámetro `titulo` del servidor (que interpreta `%` y `_` como comodines) queda soportado por el adaptador, sin uso en las vistas.

### D9 — Vista Catálogo: estados de carga y error

- `catalogo.html`: `<p id="catalogo-cargando" class="mensaje" role="status">Cargando libros…</p>` visible al cargar, y `#lista-catalogo` con `hidden` inicial, de modo que antes de los datos no se ve el listado vacío ni el mensaje de lista vacía.
- `catalogo.ts`: pide los libros con `repositorioCatalogo.listar()` dentro de `try … finally` que oculta el mensaje de carga; el error sigue su camino hasta `arrancar`, que ya lo muestra en `#catalogo-error` como texto. Los eventos del buscador se conectan después de cargar.
- Portadas y sinopsis: sin cambios. Los libros de producción no tienen portada ni sinopsis de muestra, así que muestran la cubierta textual de respaldo y «Este libro todavía no tiene una sinopsis cargada.». Los géneros «Policial» y «Cuento» reciben el estilo de «sin clasificar» de `claseDeGenero` (solo color e ícono; el texto del género es el correcto).

### D10 — Pruebas sin red

Vitest en entorno `node` (que ofrece `Response`, `Headers` y `AbortController`). El doble de `solicitar` es un `vi.fn` que devuelve `new Response(JSON.stringify(cuerpo), { status, headers })` o rechaza; el tiempo límite se prueba con temporizadores simulados y un doble que rechaza cuando su `signal` se cancela. Los listados reutilizan `tests/fixtures/api/libros.ts` y `catalogos.ts`. La prueba de `proveedor` reemplaza `fetch` global con `vi.stubGlobal` y comprueba que importar el módulo no hace solicitudes y que el Catálogo pide `/api/libros/…`. Pruebas nuevas en `tests/datos/api/`. El DOM sigue cubierto por casos manuales. Verificación de humo opcional y solo `GET`: con `npm run dev`, `curl -s "http://localhost:5173/api/libros/?limit=5"`.

## Risks / Trade-offs

- [Divergencia visible entre Catálogo y gestión hasta `operaciones-contra-api`] → specs `libros` y `datos-locales` la declaran; README y casos manuales la registran; se cierra en `operaciones-contra-api`.
- [`1 + n` solicitudes por apertura del Catálogo] → concurrencia 4 y tiempo límite; aceptable para el tamaño actual (5 libros); si el catálogo crece, la alternativa es la carga de autores en la ficha.
- [La API caída deja el Catálogo sin libros] → mensaje de error en texto; no hay respaldo local, a propósito, para no mostrar datos de otro origen.
- [Servir `dist/` sin el reenvío de `/api`] → el servidor devuelve HTML o 404 y el Catálogo informa «La respuesta del servidor no tiene el formato esperado.» o el error HTTP; el reenvío de producción es del change `despliegue-frontend`.
- [Los datos de producción pueden cambiar] → los casos manuales registran los valores observados al ejecutarlos; las pruebas automatizadas no dependen de datos vivos.
- [Confianza en la forma de cada DTO] → fixtures reales con `satisfies`; los listados se comprueban como arreglos.
- [Seguridad] Sin escrituras, sin credenciales, sin direcciones de la API en el código del navegador; datos insertados con `textContent`.

## Migration Plan

1. Rama `feat/cliente-http-y-catalogo` desde `feat/migracion-vite-typescript` (el PR #1 todavía no está fusionado); línea base registrada.
2. Errores y cliente HTTP → paginación, concurrencia y adaptadores → composición y vista Catálogo → documentación, con commits por unidad de trabajo (ver `tasks.md`).
3. Sin migración de datos: `localStorage` no cambia. Reversión: volver `repositorioCatalogo` al repositorio local en `proveedor.ts` (o revertir la rama) devuelve el Catálogo a los datos locales.

## Open Questions

- Las decisiones que cambian specs (transición de orígenes, autores en la tarjeta, aviso visible) están en «Preguntas abiertas» de la propuesta; este diseño adopta las recomendaciones y se ajusta si el usuario elige otra opción.
