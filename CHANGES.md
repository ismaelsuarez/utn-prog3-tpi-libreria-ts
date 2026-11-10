# CHANGES — Secuencia de Implementación

> Índice canónico de los changes del proyecto **TPI: frontend de una librería** (UTN, Programación III).
> Hay dos series. La **serie TypeScript (T-01 a T-06)** es la vigente: migra el proyecto a Vite + TypeScript estricto y lo conecta con la API de producción. La **serie JavaScript (C-01 a C-06)**, uno por ejercicio de la consigna original (100 puntos), está **archivada** y se conserva como historial.
> Cada change se recorre con el ciclo `/opsx:explore` → `/opsx:propose` → `/opsx:apply` → `/opsx:archive`.
> **Leer este archivo antes de ejecutar cualquier `/opsx:propose`.**

Equipo: Avalos Pablo, Blangetti Sofia y Suarez Ismael. En este documento «Integrante A/B/C» designa un puesto de trabajo en paralelo en la serie JavaScript; el reparto nominal de tareas sigue abierto (PA-07 en `knowledge-base/10_preguntas_abiertas.md`).

Restricciones que valen para todos los changes de la serie TypeScript (ver `knowledge-base/09_decisiones_y_supuestos.md`, DD-16 a DD-20):

- Vite 7 y TypeScript estricto (`tsc` sin errores, sin `any` explícito), con la estructura del repositorio base `chiro45/proteger_rutas`: `src/pages/{auth,admin,client}/<vista>/`, `src/main.ts` como entrada común, `src/types/`, `src/utils/`.
- Sin librerías de ejecución ni CDNs: las únicas dependencias son de desarrollo (`vite`, `typescript`, `vitest`, `@types/node`). Módulos ES con `import`/`export`; los tipos con `import type`.
- La API de producción `https://api.ismaelsuarez.me` **no se puede modificar ni redesplegar**: todo cambio va en el frontend. El navegador la llama siempre por la base `/api` del mismo origen (`VITE_API_BASE`), con reenvío en desarrollo (`server.proxy`) y en producción (contenedor del change T-06); la API no envía cabeceras CORS.
- Las vistas acceden a los datos solo por los repositorios de `src/datos/repositorios.ts`, asíncronos y con la forma de la API. La lógica pura (sin DOM) vive en `src/logica/` y se prueba con Vitest desde `tests/`.
- CSS propio y local en `src/styles/`; los datos de usuario se insertan en el DOM como texto (`textContent`, creación de nodos), nunca como HTML.
- Limitación conocida: la autenticación y los roles viven solo en el cliente (`localStorage`); la API queda abierta.

---

## Cómo usar este documento

1. Identificar el change a implementar y verificar que sus dependencias están en `openspec/changes/archive/`. Excepción declarada: el trabajo de **lógica pura** y de **diseño** de un change puede adelantarse mientras sus dependencias se completan (ver «Paralelismo por fase»); el `/opsx:archive` siempre respeta el orden de dependencias.
2. Leer los documentos de `knowledge-base/` indicados en «Leer antes» de ese change.
3. Ejecutar, en orden, los comandos indicados en el Scope del change: `/opsx:explore <nombre>`, `/opsx:propose <nombre>` y `/opsx:apply <nombre>`.
4. Al terminar y verificar el change, archivarlo con `/opsx:archive <nombre>`.
5. Marcar el checkbox `[x]` del change en este archivo (campo **Estado**).

---

## Serie TypeScript (vigente)

### Árbol de dependencias

```
T-01 migracion-vite-typescript
  ├── T-02 cliente-http-y-catalogo ─────────────┐
  └── T-03 registro-login-y-sesion              │
        └── T-04 proteccion-de-rutas-y-roles    │
              └── T-05 operaciones-contra-api ◄─┘ (depende de T-02 y T-04)
                    └── T-06 despliegue-frontend
```

| Change | Depende de |
|---|---|
| T-01 | ninguna |
| T-02 | T-01 |
| T-03 | T-01 |
| T-04 | T-03 |
| T-05 | T-02, T-04 |
| T-06 | T-05 |

T-02 y T-03 son independientes entre sí y pueden avanzar en paralelo una vez archivado T-01. Camino crítico: `T-01 → T-03 → T-04 → T-05 → T-06`.

### [T-01] `migracion-vite-typescript`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-migracion-vite-typescript/`)
- **Scope**:
  - Migra la base técnica sin cambiar el comportamiento visible: `package.json`, Vite 7, TypeScript estricto, Vitest, `vite.config.ts` multipágina con `base: "./"` y reenvío de `/api` en `server.proxy` y `preview.proxy`.
  - Vistas en `src/pages/<zona>/<vista>/` (Catálogo en `client`; Libros, Clientes, Ventas e Historial en `admin`; `auth` reservada) cargadas con `<script type="module">`; `index.html` de la raíz redirige al Catálogo.
  - Tipos de dominio en `src/types/` alineados con los DTO de la API de producción, e interfaces de repositorio asíncronas en `src/datos/repositorios.ts` con un adaptador sobre el almacén local actual (mismas claves y formato de `localStorage`).
  - Lógica pura y almacén migrados a TypeScript con sus pruebas en Vitest; documentación y reglas duras actualizadas.
- **Dependencias**: ninguna
- **Governance**: ALTO (cambia herramientas, estructura de carpetas, sistema de módulos y fija los contratos —zonas, tipos, repositorios, `/api`— que dan por hechos los cinco changes siguientes)
- **Leer antes**:
  - `openspec/changes/migracion-vite-typescript/` (proposal, design y deltas)
  - `knowledge-base/08_arquitectura_propuesta.md` y `knowledge-base/09_decisiones_y_supuestos.md` (DD-16 a DD-20)

### [T-02] `cliente-http-y-catalogo`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-cliente-http-y-catalogo/`)
- **Scope**:
  - Cliente `fetch` tipado sobre la base `/api` (`obtenerBaseApi`), con manejo de `ErrorApi`, estados de carga y mensajes de error en texto.
  - Adaptadores HTTP de `RepositorioLibros` (lectura), `RepositorioEditoriales` y `RepositorioGeneros` que reemplazan a los locales sin tocar las vistas; el Catálogo pasa a leer de la API.
  - Ítem abierto: `LibroRead` no incluye autores, solo `LibroDetalleRead`; decidir cómo obtener los autores para el listado (detalle por libro, paginación con `limit` 1–100 y `offset`, sin total).
  - Ítem abierto: mezcla de orígenes de datos (catálogo desde la API y vistas de gestión todavía locales, con identificadores que no coinciden); decidir si los repositorios de lectura cambian todos juntos.
- **Dependencias**: `T-01`
- **Governance**: MEDIO (primera conexión real con la API; solo lectura)
- **Leer antes**:
  - `openspec/changes/migracion-vite-typescript/design.md` (D5, D6 y D10)
  - `knowledge-base/09_decisiones_y_supuestos.md` (DD-16 a DD-20)

### [T-03] `registro-login-y-sesion`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-registro-login-y-sesion/`)
- **Scope**:
  - Vistas `login` y `registro` en la zona `auth`; usuarios en `localStorage` (`users`, `userData`) con una semilla `admin`; sesión con `IUser` y `Rol`. `index.html` de la raíz pasa a apuntar al login.
  - Decide cómo se suma la contraseña al arreglo `"users"` del repositorio base.
  - Autenticación solo en el cliente (limitación conocida): no hay endpoints de autenticación en la API.
- **Dependencias**: `T-01`
- **Governance**: CRÍTICO (autenticación y credenciales)
- **Leer antes**:
  - `openspec/changes/migracion-vite-typescript/design.md` (D3, D4 y D5)
  - `knowledge-base/09_decisiones_y_supuestos.md` (DD-19)

### [T-04] `proteccion-de-rutas-y-roles`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-proteccion-de-rutas-y-roles/`)
- **Scope**:
  - Intercepción de la carga de cada página en `src/main.ts` (que todas las vistas importan primero): sin sesión, redirige al login; un usuario con rol `client` que entra a `/admin/` es redirigido; `admin` alcanza `admin` y `client`.
  - Navegación y cierre de sesión según el rol.
- **Dependencias**: `T-03`
- **Governance**: CRÍTICO (control de acceso, aunque solo en el cliente)
- **Leer antes**:
  - `openspec/changes/archive/2026-11-09-migracion-vite-typescript/design.md` (D3 y D4)
  - `knowledge-base/03_actores_y_roles.md`

### [T-05] `operaciones-contra-api`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-operaciones-contra-api/`)
- **Scope**:
  - Altas de libros (con `stock` y autores con rol), clientes con perfil, ventas con totales del servidor e historial, todo contra la API mediante los repositorios.
  - Ítems abiertos de diseño: la API no ofrece `GET /clientes/` (listado de clientes), `GET /autores/` (listado de autores) ni actualización del perfil (edición del teléfono); son las operaciones marcadas «sin endpoint» en `src/datos/repositorios.ts`.
  - Agrega a los formularios los campos que la API exige (stock, rol de autoría, dirección del perfil).
- **Dependencias**: `T-02`, `T-04`
- **Governance**: ALTO (primeras escrituras contra la API de producción, que no se puede modificar ni restaurar)
- **Leer antes**:
  - `openspec/changes/migracion-vite-typescript/design.md` (D5, D6 y D7)
  - `knowledge-base/04_modelo_de_datos.md` y `knowledge-base/05_reglas_de_negocio.md`

### [T-06] `despliegue-frontend`
- **Estado**: `[x]` archivado el 2026-11-09 (`openspec/changes/archive/2026-11-09-despliegue-frontend/`); publicado en `https://libreria.ismaelsuarez.me`
- **Scope**:
  - Contenedor `nginx` que sirve la compilación y reenvía `/api` a la API de producción, desplegado en Easypanel en `libreria.ismaelsuarez.me`.
  - README final y armado de la entrega (zip).
- **Dependencias**: `T-05`
- **Governance**: ALTO (entrega y entorno)
- **Leer antes**:
  - `openspec/changes/migracion-vite-typescript/design.md` (D10)
  - `knowledge-base/08_arquitectura_propuesta.md`

---

# Serie JavaScript C-01 a C-06 (historial archivado)

> Los seis changes siguientes se completaron y archivaron entre el 2026-10-13 y el 2026-10-16. Describen el proyecto en JavaScript clásico y se conservan sin cambios como historial: las rutas `js/` y `css/` que citan fueron reemplazadas por la estructura de `src/` (change T-01), y sus restricciones («sin npm», «sin `fetch`», «sin `type="module"`», `node --test`) ya no rigen.

## Árbol de dependencias

```
C-01 estructura-y-pantallas-html            ┐
  │                                         │  ETAPA 1 (hito 1:
  ├── C-02 presentacion-css-y-uso-adaptable ┘  maqueta: ejercicios 1 y 2)
  │         │
  │         └─────────────────────────────────────────┐ (se une en C-06)
  │                                                   │
  └── C-03 datos-locales-catalogo-y-filtro            │
        └── C-04 alta-de-libros-y-clientes            │
              └── C-05 venta-simulada-e-historial     │
                    └── C-06 persistencia-verificacion-y-documentacion ◄┘
                              (depende de C-05 y de C-02)
```

Dependencias en forma de lista:

| Change | Depende de |
|---|---|
| C-01 | ninguna |
| C-02 | C-01 |
| C-03 | C-01 |
| C-04 | C-03 |
| C-05 | C-04 |
| C-06 | C-05, C-02 |

C-02 y C-03 son independientes entre sí: ambos parten del marcado de C-01. El único punto donde se tocan es el marcado compartido (clases CSS y `id` de los contenedores), que se acuerda en el `/opsx:propose` de C-01.

### Trazabilidad con la consigna

| Change | Ejercicio | Puntos | Rúbrica | Historias (`06_funcionalidades.md`) |
|---|---|---|---|---|
| C-01 `estructura-y-pantallas-html` | 1. Estructura y pantallas HTML | 20 | vistas y navegación 10; semántica, formularios y estados 10 | US-001, US-002 |
| C-02 `presentacion-css-y-uso-adaptable` | 2. Presentación con CSS y uso adaptable | 20 | coherencia y organización 8; adaptación 8; accesibilidad básica 4 | US-003, US-004, US-005 |
| C-03 `datos-locales-catalogo-y-filtro` | 3. Datos locales, catálogo y filtro | 15 | modelo y ejemplos 5; renderizado 5; filtro y estados 5 | US-006, US-007, US-008 |
| C-04 `alta-de-libros-y-clientes` | 4. Alta de libros y clientes | 15 | libros y selectores 6; clientes 4; validación y actualización 5 | US-009, US-010 |
| C-05 `venta-simulada-e-historial` | 5. Venta simulada e historial | 20 | composición y validaciones 8; cálculos 5; confirmación e historial inmutable 7 | US-011, US-012, US-013, US-014 |
| C-06 `persistencia-verificacion-y-documentacion` | 6. Persistencia, verificación y documentación | 10 | persistencia 4; pruebas manuales registradas 3; documentación y entrega 3 | US-015, US-016, US-017 |
| | | **100** | | |

### Paralelismo por fase

> Cada «gate» es un punto de sincronización. Los trabajos de un mismo gate pueden hacerse en paralelo. La cadena principal es casi lineal (cada ejercicio usa lo anterior); el paralelismo real está en el arranque, en la lógica pura de cada change y en el README.

```
GATE 0: ninguna
  → C-01 estructura-y-pantallas-html              [Integrante A — marcado de las 5 páginas]
  → C-02 (solo explore/propose + css/base.css)    [Integrante B — paleta, tipografía y variables; PA-03]
  → C-03 (solo lógica pura y datos)               [Integrante C — texto.js, catalogo.js, datos-iniciales.js y sus tests]

GATE 1: C-01 ✓                                    ← FORK (3 trabajos en paralelo)
  → C-02 apply: disposicion.css y componentes.css [Integrante B]
  → C-03 apply: almacen.js, interfaz.js y paginas/catalogo.js   [Integrante C]
  → C-04 (solo explore/propose + lógica pura)     [Integrante A — libros.js, clientes.js y sus tests; requiere texto.js de C-03]

GATE 2: C-01 ✓ + C-02 ✓                           ← HITO ETAPA 1 (maqueta)
  → Revisión conjunta de la Etapa 1 a 320 px y 1280 px; identificar qué es maqueta (RN-GL-08)
  → C-03 sigue su curso si no terminó                [Integrante C]

GATE 3: C-03 ✓
  → C-04 apply: páginas libros.js y clientes.js y escritura en localStorage   [Integrante A]
  → C-05 (solo explore/propose + lógica pura ventas.js y tests)               [Integrante B]
  → C-06 (solo borrador de README.md: integrantes, apertura, navegación, funcionalidades)   [Integrante C]

GATE 4: C-04 ✓
  → C-05 apply: paginas/ventas.js, paginas/historial.js y agregarVenta        [Integrante B, con apoyo de A]
  → C-06 (solo explore: PA-04 y PA-05, carga inicial robusta)                 [Integrante C]

GATE 5: C-05 ✓ + C-02 ✓
  → C-06 apply: carga inicial consolidada, README completo, casos CM-1..CM-8 y entrega   [A, B y C — ver plan]
```

### Camino crítico (5 changes — mínimo irreducible)

```
C-01 → C-03 → C-04 → C-05 → C-06
```

C-02 no integra la cadena técnica (ningún change posterior necesita su CSS para funcionar), pero es la segunda mitad de la Etapa 1, se une en C-06 (caso CM-8 y entrega) y conviene terminarlo en paralelo con C-03, no después. Si C-02 se atrasa, la fecha de la Etapa 1 se compromete aunque el camino crítico técnico no cambie.

### Plan óptimo con 3 agentes

| Paso | Integrante A (marcado y altas) | Integrante B (presentación y ventas) | Integrante C (datos, almacén y documentación) |
|---|---|---|---|
| 1 (GATE 0) | C-01: explore, propose y apply del marcado de las cinco páginas, formulario y script de maqueta | C-02: explore y propose; `css/base.css` (paleta, tipografía local, variables, foco) | C-03: explore y propose; `datos-iniciales.js`, `texto.js`, `catalogo.js` y tests con `node --test` |
| 2 (GATE 1) | C-01: archive. Luego C-04: explore, propose y lógica pura `libros.js` y `clientes.js` con tests | C-02: apply de `disposicion.css` y `componentes.css`; comprobación a 320 px y 1280 px | C-03: apply de `almacen.js`, `interfaz.js` y `paginas/catalogo.js` |
| 3 (GATE 2 → 3) | **Hito Etapa 1** junto con B. Cuando C-03 esté archivado: C-04 apply (libros, clientes, escritura en `localStorage`) | C-02: archive; **hito Etapa 1**. Luego C-05: explore, propose y lógica pura `ventas.js` con tests | C-03: archive. Borrador de `README.md` (C-06) |
| 4 (GATE 4) | C-04: archive. Apoyo en `ventas.html` | C-05: apply de `paginas/ventas.js`, `paginas/historial.js` y `agregarVenta` | C-06: explore de PA-04 y PA-05; pruebas del almacén con almacenamiento simulado |
| 5 (GATE 5) | C-06: carga inicial consolidada en `almacen.js`; casos CM-1 a CM-3 | C-05: archive. C-06: casos CM-4 a CM-6 | C-06: casos CM-7 y CM-8, README completo, armado de la entrega; C-06: archive |

Notas: el paso 3 es el cuello de botella real (C-04 y C-05 usan el almacén de C-03). El reparto es una sugerencia; cualquier persona puede ejecutar cualquier columna mientras respete las dependencias.

---

## FASE 1 — Maqueta navegable y presentable (ETAPA 1)

> **HITO 1 — ETAPA 1 (semana de repaso)**: C-01 + C-02 completos. Consiste en las pantallas del ejercicio 1 con la presentación del ejercicio 2, datos estáticos de ejemplo y **una** interacción básica (filtro por título del catálogo). Los controles pendientes se identifican expresamente como maqueta y no se presentan como operaciones completas (RN-GL-08).
> Los changes C-01 y C-02 se solapan: C-02 puede empezar con `css/base.css` apenas se acuerde el vocabulario de clases en el propose de C-01.

### [C-01] `estructura-y-pantallas-html`
- **Estado**: `[x]` archivado el 2026-10-13 (`openspec/changes/archive/2026-10-13-estructura-y-pantallas-html/`)
- **Scope**:
  - Trazabilidad: **Ejercicio 1, 20 puntos** (vistas y navegación 10; semántica, formularios y estados 10). US-001 y US-002. Reglas: RN-UI-06 a RN-UI-10, RN-CA-02, RN-CA-03, RN-GL-08. **Pertenece a la Etapa 1.**
  - Páginas: `index.html` (Catálogo, SU-04), `libros.html`, `clientes.html`, `ventas.html`, `historial.html`. Cada una enlaza a las otras cuatro con `aria-current="page"` en la vista activa.
  - Semántica en cada página: `header`, `nav`, `main`, `footer`, `section`, un único `h1`; tablas con `caption` y `th scope`; formularios con `label for`/`id`, `fieldset`/`legend` donde corresponda y botones con texto que describe su acción.
  - Catálogo: título de la librería, buscador por título y listado en **tarjetas** (una por libro) con título, ISBN, editorial, género, autores y precio. La tabla queda para la vista Libros.
  - Libros: formulario (título, ISBN, precio, editorial, género, autores) y tabla. Clientes: formulario (nombre completo, email) y tabla. Ventas: selector de cliente, selector de libro, cantidad, tabla de renglones y resumen con total. Historial: tabla de ventas con acceso al detalle, que se muestra en la misma página (PA-12 resuelta).
  - Contenedores previstos con `id` estables para el JavaScript posterior: mensajes de operación correcta/rechazada (`role="status"` y `role="alert"`), lista vacía, búsqueda sin resultados, errores de cada campo, selectores de editorial/género/autores/cliente/libro.
  - Datos estáticos de ejemplo escritos en el HTML (Etapa 1) y marca visible «Maqueta» en cada control todavía no funcional.
  - Interacción básica de la Etapa 1: `js/paginas/catalogo.js` mínimo que filtra por título las filas estáticas del catálogo (script clásico). C-03 reemplaza este archivo por la versión generada desde datos.
  - Estructura de carpetas: `css/` con `base.css`, `disposicion.css` y `componentes.css` (vacíos pero enlazados), `js/`, `recursos/`.
  - `README.md` inicial mínimo (integrantes, cómo abrir `index.html`, qué pantallas son maqueta y qué interacción funciona); C-06 lo completa. Cuando existan la estructura y el README, el equipo crea el repositorio git (DD-07, fuera del change).
  - Acordar en el propose el **vocabulario de clases CSS y de `id`** que C-02 y C-03 usarán.
  - Verificación: apertura por `file://` de las cinco páginas, navegación completa, sin errores en consola. No hay lógica pura, por lo tanto no hay tests con `node --test`.
  - Decisiones cerradas en el explore y el propose (ver `openspec/changes/estructura-y-pantallas-html/design.md`): `index.html` es el Catálogo (PA-09), detalle de venta en la misma página (PA-12), una `<template>` por tarjeta o fila, autores con casillas, formularios con `novalidate` y vocabulario de `id`, `data-campo`, `data-accion` y clases (D9).
  - Comandos: `/opsx:explore estructura-y-pantallas-html` → `/opsx:propose estructura-y-pantallas-html` → `/opsx:apply estructura-y-pantallas-html` → `/opsx:archive estructura-y-pantallas-html`.
  - Paralelismo: arranca solo (GATE 0). Mientras A maqueta, B y C pueden hacer explore/propose y trabajo sin DOM de C-02 y C-03.
- **Dependencias**: ninguna
- **Governance**: BAJO (marcado estático y configuración de carpetas; sin lógica crítica)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §Épica 1 (US-001, US-002)
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios y §Carga de scripts
  - `knowledge-base/05_reglas_de_negocio.md` §Formularios e interfaz (RN-UI) y §Excepciones globales (RN-GL-08)
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-01, DD-03 y SU-04

---

### [C-02] `presentacion-css-y-uso-adaptable`
- **Estado**: `[x]` archivado el 2026-10-14 (`openspec/changes/archive/2026-10-14-presentacion-css-y-uso-adaptable/`)
- **Scope**:
  - Trazabilidad: **Ejercicio 2, 20 puntos** (coherencia y organización 8; adaptación 8; accesibilidad básica 4). US-003, US-004 y US-005. Reglas: RN-GL-01 a RN-GL-04, RN-UI-11 a RN-UI-15. **Pertenece a la Etapa 1; su cierre completa el hito.**
  - `css/base.css`: variables en `:root` (paleta, tipografía, espaciado, radios), reinicio mínimo, estilo de `:focus-visible` en todos los controles. Cerrar PA-03 (paleta y tipografía) en el explore.
  - `css/disposicion.css`: encabezado y navegación (que se reordene sin romperse a 320 px), grillas con Flexbox o Grid, puntos de corte para 320 px y 1280 px, sin desplazamiento horizontal de la página.
  - `css/componentes.css`: tarjetas, formularios, botones, tablas y mensajes (correcto, error, vacío, maqueta). Los errores se distinguen con texto además del color.
  - Clase contenedora de tabla con `overflow-x: auto` para que la tabla se desplace dentro de su propio contenedor.
  - Tipografías locales en `recursos/fuentes/` (o pila de fuentes del sistema); imágenes locales con `alt` informativo o `alt=""` si son decorativas; registrar la procedencia de imágenes ajenas (PA-13).
  - Orden de tabulación coherente con el orden visual, objetivos táctiles suficientes y contraste legible.
  - Reutilización de clases para elementos equivalentes; ajustes mínimos del marcado de C-01 (solo clases) acordados con el integrante A.
  - Verificación: manual en las cinco páginas a 320 px y 1280 px, recorrido por teclado. Es la comprobación anticipada de CM-8. No hay tests automáticos (CSS).
  - Cierre del hito Etapa 1: revisión conjunta de C-01 + C-02 y marcado expreso de qué es maqueta (RN-GL-08).
  - Comandos: `/opsx:explore presentacion-css-y-uso-adaptable` → `/opsx:propose presentacion-css-y-uso-adaptable` → `/opsx:apply presentacion-css-y-uso-adaptable` → `/opsx:archive presentacion-css-y-uso-adaptable`.
  - Paralelismo: `base.css` y el diseño visual pueden avanzar en GATE 0; `disposicion.css` y `componentes.css` esperan el marcado de C-01. Es independiente de C-03.
- **Dependencias**: `C-01`
- **Governance**: BAJO (estilos; sin lógica ni datos)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §Épica 2 (US-003 a US-005)
  - `knowledge-base/05_reglas_de_negocio.md` §Formularios e interfaz (RN-UI-11 a RN-UI-15) y §Excepciones globales
  - `knowledge-base/08_arquitectura_propuesta.md` §Adaptación y accesibilidad
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-05
  - `knowledge-base/10_preguntas_abiertas.md` PA-03

---

## FASE 2 — Datos, altas y ventas (ETAPA 2)

> A partir de acá las pantallas dejan de ser maqueta y se conectan con datos. El almacén (`js/almacen.js`) nace en C-03 y todos los changes siguientes lo consumen: su interfaz no debe cambiar de firma después de C-03.

### [C-03] `datos-locales-catalogo-y-filtro`
- **Estado**: `[x]` archivado el 2026-10-15 (`openspec/changes/archive/2026-10-15-datos-locales-catalogo-y-filtro/`)
- **Scope**:
  - Trazabilidad: **Ejercicio 3, 15 puntos** (modelo y ejemplos 5; renderizado 5; filtro y estados 5). US-006, US-007 y US-008. Reglas: RN-CA-01 a RN-CA-08, RN-UI-05.
  - `js/datos/datos-iniciales.js`: al menos 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes ficticios; incluir un libro sin género («Sin clasificar»), un libro con más de un autor y libros con precios 1500 y 2000 (necesarios para CM-5). Exportación dual (espacio de nombres `Libreria` y `module.exports` si existe).
  - Modelo: propiedades según `04_modelo_de_datos.md` (`titulo`, `isbn`, `precio`, `editorialId`, `generoId`, `autorIds`, etc.); confirmar SU-02 y fijar el esquema de identificadores sin `crypto.randomUUID` (SU-03, PA-08).
  - `js/logica/texto.js`: `normalizarTexto`, `normalizarIsbn` (sin espacios ni guiones) y `normalizarEmail` (recorta y pasa a minúsculas); reutilizadas por C-04.
  - `js/logica/catalogo.js`: `filtrarPorTitulo(libros, texto)` (sin distinguir mayúsculas, coincidencia parcial, recorte de espacios, vacío devuelve todo) y resolución de editorial, género (o «Sin clasificar») y autores por identificador.
  - `js/almacen.js`: **interfaz estable** para todo el proyecto: `obtenerLibros`, `obtenerClientes`, `obtenerVentas`, `obtenerEditoriales`, `obtenerGeneros`, `obtenerAutores`, `agregarLibro`, `agregarCliente`, `agregarVenta`. En este change se implementa la lectura (sobre datos iniciales) y se documentan firma y contrato de las escrituras; la escritura en `localStorage` llega en C-04 (libros y clientes) y C-05 (ventas).
  - `js/interfaz.js`: utilidades de DOM (mostrar mensaje, vaciar un nodo, formatear importes con dos decimales), con inserción como texto.
  - `js/paginas/catalogo.js`: reemplaza el script de maqueta de C-01; genera la tabla desde el almacén, filtra al escribir, muestra «Sin clasificar» y los mensajes de lista vacía y de búsqueda sin resultados.
  - Tests con `node --test` en `tests/`: normalización, filtro (mayúsculas, parcial, recorte, vacío, sin coincidencias) y consistencia de los datos iniciales (mínimos exigidos, relaciones existentes).
  - Comandos: `/opsx:explore datos-locales-catalogo-y-filtro` → `/opsx:propose datos-locales-catalogo-y-filtro` → `/opsx:apply datos-locales-catalogo-y-filtro` → `/opsx:archive datos-locales-catalogo-y-filtro`.
  - Paralelismo: la lógica pura, los datos iniciales y sus tests no necesitan C-01 (GATE 0, Integrante C); el script de página y el marcado de `index.html` esperan GATE 1.
- **Dependencias**: `C-01`
- **Governance**: ALTO (define el modelo y la interfaz del almacén que consumen C-04, C-05 y C-06; un cambio posterior de firma obliga a retocar tres changes)
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Entidades y §Seed data inicial
  - `knowledge-base/06_funcionalidades.md` §Épica 3 (US-006 a US-008)
  - `knowledge-base/05_reglas_de_negocio.md` §Catálogo (RN-CA)
  - `knowledge-base/08_arquitectura_propuesta.md` §Patrones aplicados y §Carga de scripts (exportación dual)
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-03, DD-04, DD-09, SU-02 y SU-03

---

### [C-04] `alta-de-libros-y-clientes`
- **Estado**: `[x]` archivado el 2026-10-16 (`openspec/changes/archive/2026-10-16-alta-de-libros-y-clientes/`)
- **Pendientes traslados a C-05 / C-06**:
  - Tarea 6.3 sin ejecutar: verificación manual de las vistas Libros y Clientes a 320 px y a 1280 px y con teclado/foco visible. C-06 debe ejecutarla y registrar el resultado (regla dura 11).
  - CM-2 y CM-3 solo se cubrieron a nivel de lógica pura (tests de `node --test`); las mitades que dependen de la venta y del historial quedan para C-05.
- **Scope**:
  - Trazabilidad: **Ejercicio 4, 15 puntos** (libros y selectores 6; clientes 4; validación y actualización 5). US-009 y US-010. Reglas: RN-LI-01 a RN-LI-11, RN-CL-01 a RN-CL-04, RN-UI-01 a RN-UI-04.
  - `js/logica/libros.js`: `validarLibro(datos, libros, catalogos)` que devuelve la lista de errores: título vacío, ISBN vacío, ISBN existente (comparado sin espacios ni guiones, sin validar dígito de control), precio no numérico o no mayor que cero, editorial inexistente, ningún autor, autor o género inexistente. Género opcional.
  - `js/logica/clientes.js`: `validarCliente(datos, clientes)`: nombre completo vacío, email vacío, formato inválido (criterio simple de estructura, SU-07 y PA-11) y email repetido (sin espacios exteriores ni distinción de mayúsculas).
  - `js/almacen.js`: implementar `agregarLibro` y `agregarCliente` con **escritura en `localStorage`** (claves `libreria.libros` y `libreria.clientes`, SU-06) e identificadores nuevos; la lectura prioriza lo guardado. Carga provisional: si la clave no existe se usan los ejemplos, y al escribir se persisten ejemplos + registro nuevo. C-06 consolida y endurece esta carga (PA-04, PA-05).
  - `js/paginas/libros.js`: selectores de editorial, género (con «Sin clasificar») y autores (selector múltiple) generados desde el almacén; envío con `preventDefault`; errores junto al formulario; alta solo si todas las comprobaciones pasan; listado actualizado sin recargar; formulario limpio y mensaje de resultado.
  - `js/paginas/clientes.js`: lo equivalente para clientes.
  - Un libro o cliente nuevo debe verse en las demás páginas al abrirlas (el Catálogo ya lo muestra por el almacén de C-03). La interpretación «sin recargar» = dentro de la página donde ocurre el alta (IN-02); se explica en el README.
  - Tests con `node --test`: un caso por cada rechazo y un alta válida, para libros y clientes (CM-2 y CM-3 a nivel de lógica).
  - Comandos: `/opsx:explore alta-de-libros-y-clientes` → `/opsx:propose alta-de-libros-y-clientes` → `/opsx:apply alta-de-libros-y-clientes` → `/opsx:archive alta-de-libros-y-clientes`.
  - Paralelismo: la lógica pura (`libros.js`, `clientes.js`) y sus tests pueden hacerse apenas exista `texto.js` de C-03; libros y clientes son independientes entre sí y pueden dividirse entre dos personas.
- **Dependencias**: `C-03`
- **Governance**: MEDIO (validaciones de negocio y primera escritura de datos del usuario; se apoya en el contrato del almacén ya fijado)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §Épica 4 (US-009, US-010)
  - `knowledge-base/05_reglas_de_negocio.md` §Libros (RN-LI), §Clientes (RN-CL) y §Formularios e interfaz (RN-UI-01 a RN-UI-04)
  - `knowledge-base/07_flujos_principales.md` §Flujo 3 y §Flujo 4
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-09, SU-06 y SU-07
  - `knowledge-base/10_preguntas_abiertas.md` IN-01, IN-02 y PA-11

---

### [C-05] `venta-simulada-e-historial`
- **Estado**: `[x]` archivado el 2026-10-16 (`openspec/changes/archive/2026-10-16-venta-simulada-e-historial/`)
- **Scope**:
  - Trazabilidad: **Ejercicio 5, 20 puntos** (composición y validaciones 8; cálculos 5; confirmación e historial inmutable 7). US-011, US-012, US-013 y US-014. Reglas: RN-VE-01 a RN-VE-15, RN-HI-01 a RN-HI-04.
  - `js/logica/ventas.js` (pura): agregar renglón con cantidad entera mayor que cero; libro repetido sin crear otro renglón (cerrar PA-06: sumar cantidad o informar el duplicado); cambiar cantidad; quitar renglón; subtotal = cantidad × precio y total = suma de subtotales, con dos decimales y sin errores de punto flotante; `validarVenta` (cliente existente, al menos un renglón, cantidades válidas); `construirVenta` con identificador, fecha ISO 8601, **copia** de los datos del cliente y renglones con copia de `titulo`, `isbn` y `precioUnitario` (DD-08).
  - `js/almacen.js`: implementar `agregarVenta` con escritura en `localStorage` (`libreria.ventas`). No se ofrece ninguna operación para editar ni eliminar ventas.
  - `js/paginas/ventas.js`: selectores de cliente y de libro generados desde el almacén (incluyen los registros creados en C-04); alta de renglones, cambio de cantidades y quitado antes de confirmar; subtotales y total en pantalla; confirmación que limpia el formulario y muestra un mensaje de resultado.
  - `js/paginas/historial.js`: listado con identificador, fecha (formato a definir, PA-10), cliente y total; detalle con renglones leídos **de la propia venta**, nunca del catálogo; sin controles de edición ni eliminación; mensaje de lista vacía.
  - Tests con `node --test`: CM-4 (cantidad cero, negativa o decimal; libro repetido) y CM-5 (2 × 1500 + 1 × 2000 = subtotales 3000 y 2000, total 5000); la venta construida no cambia al modificar después el precio del libro (base de CM-6).
  - Comandos: `/opsx:explore venta-simulada-e-historial` → `/opsx:propose venta-simulada-e-historial` → `/opsx:apply venta-simulada-e-historial` → `/opsx:archive venta-simulada-e-historial`.
  - Paralelismo: `ventas.js` (lógica pura) y sus tests pueden hacerse en GATE 3 mientras C-04 termina; `ventas.js` de página e `historial.js` pueden dividirse entre dos personas una vez fijado el formato de la venta.
- **Dependencias**: `C-04`
- **Governance**: ALTO (cálculo de importes, instantánea histórica e inmutabilidad: es la regla central del modelo y vale 20 puntos; un error rompe CM-5 y CM-6)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §Épica 5 (US-011 a US-014)
  - `knowledge-base/05_reglas_de_negocio.md` §Ventas (RN-VE) e §Historial (RN-HI)
  - `knowledge-base/04_modelo_de_datos.md` §Venta y §Renglón (regla central del precio histórico)
  - `knowledge-base/07_flujos_principales.md` §Flujo 5, §Flujo 6 y §Flujo 7
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-08 y `knowledge-base/10_preguntas_abiertas.md` PA-06, PA-10 y PA-12

---

## FASE 3 — Cierre, verificación y entrega

### [C-06] `persistencia-verificacion-y-documentacion`
- **Estado**: `[x]` archivado el 2026-10-16 (`openspec/changes/archive/2026-10-16-persistencia-verificacion-y-documentacion/`)
- **Scope**:
  - Trazabilidad: **Ejercicio 6, 10 puntos** (persistencia 4; pruebas manuales registradas 3; documentación y entrega 3). US-015, US-016 y US-017. Reglas: RN-PE-01 a RN-PE-03, RN-GL-06 a RN-GL-08.
  - `js/almacen.js`: carga inicial **consolidada**. Primer inicio carga los ejemplos; los siguientes recuperan lo guardado sin duplicar ejemplos ni ventas. Cerrar PA-04 (cómo distinguir primer inicio de un almacenamiento con una clave presente y otra ausente) y PA-05 (contenido ilegible o alterado a mano, caso que el docente provoca en CM-6) y confirmar SU-05 y SU-06.
  - Tests con `node --test` del almacén usando un almacenamiento simulado inyectado: primer inicio, segundo inicio sin duplicados, claves parciales y JSON inválido.
  - `README.md` completo: integrantes; pasos para abrir `index.html` sin npm; navegación entre vistas; funcionalidades implementadas y pendientes; ubicación de los datos iniciales; funcionamiento y límites de `localStorage` (depende del navegador, del perfil y de la ubicación de apertura; no comparte información entre usuarios); ubicación y estructura del catálogo guardado, necesarias para reproducir CM-6; procedencia de imágenes ajenas, si hay (PA-13); aclaración sobre «sin recargar» (IN-02).
  - Ejecución en navegador real y registro del **resultado observado** de CM-1 a CM-8 en el README (CM-6 sobre una copia del proyecto; CM-8 con teclado y anchos de 320 px y 1280 px). No se marca como aprobado un caso que no se ejecutó; si falla, se registra el comportamiento real (RN-GL-07).
  - Entrega: carpeta o archivo comprimido con `index.html`, demás HTML, `css/`, `js/`, `recursos/` y `README.md`, sin dependencias ni herramientas de compilación. Excluir `tests/`, `openspec/`, `knowledge-base/`, `discovery/`, `docs/`, `.atl/`, `.claude/` y los archivos de estado (PA-14). Comprobar que ninguna página usa `type="module"` ni referencias externas.
  - Comandos: `/opsx:explore persistencia-verificacion-y-documentacion` → `/opsx:propose persistencia-verificacion-y-documentacion` → `/opsx:apply persistencia-verificacion-y-documentacion` → `/opsx:archive persistencia-verificacion-y-documentacion`.
  - Paralelismo: el borrador del README puede empezar en GATE 3 y la exploración de PA-04/PA-05 en GATE 4; los casos manuales requieren C-05 terminado. Los ocho casos pueden repartirse entre los tres integrantes.
- **Dependencias**: `C-05`, `C-02`
- **Governance**: MEDIO (la carga inicial toca datos del usuario guardados y no debe sobrescribirlos ni duplicarlos; el resto es documentación y verificación)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §Épica 6 (US-015 a US-017, tabla CM-1 a CM-8)
  - `knowledge-base/04_modelo_de_datos.md` §Persistencia en `localStorage`
  - `knowledge-base/07_flujos_principales.md` §Flujo 1 y §Flujo 7
  - `knowledge-base/05_reglas_de_negocio.md` §Persistencia (RN-PE) y §Excepciones globales (RN-GL-06 a RN-GL-08)
  - `knowledge-base/10_preguntas_abiertas.md` PA-04, PA-05, PA-13 y PA-14
