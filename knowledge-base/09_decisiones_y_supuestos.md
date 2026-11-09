# Decisiones y Supuestos

## Decisiones documentadas

### DD-01 — Varias páginas HTML, una por vista
**Decisión**: cada vista (Catálogo, Libros, Clientes, Ventas, Historial) es un archivo HTML propio.
**Contexto**: la consigna permite varias páginas o secciones de una misma página.
**Alternativas consideradas**: una sola página con secciones que se muestran y ocultan.
**Justificación**: decisión del equipo; archivos HTML más cortos y una vista por archivo.
**Trade-offs aceptados**: el encabezado y la navegación se repiten en cada HTML; no hay memoria compartida entre páginas, por lo que el estado entre vistas depende por completo de `localStorage`.

### DD-02 — Alcance: TPI completo
**Decisión**: se planifican los ejercicios 1 a 6; la Etapa 1 es el primer hito.
**Contexto**: la consigna organiza el trabajo en dos etapas.
**Alternativas consideradas**: planificar solo la Etapa 1.
**Justificación**: decisión del equipo; los puntajes corresponden al TPI completo.
**Trade-offs aceptados**: mayor planificación inicial.

### DD-03 — Scripts clásicos en lugar de módulos ES
**Estado**: reemplazada por DD-16 (migración a Vite y TypeScript estricto); se conserva como historial de la serie JavaScript.
**Decisión**: los scripts se cargan con `<script src>` clásico y comparten un espacio de nombres global.
**Contexto**: la consigna exige abrir `index.html` sin npm ni servidor, es decir desde `file://`, donde los navegadores bloquean `<script type="module">`.
**Alternativas consideradas**: módulos ES servidos por un servidor local.
**Justificación**: un servidor local contradice el requisito de apertura directa.
**Trade-offs aceptados**: el orden de carga de los scripts se mantiene a mano; se requiere un patrón de exportación dual para las pruebas con Node.

### DD-04 — Pruebas automatizadas con `node --test`
**Estado**: reemplazada por DD-16 (las pruebas pasan a Vitest); se conserva como historial de la serie JavaScript.
**Decisión**: la lógica pura se prueba con el runner integrado de Node, sin dependencias.
**Contexto**: el equipo trabaja con desarrollo guiado por pruebas, pero la consigna prohíbe dependencias y herramientas de compilación en la entrega.
**Alternativas consideradas**: verificar solo con los casos manuales.
**Justificación**: decisión del equipo; obliga a separar la lógica del DOM, que la consigna valora, y da una red de seguridad sin instalar nada.
**Trade-offs aceptados**: Node es un requisito de desarrollo (no de uso); la carpeta `tests/` se excluye de la entrega; el DOM y `localStorage` quedan cubiertos solo por los casos manuales.

### DD-05 — Identidad visual con CSS propio y local
**Decisión**: estilos escritos por el equipo, sin librerías externas; tipografías e imágenes incluidas en el proyecto.
**Contexto**: restricción de la consigna y decisión explícita del equipo.
**Alternativas consideradas**: ninguna; los frameworks y CDNs incumplen el alcance técnico.
**Justificación**: requisito de la consigna.
**Trade-offs aceptados**: todo el sistema visual se construye a mano.

### DD-06 — Un change de OpenSpec por consigna
**Decisión**: en lo posible, seis changes, uno por ejercicio del TPI, cada uno recorrido con `/opsx:explore`, `/opsx:propose`, `/opsx:apply` y `/opsx:archive`.
**Contexto**: el equipo quiere que la organización SDD refleje la estructura de la consigna.
**Alternativas consideradas**: dividir por capacidad técnica (datos, vistas, persistencia).
**Justificación**: decisión del equipo; trazabilidad directa entre cada change y los puntos de la rúbrica.
**Trade-offs aceptados**: las consignas no son totalmente independientes (ver SU-01 y PA-01).

### DD-07 — Repositorio git diferido
**Decisión**: el repositorio se crea cuando exista al menos la estructura del proyecto y el `README.md`.
**Contexto**: decisión del equipo.
**Alternativas consideradas**: inicializarlo antes de la fundación.
**Justificación**: decisión del equipo.
**Trade-offs aceptados**: los artefactos de fundación no tienen historial hasta ese momento.

### DD-08 — La venta guarda una instantánea
**Decisión**: la venta copia los datos del cliente y, en cada renglón, título, ISBN y precio unitario.
**Contexto**: la consigna exige que el precio unitario sea un valor histórico y que se conserven los datos descriptivos necesarios para leer la venta.
**Alternativas consideradas**: guardar solo identificadores y resolver contra el catálogo.
**Justificación**: resolver contra el catálogo rompe el caso manual CM-6.
**Trade-offs aceptados**: datos duplicados dentro de cada venta.

### DD-09 — Escritura en `localStorage` adelantada al ejercicio 4
**Decisión**: el change del ejercicio 3 crea el Almacén de datos con una interfaz estable; el change del ejercicio 4 ya escribe libros y clientes en `localStorage`, y el del ejercicio 5 escribe las ventas. El change del ejercicio 6 se ocupa de la carga inicial sin duplicados, la documentación y los casos manuales.
**Contexto**: con varias páginas (DD-01) no hay memoria compartida, y la consigna ubica `localStorage` en la etapa final (IN-01 en `10_preguntas_abiertas.md`).
**Alternativas consideradas**: dejar toda la persistencia para el ejercicio 6.
**Justificación**: sin escritura, un libro o cliente nuevo no aparece en las demás páginas y los ejercicios 4 y 5 no se pueden comprobar de extremo a extremo.
**Trade-offs aceptados**: el orden se aparta levemente del de la consigna; el change 6 queda más chico y los changes 4 y 5 algo más grandes.

### DD-10 — `index.html` es el Catálogo
**Decisión**: la página de entrada muestra directamente la vista Catálogo, sin portada.
**Contexto**: la consigna fija `index.html` como entrada sin indicar qué vista contiene (PA-09, SU-04).
**Alternativas consideradas**: una portada con enlaces a las vistas.
**Justificación**: una portada sería una sexta pantalla que la consigna no pide.
**Trade-offs aceptados**: ninguno relevante.
**Origen**: change `estructura-y-pantallas-html`, decisión D2.

### DD-11 — Detalle de la venta en la misma página de Historial
**Decisión**: `historial.html` incluye una región de detalle que JavaScript completa al pedir el detalle de una venta.
**Contexto**: PA-12.
**Alternativas consideradas**: `<details>` por venta; página aparte con parámetro en la dirección.
**Justificación**: `<details>` no convive bien dentro de una tabla y una página aparte agrega un sexto HTML con navegación duplicada.
**Trade-offs aceptados**: el detalle no tiene dirección propia.
**Origen**: change `estructura-y-pantallas-html`, decisión D5.

### DD-12 — Catálogo en tarjetas, tablas para los listados de gestión
**Decisión**: el Catálogo muestra una tarjeta por libro; Libros, Clientes, renglones de Ventas e Historial usan tablas.
**Contexto**: Catálogo y Libros muestran los mismos datos de los libros.
**Alternativas consideradas**: tabla en ambas vistas.
**Justificación**: distingue la vista de consulta de la de gestión y evita una tabla de seis columnas a 320 px.
**Trade-offs aceptados**: dos presentaciones distintas de los mismos datos.
**Origen**: change `estructura-y-pantallas-html`, decisión D3.

### DD-13 — Plantillas `<template>` y vocabulario de enganches
**Decisión**: cada tarjeta o fila generada por JavaScript tiene una `<template>` en el HTML; JavaScript la clona y completa con `textContent`. Los enganches de JavaScript son `id`, `data-campo` y `data-accion`; las clases son solo para CSS; el atributo `hidden` es el único mecanismo para mostrar u ocultar estados.
**Contexto**: tres personas trabajan en paralelo sobre el mismo marcado.
**Alternativas consideradas**: crear los nodos con `document.createElement` en cada script; usar clases como enganche de JavaScript.
**Justificación**: la forma del marcado queda en el HTML, se evita `innerHTML` y el CSS puede cambiar clases sin romper el JavaScript.
**Trade-offs aceptados**: renombrar un `id` o un `data-*` obliga a coordinar entre changes.
**Origen**: change `estructura-y-pantallas-html`, decisiones D4 y D9.

### DD-14 — Autores con casillas y formularios con `novalidate`
**Decisión**: los autores se eligen con una casilla por autor dentro de un `fieldset`; los formularios llevan `novalidate` y JavaScript controla la validación y los mensajes.
**Contexto**: la consigna admite selector múltiple o controles equivalentes y exige errores cerca del formulario.
**Alternativas consideradas**: `select multiple`; validación nativa del navegador.
**Justificación**: las casillas son más usables con teclado y en teléfono; los avisos nativos varían entre navegadores y no quedan junto al campo.
**Trade-offs aceptados**: toda la validación debe escribirse en JavaScript.
**Origen**: change `estructura-y-pantallas-html`, decisiones D6 y D7.

### DD-15 — Identidad visual: paleta «verde biblioteca + crema» y tipografía del sistema
**Decisión**: la identidad visual usa la paleta verde bosque `#2f5d3a` / dorado `#8f6210` / crema `#faf7ef` / error `#93201a`, en modo claro solamente; la tipografía es la pila del sistema (con la monoespaciada del sistema para ISBN e importes, mediante selectores sobre `data-campo`); todo se declara como variables CSS en `css/base.css` y las hojas de disposición y componentes solo consumen esas variables.
**Contexto**: PA-03 pedía paleta y tipografía locales; la consigna prohíbe librerías, CDNs y recursos externos, y el proyecto se abre desde `file://`.
**Alternativas consideradas**: acento dorado más claro (`#c9971f`); `@font-face` con WOFF2 descargado; valores sueltos por componente en lugar de variables.
**Justificación**: el verde profundo y el crema evocan «biblioteca» y todos los pares texto/fondo alcanzan ≥ 4,5:1 de contraste (verificados con la fórmula WCAG); la pila del sistema es local por definición, sin binarios en la entrega; con variables, un ajuste de paleta es un solo cambio y las tres hojas quedan coherentes por construcción.
**Trade-offs aceptados**: no hay modo oscuro; los navegadores muy viejos muestran una tipografía del sistema distinta aunque siempre legible.
**Origen**: change `presentacion-css-y-uso-adaptable`, decisiones D1, D2 y D3.

### DD-16 — Migración a Vite y TypeScript estricto
**Decisión**: el frontend se construye con Vite 7 y TypeScript estricto (`strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`), módulos ES, la estructura de carpetas del repositorio base `chiro45/proteger_rutas` (`src/pages/{auth,admin,client}/`, `src/main.ts`, `src/types/`, `src/utils/`) y pruebas con Vitest. Reemplaza a DD-03 y DD-04.
**Contexto**: el TPI de TypeScript exige Vite, tipos específicos en todo el proyecto y la estructura del repositorio base; la serie JavaScript usaba scripts clásicos abiertos desde `file://` y `node --test`.
**Alternativas consideradas**: mantener JavaScript clásico (incumple la consigna); pnpm como gestor (otro instalador sin beneficio para el TPI); TypeScript 5.9 o superior (el repositorio base fija `~5.8.3`); `node --test` con la eliminación de tipos nativa de Node (no resuelve `import.meta.env` ni las importaciones sin extensión del modo *bundler*).
**Justificación**: cumple la consigna y el compilador estricto detecta en la compilación los desajustes entre las vistas y la forma de los datos.
**Trade-offs aceptados**: el proyecto requiere Node (20.19+ o 22.12+) y npm; deja de abrirse con doble clic desde `file://`; lo guardado en `localStorage` desde `file://` no se ve desde `http://localhost` (otro origen).
**Origen**: change `migracion-vite-typescript`, decisiones D1, D2, D4 y D9.

### DD-17 — La API de producción es intocable y es la fuente de los datos de negocio
**Decisión**: los datos de negocio (libros, clientes, ventas, editoriales, géneros) provienen de la API desplegada en `https://api.ismaelsuarez.me`, que no se modifica ni se redespliega; todo ajuste se hace en el frontend.
**Contexto**: el backend está en producción y el equipo no puede tocarlo; la consigna pide consumirlo.
**Alternativas consideradas**: ajustar la API a las necesidades del frontend (descartada: no es posible).
**Justificación**: la forma de los datos del frontend se alinea con los DTO de la API (identificadores enteros, importes como texto decimal, fechas ISO, relaciones anidadas) para que el cliente HTTP tipe el JSON sin capa de traducción.
**Trade-offs aceptados**: la API no ofrece `GET /clientes/`, `GET /autores/` ni actualización del perfil, y `LibroRead` no incluye autores; los changes `cliente-http-y-catalogo` y `operaciones-contra-api` deben resolverlo en el cliente. Hasta entonces el almacén local implementa los repositorios.
**Origen**: change `migracion-vite-typescript`, propuesta y decisiones D5 y D6.

### DD-18 — Base `/api` del mismo origen con reenvío
**Decisión**: el navegador solo llama a la base relativa `/api` (`VITE_API_BASE`, por defecto `/api`); en desarrollo y en la vista previa, Vite reenvía `/api` a `API_PROXY_TARGET` (por defecto `https://api.ismaelsuarez.me`) quitando el prefijo; en producción lo hace el contenedor del frontend (change `despliegue-frontend`).
**Contexto**: la API no envía cabeceras CORS y no se puede tocar.
**Alternativas consideradas**: llamar a la API desde otro origen (bloqueado por el navegador); dejar el destino en una variable `VITE_*` (llegaría al código del navegador).
**Justificación**: una convención única para todos los entornos; `API_PROXY_TARGET` es solo de servidor y no queda en la compilación.
**Trade-offs aceptados**: sin el reenvío (por ejemplo, abriendo `dist/` con un servidor estático simple) las llamadas a la API fallan.
**Origen**: change `migracion-vite-typescript`, decisión D10.

### DD-19 — Autenticación y roles solo en el cliente (limitación conocida)
**Decisión**: la API de producción no ofrece autenticación; los usuarios, la sesión y los roles (`client`, `admin`) viven en el `localStorage` del navegador y la protección de rutas se decide por la zona de la dirección (`/admin/`, `/client/`).
**Contexto**: la consigna pide login, registro y protección de rutas por rol en el frontend; el backend no se puede modificar.
**Alternativas consideradas**: autenticación en el servidor (no es posible).
**Justificación**: cumple la consigna con lo que el frontend puede hacer.
**Trade-offs aceptados**: la API queda abierta; quien conozca su dirección puede llamarla sin sesión. Se documenta como limitación conocida y no es una medida de seguridad real.
**Origen**: change `migracion-vite-typescript`, decisiones D3 y D13; el registro, el login y la sesión se implementan en `registro-login-y-sesion` (DD-21 y DD-22) y la protección de rutas en `proteccion-de-rutas-y-roles` (DD-25).

### DD-20 — Frontera de repositorios con la forma de la API
**Decisión**: las vistas acceden a los datos solo por interfaces de repositorio asíncronas (`src/datos/repositorios.ts`) tipadas con los tipos de dominio alineados con la API; `src/datos/proveedor.ts` es la raíz de composición. Hoy los implementa un adaptador sobre el almacén local (mismas claves y formato de `localStorage`) que traduce entre la forma local y la de la API.
**Contexto**: los changes siguientes reemplazan el origen de los datos por la API; las vistas no deben reescribirse en cada reemplazo.
**Alternativas consideradas**: vistas tipadas con la forma local (`lib-01`, `nombreCompleto`, precio numérico) y reformadas después (obliga a reescribir cada vista dos veces).
**Justificación**: un solo modelo de datos en las vistas durante toda la serie; el reemplazo se limita a `proveedor.ts` y a los adaptadores.
**Trade-offs aceptados**: el adaptador local fija datos de transición (`stock: 0`, `rol: "autor"`, `pais` y `nacionalidad` ficticios) que no se muestran ni se persisten; las operaciones sin endpoint en la API (listado de clientes y de autores, edición del teléfono) se marcan en la interfaz.
**Origen**: change `migracion-vite-typescript`, decisiones D6 y D7.

### DD-21 — Contraseña protegida con PBKDF2-SHA-256 y sal
**Decisión**: la contraseña se guarda en `users` solo como una huella PBKDF2-SHA-256 de la Web Crypto API (100 000 iteraciones, sal aleatoria de 16 bytes por usuario, huella de 32 bytes, ambas en hexadecimal) junto con el algoritmo y los parámetros; nunca en texto plano. El administrador de demostración (`admin@libreria.test`) se siembra con su huella precalculada y su contraseña figura solo en el README.
**Contexto**: la consigna pide guardar los usuarios en `localStorage` y comparar email y contraseña; no exige texto plano, y `localStorage` es legible por quien tenga acceso al navegador. El usuario aceptó esta recomendación el 2026-11-09.
**Alternativas consideradas**: texto plano (lo más simple, expone contraseñas reutilizadas); SHA-256 con sal (una sola pasada, rápido de forzar).
**Justificación**: es la derivación nativa del navegador (bcrypt y argon2 requieren una librería, prohibida por la regla dura 1) y su costo es ajustable.
**Trade-offs aceptados**: `crypto.subtle` solo existe en contextos seguros (`localhost` o HTTPS); no es seguridad real, porque `userData` es editable. Verificar tarda decenas de milisegundos.
**Origen**: change `registro-login-y-sesion`, decisión D1.

### DD-22 — Almacén de usuarios separado y regla dura 7 reformulada
**Decisión**: los usuarios y la sesión los guarda `src/datos/local/almacen-usuarios.ts`, que recibe el almacenamiento inyectado, y no el almacén local. La regla dura 7 pasa a decir que `almacen-local.ts` es el único archivo que nombra `localStorage` y que los almacenes de `src/datos/local/` lo reciben inyectado.
**Contexto**: el almacén local es transitorio (lo reemplaza la API); los usuarios y la sesión se quedan en el navegador para siempre.
**Alternativas consideradas**: sumar usuarios y sesión a `almacen-local.ts` (cumple la letra de la regla, pero acopla datos permanentes a un adaptador que se retira).
**Justificación**: el sentido de la regla (un único punto de acceso al almacenamiento y almacenes probables con un almacenamiento simulado) se conserva.
**Trade-offs aceptados**: sin almacenamiento no hay reserva en memoria para la sesión; el registro y el ingreso muestran un error en lugar de fingir una sesión que se perdería al navegar.
**Origen**: change `registro-login-y-sesion`, decisión D3.

### DD-23 — Orígenes de datos durante la transición: Catálogo sobre la API, gestión local
**Decisión**: hasta `operaciones-contra-api`, la vista Catálogo lee los libros de la API de producción por `repositorioCatalogo` (solo lectura, `proveedor.ts`) y Libros, Clientes, Ventas e Historial siguen sobre el almacén local, de modo que cada vista tenga un único origen coherente. Un libro dado de alta en Libros no aparece en el Catálogo. No se agrega aviso en la interfaz: se documenta en el README y en los casos manuales.
**Contexto**: las vistas de gestión escriben y sus identificadores (`lib-01`, 1…) no coinciden con los de la API; cambiar todos los repositorios de lectura juntos habría dejado a Ventas confirmando contra libros locales con números de la API. El usuario aceptó esta recomendación el 2026-11-09.
**Alternativas consideradas**: dejar `proveedor.ts` local hasta `operaciones-contra-api` (sin divergencia, pero el Catálogo no leería la API en esta entrega); repositorio de libros mixto (lectura HTTP, alta local); decidir el origen por la zona de la dirección dentro de `proveedor.ts`.
**Justificación**: la API es la fuente de los datos de negocio y el Catálogo es solo de lectura; el resto se conecta cuando existan las escrituras.
**Trade-offs aceptados**: divergencia visible entre el Catálogo (producción) y la gestión (ejemplos locales) hasta `operaciones-contra-api`; sin la API el Catálogo informa el error y no muestra datos de otro origen.
**Origen**: change `cliente-http-y-catalogo`, decisiones D5 y D6.

### DD-24 — Autores por detalle con concurrencia acotada y errores de la API como `ErrorDeApi`
**Decisión**: como `GET /libros/` no trae autores, el listado de libros sobre la API se completa con `GET /libros/{id}` con a lo sumo 4 consultas simultáneas; si una falla, el listado se rechaza. Toda falla del cliente HTTP es un `ErrorDeApi` con mensaje en texto y tiempo límite de 10 s por solicitud; el filtro por título del Catálogo sigue siendo local.
**Contexto**: la tarjeta del Catálogo muestra los autores y el tipo `LibroDetalle` no admite autores ausentes. El usuario aceptó esta recomendación el 2026-11-09.
**Alternativas consideradas**: cargar los autores solo al abrir la ficha o quitarlos de la tarjeta (cambian la especificación del Catálogo); `GET /autores/{id}/libros` (no hay `GET /autores/`); validar cada DTO en tiempo de ejecución (mucho código sin beneficio con fixtures reales).
**Justificación**: conserva el comportamiento visible con `1 + n` solicitudes (hoy 6); un catálogo con autores faltantes sería engañoso.
**Trade-offs aceptados**: `1 + n` solicitudes por apertura del Catálogo (si el catálogo crece, la alternativa es cargar los autores en la ficha); el parámetro `titulo` del servidor (que interpreta `%` y `_` como comodines) queda soportado pero sin uso en las vistas.
**Origen**: change `cliente-http-y-catalogo`, decisiones D1 a D4, D7 y D8.

### DD-25 — Protección de rutas por zona y sesión cotejada con `users`
**Decisión**: cada página decide su acceso al cargar, en `src/main.ts`, según la zona de su dirección (`auth`, `client`, `admin`) y la sesión vigente. La sesión vale solo si `userData` coincide con un usuario de `users` con el mismo email y rol (`sesionVigente`); la decisión es una función pura (`decidirAcceso`). Sin sesión, `client` y `admin` redirigen al login; un `client` en una página `admin` va al Catálogo, sin mensaje; el `admin` abre ambas zonas.
**Contexto**: la consigna pide una función en `src/main.ts` que intercepte la carga y redirija «al login o a su zona permitida». El usuario aprobó el cotejo con `users` y el destino Catálogo el 2026-11-09.
**Alternativas consideradas**: confiar en `userData.role`, como el repositorio base (más simple, deja abierta la falsificación de un solo campo); firmar `userData` (la clave viviría en el mismo navegador); redirigir al `client` al login (dos saltos y sugiere que perdió la sesión).
**Justificación**: el cotejo cierra la falsificación más obvia sin costo de red y se prueba con Vitest; el destino por rol es el mismo que recibe al iniciar sesión.
**Trade-offs aceptados**: sigue siendo del cliente: quien edite `userData` puede editar también el rol de su entrada en `users`, y las credenciales del administrador de demostración están en el README; no es una medida de seguridad real. Si `users` es ilegible, `obtenerUsuarios()` devuelve la semilla y solo la sesión del administrador sembrado sigue valiendo (falla cerrado). La decisión se repite al cargar y al restaurar desde la caché de ida y vuelta, no en vivo ante un cierre de sesión en otra pestaña.
**Origen**: change `proteccion-de-rutas-y-roles`, decisiones D1 a D4 y D8.

## Supuestos inferidos

### SU-01 — Cada consigna equivale a un change autocontenido
**Supuesto**: los seis ejercicios pueden implementarse como seis changes en orden.
**Origen**: decisión DD-06.
**Riesgo si es falso**: el ejercicio 1 debe contemplar campos y estados que usan los ejercicios 3 a 5; el ejercicio 6 atraviesa a los anteriores. Puede haber retrabajo.
**Cómo validar**: revisar dependencias al generar `CHANGES.md` y en el explore de cada change.

### SU-02 — Nombres de propiedades del modelo
**Supuesto**: las propiedades propuestas en `04_modelo_de_datos.md` (`titulo`, `editorialId`, `autorIds`, `precioUnitario`, etc.) son aceptables.
**Origen**: la consigna define entidades y relaciones, no nombres de propiedades.
**Riesgo si es falso**: bajo; se renombran antes de escribir datos persistidos.
**Cómo validar**: confirmar en el change del ejercicio 3.

### SU-03 — Formato de los identificadores
**Supuesto**: identificadores de texto generados localmente, estables una vez asignados.
**Origen**: la consigna pide «identificadores estables» sin fijar formato.
**Riesgo si es falso**: bajo. Riesgo técnico: `crypto.randomUUID` requiere contexto seguro y puede no estar disponible bajo `file://`; conviene un esquema que no dependa de él.
**Cómo validar**: decidir el esquema en el change del ejercicio 3.

### SU-04 — `index.html` muestra el Catálogo (confirmado, ver DD-10)
**Supuesto**: la página de entrada es la vista Catálogo.
**Origen**: la consigna fija `index.html` como entrada sin indicar qué vista contiene; el Catálogo es la primera vista listada.
**Riesgo si es falso**: bajo; alternativa: una portada con enlaces.
**Cómo validar**: confirmar en el change del ejercicio 1.

### SU-05 — Editoriales, géneros y autores no se persisten
**Supuesto**: permanecen como datos iniciales en el código y no se guardan en `localStorage`.
**Origen**: la consigna indica conservar «libros, clientes y ventas» y excluye el ABM de las otras entidades.
**Riesgo si es falso**: bajo.
**Cómo validar**: confirmar en el change del ejercicio 6.

### SU-06 — Claves de `localStorage`
**Supuesto**: tres claves separadas (`libreria.libros`, `libreria.clientes`, `libreria.ventas`).
**Origen**: propuesta del equipo; la consigna solo exige documentar ubicación y estructura del catálogo guardado.
**Riesgo si es falso**: bajo, mientras se documente en el README.
**Cómo validar**: confirmar en el change del ejercicio 6.

### SU-07 — Formato de email
**Supuesto**: «formato válido» se verifica con una comprobación simple de estructura (texto, arroba, dominio con punto).
**Origen**: la consigna no define el criterio.
**Riesgo si es falso**: bajo; el caso manual CM-3 solo exige rechazar un email inválido.
**Cómo validar**: confirmar en el change del ejercicio 4.

### SU-08 — Node disponible en las máquinas del equipo
**Supuesto**: los tres integrantes pueden ejecutar `node --test`.
**Origen**: decisión DD-04. A partir de DD-16 Node 20.19+ o 22.12+ es requisito para ejecutar el proyecto (no solo las pruebas).
**Riesgo si es falso**: quien no tenga Node no puede correr las pruebas automatizadas, aunque sí usar el proyecto.
**Cómo validar**: comprobar la versión de Node de cada integrante.
