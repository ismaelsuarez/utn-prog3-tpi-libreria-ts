# Design

## Context

Ver [proposal.md](proposal.md) para la motivación y el alcance. Se requiere diseño porque el change cambia la cadena de herramientas, la estructura de carpetas, el sistema de módulos, la forma de los datos que reciben las vistas y el runner de pruebas, y porque fija contratos (repositorios, base `/api`, zonas) que los cinco changes siguientes dan por hechos.

Evidencia de la exploración (lectura, sin cambios):

- Cinco páginas en la raíz (`index.html` = Catálogo, `libros.html`, `clientes.html`, `ventas.html`, `historial.html`) cargan scripts clásicos con `defer` en orden de dependencia: `js/datos/datos-iniciales.js` → `js/logica/*.js` → `js/almacen.js` → `js/interfaz.js` → `js/paginas/*.js`. Todo se comparte por el global `window.Libreria` con exportación dual (`module.exports`) para Node. Siete hojas en `css/` (las tres de la spec `presentacion` más `vista-inmersiva`, `ficha-libros`, `ticket-venta`, `clientes-contacto`).
- `js/almacen.js` concentra `localStorage` (claves `libreria.libros`, `libreria.clientes`, `libreria.ventas`), siembra con `inicializar()` (llamada por cada página), usa una reserva `memoria` de nivel de módulo y expone además `actualizarCliente` (edición de nombre, email y teléfono). Los registros locales usan identificadores de texto (`lib-01`), `precio` numérico, `editorialId`/`generoId`/`autorIds`, `nombreCompleto` y `telefono`; la venta guarda una instantánea con `libroId`, `precioUnitario`, `subtotal` y `total` numéricos.
- `js/paginas/ficha-libros.js` arma rutas de portadas en tiempo de ejecución (`"img/Portadas/" + nombre`) y vuelve a leer `Libreria.almacen`; `index.html` conserva siete `img/portadas/*.jpg` inexistentes en el marcado de maqueta, con portada de respaldo textual. `css/vista-inmersiva.css` usa `url('../img/estanteria.webp')`.
- Línea base de pruebas (Node 24.21, `node --test tests/*.test.js`): **153 pruebas, 138 aprobadas, 15 fallidas**. Las 15 fallas están todas en `tests/clientes.test.js`: `validarCliente` exige `telefono` desde el commit «nueva funcion_clientes», el README lo documenta como campo obligatorio (commit `6983cc6`) y los fixtures de esas pruebas no lo incluyen (esperan 1 error y reciben 2). `tests/almacen.test.js` aísla el estado `memoria` con `vm.runInNewContext`.
- Repositorio base `chiro45/proteger_rutas` (leído por la API de GitHub): `package.json` con `vite ^7.1.2`, `typescript ~5.8.3`, `@types/node`; `tsconfig.json` con `target` ES2022, `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleDetection: "force"`, `noEmit`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `include: ["src"]`; `vite.config.ts` con `rollupOptions.input` por página y `base: "./"`; `index.html` raíz que redirige con `window.location.href`; `src/types/IUser.ts` (`email`, `loggedIn`, `role: Rol`), `src/types/Rol.ts`, `src/utils/{auth,localStorage,navigate}.ts`, `src/main.ts` vacío.
- API de producción (OpenAPI en vivo, solo lectura): sin autenticación ni prefijo; IDs enteros; importes como texto (`"25000.00"`); fechas ISO con `Z`; listas como arreglos con `limit` (1–100) y `offset` sin total; `LibroRead` no incluye autores (solo `LibroDetalleRead`); no hay `GET /clientes/`, `GET /autores/` ni actualización de perfil; sin cabeceras CORS.

## Goals / Non-Goals

**Goals:**

- Dejar la aplicación funcionando de punta a punta con `npm run dev` y con la compilación servida, con el mismo comportamiento visible que hoy en las cinco vistas.
- Fijar los contratos que los changes siguientes reutilizan sin rediseñar: zonas y rutas, tipos de dominio, interfaces de repositorio, entrada común `src/main.ts`, base `/api`.
- Mantener verdes todos los casos aplicables de la suite actual, ya en TypeScript.

**Non-Goals:**

- Llamar a la API para leer o escribir datos de negocio (salvo los GET de verificación del proxy), crear el cliente HTTP, el login, el registro, la sesión o la protección de rutas.
- Agregar funciones de negocio sobre `localStorage`, cambiar su formato o migrar datos guardados.
- Agregar campos de formulario que la API exigirá (stock, rol de autoría, perfil con dirección) o pruebas de DOM automatizadas.
- Resolver los listados de clientes y autores ni la edición del teléfono que la API no ofrece (se marcan para `operaciones-contra-api`).

## Decisions

### D1 — Herramientas, versiones y gestor de paquetes

`npm` como gestor (con `package-lock.json` versionado), por ser el que trae Node y el que asume la consigna; el repositorio base trae dos lockfiles y se elige uno solo. Dependencias de desarrollo: `vite` `^7.1.2`, `typescript` `~5.8.3`, `@types/node` y `vitest` en la mayor versión cuya dependencia par acepte Vite 7 (comprobada con `npm view vitest@<versión> peerDependencies` al instalar y registrada en la tarea). Ninguna dependencia de ejecución: el navegador recibe solo código propio, de modo que la regla «sin librerías ni CDNs» sigue valiendo para lo que se entrega.

Scripts: `dev` = `vite`, `build` = `tsc && vite build`, `preview` = `vite preview`, `test` = `vitest run`. Requisito de entorno: la versión de Node que exige Vite 7 (20.19+ o 22.12+), documentada en el README y en `package.json` (`engines`).

Alternativas descartadas: pnpm (otro instalador para el equipo sin beneficio para el TPI); TypeScript 5.9+ (el base fija `~5.8.3` y `erasableSyntaxOnly` ya está disponible).

### D2 — `tsconfig.json` del base, más las pruebas

Se copia la configuración del repositorio base sin relajar ninguna opción. Única diferencia: `include: ["src", "tests"]`, para que `tsc` (y por lo tanto `npm run build`) compruebe también las pruebas con la misma rigurosidad. Consecuencias de las opciones del base que el código debe respetar: `erasableSyntaxOnly` prohíbe `enum`, `namespace` y propiedades de parámetro → se usan uniones de literales (`type Rol = "client" | "admin"`); `verbatimModuleSyntax` obliga a `import type` para tipos; las importaciones relativas van sin extensión, como en el base. `src/vite-env.d.ts` declara `/// <reference types="vite/client" />` y `ImportMetaEnv` con `VITE_API_BASE`.

Alternativa descartada: pruebas dentro de `src/` junto a cada módulo (respetaría `include: ["src"]` literal, pero mezclaría pruebas con el código que se entrega y rompería la convención del proyecto de `tests/` separado).

### D3 — Ubicación de las vistas por zona

| Vista actual | Ubicación nueva | Zona y motivo |
|---|---|---|
| `index.html` (Catálogo) | `src/pages/client/catalogo/catalogo.html` + `catalogo.ts` | `client`: lectura con filtro, la única vista del rol `client`; el rol `admin` también la alcanza (lo permitirá la guarda del change 4) |
| `libros.html` | `src/pages/admin/libros/libros.html` + `libros.ts` | `admin`: escribe el catálogo |
| `clientes.html` | `src/pages/admin/clientes/clientes.html` + `clientes.ts` | `admin` |
| `ventas.html` | `src/pages/admin/ventas/ventas.html` + `ventas.ts` (+ `ticket-venta.ts`) | `admin` |
| `historial.html` | `src/pages/admin/historial/historial.html` + `historial.ts` | `admin` |
| — | `src/pages/auth/` | Reservada: `login` y `registro` la crean en el change 3 (git no versiona carpetas vacías) |

Así ninguna vista se vuelve a mover: la guarda del change 4 decide solo por el segmento `/admin/` o `/client/` de la URL, que es exactamente lo que pide la consigna («Si un usuario con rol client intenta entrar a una carpeta /admin/…»). Se usa `catalogo` en lugar de `home` del base porque el nombre de la vista es parte de la navegación existente.

`index.html` raíz: solo una redirección relativa al Catálogo (`location.replace("src/pages/client/catalogo/catalogo.html")`, relativa para que funcione bajo subruta con `base: "./"`); el change 3 cambia el destino al login. La navegación de las cinco vistas se conserva en el mismo orden con rutas relativas entre zonas (por ejemplo `../../admin/libros/libros.html`), que Vite respeta en desarrollo y en la compilación. `vite.config.ts` declara una entrada de `rollupOptions.input` por cada HTML; se agregan a medida que cada vista se migra.

Alternativa descartada: una zona `shared/` para el Catálogo; el base y la consigna solo conocen `auth`, `admin` y `client`, y una zona extra obligaría a la guarda a una regla especial.

### D4 — De scripts clásicos a módulos ES

Cada HTML carga un único `<script type="module" src="./<vista>.ts">`. Cada módulo de vista importa primero `../../../main` (entrada común) y luego sus dependencias con `import`. Desaparecen el global `Libreria`, la función envolvente y la exportación dual: cada archivo es su propio ámbito y exporta funciones con nombre.

`src/main.ts` queda como punto de entrada común sin lógica de negocio en este change (en el base también está vacío); su existencia y su importación en primer lugar desde todas las vistas es el contrato que el change 4 usa para interceptar cada carga de página («En src/main.ts, crear una función que intercepte la carga de la página»), de modo que la intercepción corre también al recargar.

Módulos de apoyo de interfaz que hoy leen globales (`ficha-libros.js` lee `Libreria.almacen`; `ticket-venta.js` expone `Libreria.comprobante`) pasan a ser módulos importados por su vista que reciben los datos ya cargados como parámetros; ningún módulo de interfaz llama a un repositorio, solo el módulo de la vista.

Utilidades de DOM comunes (`mostrarMensaje`, `ocultarMensaje`, `vaciarNodo`) → `src/utils/dom.ts`; `formatearImporte` pasa a la lógica pura (`src/logica/dinero.ts`) porque ahora recibe texto decimal y merece pruebas. `src/utils/` queda como en el base para utilidades de navegador; `navigate.ts`, `auth.ts` y `localStorage.ts` de sesión los crea el change 3 cuando tengan uso.

### D5 — Tipos de dominio alineados con la API

`src/types/` declara un archivo por agregado, con los nombres en español del proyecto y las propiedades exactamente como la API (incluido `snake_case` en `editorial_id`, `libro_id`, `precio_unitario`, `cliente_id`, `autor_id`), para que el cliente HTTP del change 2 tipe el JSON sin capa de traducción:

- Primitivos: `Id = number`, `Dinero = string` (texto decimal con dos decimales), `FechaIso = string`.
- `Editorial`/`EditorialRef`/`EditorialNueva`/`EditorialCambios`, `Genero`/`GeneroRef`/`GeneroNuevo`, `Autor`/`AutorNuevo`/`AutorCambios`, `RolAutoria` (`"autor" | "coautor" | "traductor" | "ilustrador"`), `Autoria`, `AutorConRol`.
- `Libro` (`LibroRead`), `LibroDetalle` (`Libro` + `autores: AutorConRol[]`), `LibroNuevo` (`LibroCreate`: `stock` y `editorial_id` obligatorios, `precio: Dinero | number`), `LibroCambios`, `LibroConRol`.
- `Cliente` (`perfil: Perfil | null`), `ClienteRef`, `ClienteNuevo`, `ClienteCambios`, `Perfil`, `PerfilNuevo`.
- `Venta`, `Renglon`, `VentaNueva`, `RenglonNuevo`.
- `ErrorApi` (`{ detail: string } | { detail: ErrorValidacion[] }`) y `ErrorValidacion` (`type`, `loc`, `msg`, `input?`, `ctx?`), `Paginacion` (`limit?`, `offset?`) y `FiltroLibros` (`titulo?`, `genero_id?`).
- `IUser` y `Rol` copiados del base sin cambios; el change 3 decide cómo se suma la contraseña al arreglo `"users"`.
- `ErrorDeCampo` (`{ campo, mensaje }`) para las validaciones del formulario.

Comprobación de alineación sin escribir en la API: fixtures en `tests/fixtures/api/` copiados de respuestas reales de `GET` (`/libros/?limit=2`, `/libros/{id}`, `/editoriales/`, `/generos/`, `/ventas/?limit=1`) y declarados con `satisfies <Tipo>`, de modo que `tsc` falla si un tipo no coincide con lo que la API devuelve.

### D6 — Frontera de repositorios

`src/datos/repositorios.ts` declara las interfaces; todas las operaciones devuelven `Promise`, porque la implementación HTTP lo será y así las vistas ya quedan escritas con `await`:

| Interfaz | Operaciones | Equivalente en la API |
|---|---|---|
| `RepositorioLibros` | `listar(filtro?: FiltroLibros): Promise<LibroDetalle[]>`, `obtener(id)`, `crear(LibroNuevo): Promise<LibroDetalle>` | `GET /libros/` (+ detalle), `GET /libros/{id}`, `POST /libros/` |
| `RepositorioEditoriales` | `listar(): Promise<Editorial[]>` | `GET /editoriales/` |
| `RepositorioGeneros` | `listar(): Promise<Genero[]>` | `GET /generos/` |
| `RepositorioAutores` | `listar(): Promise<Autor[]>` | **sin endpoint** |
| `RepositorioClientes` | `listar()` **sin endpoint**, `obtener(id)`, `crear(ClienteNuevo)`, `crearPerfil(id, PerfilNuevo)`, `actualizar(id, ClienteCambios)`, `actualizarTelefono(id, telefono)` **sin endpoint** | `GET/POST/PATCH /clientes/…`, `POST /clientes/{id}/perfil` |
| `RepositorioVentas` | `listar(): Promise<Venta[]>`, `crear(VentaNueva): Promise<Venta>` | `GET /ventas/`, `POST /ventas/` |

`listar` de libros devuelve `LibroDetalle[]` porque la tarjeta del Catálogo exige autores y `LibroRead` no los trae; cómo los obtiene el adaptador HTTP (detalle por libro, paginación) es decisión del change 2, sin tocar la vista. El filtro por título del Catálogo sigue siendo la función pura sobre la lista cargada; el parámetro `titulo` del repositorio queda disponible para el change 2. Las operaciones **sin endpoint** existen porque la aplicación actual las usa (listado de clientes, casillas de autores, edición del teléfono); llevan un comentario que las marca y el change 5 decide su diseño contra la API.

`src/datos/proveedor.ts` es la raíz de composición: exporta una instancia de cada repositorio; hoy todas son las locales, sobre el almacenamiento del navegador que entrega `almacen-local.ts` (único archivo que nombra `localStorage`), e invoca una sola vez la inicialización (siembra) del almacén local al crearlas, de modo que las vistas ya no llaman a `inicializar()`. Las vistas importan solo `proveedor` y los tipos.

Alternativa descartada: vistas tipadas con la forma local (`lib-01`, `nombreCompleto`, precio numérico) y reformadas en los changes 2 y 5; obligaría a reescribir cada vista dos veces y a mantener dos modelos de libro durante la serie.

### D7 — Adaptador local sobre el almacén actual

- `src/datos/local/almacen-local.ts`: el almacén actual en TypeScript, como fábrica `crearAlmacenLocal(storage: Storage | null)` con las mismas claves, el mismo formato guardado, las mismas reglas de lectura (clave ausente o ilegible → ejemplos sin escribir; ventas ilegibles → error), la misma siembra por clave ausente y la misma degradación a memoria. La inyección del almacenamiento reemplaza los contextos `vm` de las pruebas y evita depender del `localStorage` global que algunas versiones de Node exponen.
- `src/datos/local/datos-iniciales.ts`: los mismos datos de ejemplo tipados con la forma local; editoriales y autores suman `pais` y `nacionalidad` ficticios, que la forma de la API exige y que no se persisten (SU-05).
- `src/datos/local/repositorios-locales.ts`: implementa las interfaces traduciendo entre la forma local y la de la API:
  - Identificadores: `lib-07` ↔ `7` (sufijo numérico; la búsqueda inversa compara números, sin rearmar el texto).
  - Importes: número local → `Dinero` con las reglas de centavos ya probadas de `ventas.js` (redondeo al centavo, mitades hacia arriba): `2350.5` → `"2350.50"`; `Dinero` recibido → número al guardar.
  - Libro: `editorialId`/`generoId` → `editorial`/`genero` resueltos contra los datos iniciales (`null` si no hay género); `autorIds` → `autores` con `rol: "autor"` y `orden` según la posición; `stock` → `0` (el formato local no lo guarda; el formulario lo agrega en el change 5 y el valor recibido en `crear` se descarta).
  - Cliente: `nombreCompleto` ↔ `nombre`; `telefono` → `perfil` (`{ id, cliente_id, telefono, direccion: null }`) o `null`.
  - Venta: la instantánea local → `Venta` con importes `Dinero` y `cliente.nombre`; `crear(VentaNueva)` hace lo que hará el servidor: resuelve cliente y libros vigentes, arma la instantánea con la lógica pura `construirVenta` (precio histórico, subtotales y total) y la guarda con el formato actual.

### D8 — Lógica pura en `src/logica/`

`texto`, `catalogo`, `libros`, `clientes` y `ventas` pasan a módulos TypeScript sin DOM, con las mismas reglas, y trabajan sobre los tipos de dominio. Cambios forzados por la forma de los datos, cada uno con su caso de prueba:

- `catalogo`: `filtrarPorTitulo` y `estadoDelListado` sin cambios de regla; los resolvedores por identificador (`resolverEditorial`, `resolverGenero`, `resolverAutores`) se reemplazan por funciones sobre las relaciones anidadas (`nombreGenero(genero)` → «Sin clasificar» si es `null`; `nombresAutores(autores)` en el orden de `orden`).
- `clientes`: `validarCliente` recibe `nombre` en lugar de `nombreCompleto`; mantiene email obligatorio con formato y sin duplicados normalizados, y teléfono obligatorio de 7 a 15 dígitos (regla vigente según código y README).
- `libros`: `validarLibro` recibe `editorial_id`, `genero_id` y `autores` con la forma de `LibroNuevo` y valida contra `Libro[]`; mismas reglas (ISBN normalizado sin duplicados, precio positivo, editorial y autores existentes, género opcional).
- `ventas`: renglones con `libro_id`; acepta precios `Dinero` además de número (el cálculo sigue en centavos enteros); los resultados exponen importes `Dinero`.
- `dinero` (nuevo): `aCentavos`, `aDinero`, `formatearImporte` (`"1500.00"` → `"$ 1500,00"`, igual que hoy).

### D9 — Pruebas con Vitest

Vitest usa la misma configuración y resolución de módulos que Vite (importaciones sin extensión, `import.meta.env`), ejecuta TypeScript sin paso de compilación y tiene una API compatible con la de `node:test`/`assert` en lo que la suite usa. Configuración en `vite.config.ts` (`/// <reference types="vitest/config" />`, `test.environment: "node"`, `test.include: ["tests/**/*.test.ts"]`); las importaciones de `test`/`expect` son explícitas (sin globales).

Migración por suite: primero se escribe la prueba `.test.ts` contra el módulo nuevo (RED: el módulo no existe) y luego se migra el módulo (GREEN). Mientras queden páginas de la raíz usando `js/`, las suites `.js` y sus módulos siguen en el repositorio y `node --test tests/*.test.js` debe mantener su línea base; se borran juntos en la limpieza final, cuando ninguna página los usa. Cada tarea registra la correspondencia caso anterior → caso nuevo; los casos que dejan de aplicar (por ejemplo, resolvedores por identificador, carga en contexto `vm`) se listan con su caso sustituto. Las 15 fallas de la línea base se tratan como fixtures desactualizados: al migrar `clientes`, cada caso conserva su aserción y su fixture suma un teléfono válido; se deja constancia en la tarea. Las vistas y el DOM siguen verificándose con los casos manuales CM-1 a CM-8, como hasta ahora.

Alternativa descartada: `node --test` con la eliminación de tipos nativa de Node 24; no resuelve `import.meta.env` ni las importaciones sin extensión del modo *bundler* y exigiría a todo el equipo Node 23.6+.

### D10 — Base `/api` del mismo origen y reenvío en desarrollo

- `src/datos/api/base.ts`: `obtenerBaseApi(valor?: string): string` (función pura, con pruebas) que devuelve `VITE_API_BASE` sin barra final, o `/api` si falta o está vacía. El change 2 la usa para construir las URL.
- `vite.config.ts`: `server.proxy["/api"] = { target, changeOrigin: true, rewrite: quita "/api" }`; `target` sale de `API_PROXY_TARGET` (variable solo de servidor, sin prefijo `VITE_`, leída con `loadEnv`) con `https://api.ismaelsuarez.me` por defecto, y no llega al código del navegador. El mismo reenvío se configura en `preview.proxy` para probar la compilación localmente.
- `.env.example` documenta ambas variables. En producción, el contenedor del frontend (change 6) sirve la compilación y reenvía `/api` con la misma regla; el frontend nunca llama a la API desde otro origen, porque la API no envía cabeceras CORS y no se puede tocar.

### D11 — Estilos e imágenes

Las siete hojas pasan a `src/styles/` con el mismo contenido y el mismo orden de enlace (base, disposición, componentes y luego las propias de cada vista), enlazadas desde cada HTML con `<link>` (Vite las procesa y reescribe sus rutas). Las imágenes pasan a `src/assets/` y se usan por importación (`import faro from "../../../assets/portadas/Faro_Vientos.png"`) o por `url()` relativa en CSS, porque con `base: "./"` y páginas anidadas una ruta armada como texto en tiempo de ejecución apuntaría a la carpeta de la página y fallaría en la compilación. Las siete referencias a `img/portadas/*.jpg` inexistentes del marcado de maqueta se quitan; la portada de respaldo textual se conserva tal cual. `recursos/LEEME.txt` se mueve a `src/assets/`.

### D12 — Carga asíncrona de las vistas

Cada módulo de vista define `async function iniciar()` que espera los repositorios, pinta y conecta eventos; la llamada se envuelve con un manejador que muestra un mensaje de error en texto en la región de mensajes de la vista (sin `innerHTML`). Con el adaptador local las promesas se resuelven al instante, así que no hay estados de carga visibles nuevos; los mensajes y estados de carga contra la red son del change 2.

### D13 — Documentación y reglas duras

En `CLAUDE.md` y `AGENTS.md` (copias idénticas): stack (Vite + TypeScript estricto, módulos ES, Vitest, API de producción vía `/api`), comandos (`npm install`, `npm run dev`, `npm run build`, `npm run preview`, `npm test`), y reglas duras: la 1 pasa a «sin librerías de ejecución ni CDNs; solo `vite`, `typescript`, `vitest` y `@types/node` como dependencias de desarrollo»; las 2, 3 y 4 (`scripts-clasicos-sin-modulos`, `sin-package-json-ni-build`, `sin-fetch-api-servidor`) se reemplazan por «módulos ES de TypeScript con `import type` para tipos», «`npm run build` sin errores de tipos y sin `any` explícito» y «datos solo por repositorios; red solo hacia la base del mismo origen»; las 6 y 7 actualizan rutas (`src/logica/`, `src/datos/local/`); la 14 conserva «sin `var`» y elimina la función envolvente; se conservan sin cambios `textContent`, lógica sin DOM, 320/1280 px con teclado y foco, español neutro, ventas como instantánea y Engram. Se quitan las frases «index.html se abre sin npm ni servidor» y «La entrega no incluye dependencias ni herramientas de compilación», y se agrega la limitación conocida: autenticación y roles solo en el cliente (la API queda abierta). `CHANGES.md` suma la serie TypeScript de seis changes (fase nueva) y conserva la serie JavaScript como historial archivado. `knowledge-base/08` describe la estructura, la carga de módulos, la frontera de repositorios, `/api` y la verificación nuevas; `knowledge-base/09` agrega decisiones nuevas (migración a Vite + TS, API de producción intocable como fuente de datos, `/api` del mismo origen, autenticación solo en el cliente) y marca DD-03 y DD-04 como reemplazadas. El README explica instalación, comandos y estructura.

## Risks / Trade-offs

- [Cambio de forma de datos en todas las vistas a la vez] → una vista por commit, cada una con su verificación manual en navegador (320/1280 px, teclado) y la suite verde; las pruebas del adaptador fijan cada traducción antes de que la use una vista.
- [Convivencia de páginas viejas y nuevas durante la migración] → el formato de `localStorage` no cambia, Vite sirve también los HTML de la raíz, y cada commit actualiza los enlaces de navegación de todas las páginas para que la aplicación siga recorrible después de cada commit.
- [Cambio de origen: lo guardado desde `file://` no se ve en `http://localhost:5173`] → es esperado; la siembra vuelve a cargar los ejemplos; se documenta en el README.
- [Rutas de recursos rotas en la compilación con `base: "./"` y páginas anidadas] → importaciones de recursos y verificación de la compilación servida bajo una subruta antes de cerrar.
- [Versiones de Node del equipo menores a las que exige Vite 7] → `engines` en `package.json` y nota en el README; ver Open Questions.
- [`stock: 0` y `rol: "autor"` fijos del adaptador local] → datos de transición documentados en el adaptador; no se muestran en ninguna vista de este change.
- [Mezcla de orígenes en el change 2: catálogo desde la API y vistas de gestión todavía locales, con identificadores que no coinciden] → se deja anotado para que el change 2 decida si cambia todos los repositorios de lectura juntos.
- [Seguridad] Sin cambios de superficie: no se agregan autenticación ni llamadas de escritura; se mantiene la inserción de datos como texto.

## Migration Plan

1. Rama `feat/migracion-vite-typescript` desde `main`; línea base de pruebas registrada.
2. Herramientas y documentación de reglas → convención `/api` → tipos → lógica pura → almacén y repositorios locales → vistas una por una → limpieza de lo heredado y verificación integral, con commits por unidad de trabajo (ver `tasks.md`).
3. Sin migración de datos. Reversión: revertir la rama; el formato guardado no cambió, así que la versión anterior lee los mismos datos.

## Open Questions

- ¿Qué versión de Node tienen las máquinas de Avalos Pablo y Blangetti Sofia? Si alguna es menor a 20.19, debe actualizarse antes de trabajar en este change; no cambia el diseño ni las tareas.
