# Design

## Context

Ver [proposal.md](proposal.md) para la motivación. Se requiere diseño porque el change agrega las primeras escrituras contra un sistema externo que no se puede restaurar, cambia el origen de datos de cuatro vistas, retira un formato persistido y debe resolver operaciones que la API no ofrece.

Estado de partida (rama `feat/operaciones-contra-api`, desde la punta de T-04):

- Frontera (`src/datos/repositorios.ts`): `RepositorioLibros` (`listar`, `obtener`, `crear`), `RepositorioEditoriales`, `RepositorioGeneros`, `RepositorioAutores.listar` («sin endpoint»), `RepositorioClientes` (`listar` «sin endpoint», `obtener`, `crear`, `crearPerfil`, `actualizar`, `actualizarTelefono` «sin endpoint») y `RepositorioVentas` (`listar`, `crear`). `proveedor.ts` crea todo sobre el almacén local salvo `repositorioCatalogo` (API, solo lectura).
- Cliente HTTP (`src/datos/api/cliente-http.ts`): solo `obtener` (`GET`), tiempo límite de 10 s, `ErrorDeApi` con `tipo` y `estado`; `interpretarCuerpoDeError` ya convierte el 422 en `ErrorDeCampo[]`. Paginación (`recorrerPaginas`) y concurrencia (`mapearConLimite`) reutilizables.
- Vistas: Libros relee `listar()` de libros, editoriales, géneros y autores en cada envío; Ventas llama `repositorioLibros.listar()` en cada agregado, cambio y quita de renglón (con la API serían `1 + n` solicitudes por acción); Clientes tiene, fuera de las specs, un teléfono obligatorio y un diálogo de edición (nombre, email, teléfono) agregados por el equipo; Historial ya tolera renglones sin ISBN.
- `vite.config.ts`: `server.proxy` y `preview.proxy` reenvían la base a `API_PROXY_TARGET` o, por defecto, a `https://api.ismaelsuarez.me`. Hoy `npm run dev` puede alcanzar producción con cualquier método.

Contrato de la API, leído del árbol desplegado del backend (`despliegue/app/`, coincide con el OpenAPI en vivo):

| Hecho | Evidencia |
|---|---|
| `POST /ventas/` copia `libro.precio` en `precio_unitario` y acumula el total; no toca `stock` | `ventas/service.py:41-47`, `ventas/models.py:47` |
| El subtotal se calcula al leer (`precio_unitario × cantidad`) | `ventas/schemas.py:37-40` |
| El renglón devuelve el `titulo` **actual** del libro y el cliente **actual** (por relación), sin ISBN | `ventas/service.py:109-117` |
| Libro inexistente en la venta → 409 «No se pudo registrar la venta: cliente o libros invalidos»; cliente inexistente → 409 por clave foránea | `ventas/service.py:36-40`, `:52-55`; `core/errors.py:9-18` |
| Libro repetido en la venta o campos extra → 422 | `ventas/schemas.py:10-28` (`extra="forbid"`, `sin_libros_repetidos`) |
| `GET /ventas/` pagina con `limit` 1–100 (20 por defecto), ordena por `id` | `ventas/router.py:47-54`, `ventas/service.py:59-71` |
| Email repetido → 409 «Ya existe un cliente con ese email» (comparación exacta) | `clientes/service.py:16-21`, `clientes/models.py:26-28` |
| Perfil: alta única, 409 «El cliente ya tiene un perfil»; 404 si el cliente no existe; no hay actualización | `clientes/service.py:52-68`, `clientes/router.py:47-54` |
| No hay `GET /clientes/` ni `GET /autores/`; sí `GET /clientes/{id}`, `GET /autores/{id}` y `GET /clientes/{id}/ventas` | `clientes/router.py`, `autores/router.py`; OpenAPI en vivo |
| No hay ningún `DELETE` en la API | routers de `despliegue/app/modules/*` |
| `LibroCreate`: `stock ≥ 0` y `precio > 0` obligatorios; rol en `autor`, `coautor`, `traductor`, `ilustrador`; `orden ≥ 1`; ISBN repetido, editorial, género o autor inexistentes → 409 con un único mensaje genérico | `libros/schemas.py:13-26`, `libros/service.py:29-47` |
| Longitudes y precisión solo en la base (no en los esquemas): `isbn` 20, `titulo` 200, `nombre` 100, `email` 255, `telefono` 30, `direccion` 255, `precio` `numeric(10,2)`; un exceso produce un error de datos no capturado (500) | `migrations/versions/846f445b2248_*.py:30-85`, `libros/models.py:24-27` |
| Base PostgreSQL con identificadores secuenciales; la siembra vacía las tablas con `RESTART IDENTITY` | `DEPLOY.md`, `seed.py:25-29` |
| Datos de producción sembrados: 3 editoriales, 3 géneros, 5 autores, 5 libros, 3 clientes (1 con perfil), 2 ventas iniciales | `DEPLOY.md` (paso 7), `seed.py` |

## Goals / Non-Goals

**Goals:**

- Altas, listados y venta contra la API sin cambiar la frontera que usan las vistas más que lo necesario.
- Ninguna escritura en producción desde desarrollo, previsualización ni pruebas, garantizada por construcción y no por disciplina.
- Errores comprensibles y sin duplicados accidentales en operaciones no idempotentes.

**Non-Goals:**

- Modificar el backend; crear o editar autores, editoriales o géneros; editar o borrar libros y ventas; gestionar stock.
- Caché entre páginas o sincronización entre pestañas.
- El proxy de producción y el contenedor (`despliegue-frontend`).

## Decisions

### D1 — Cliente HTTP con envío JSON acotado

`crearClienteHttp` suma `enviar(metodo: "POST", ruta, cuerpo): Promise<unknown>` (el tipo se amplía a `"POST" | "PATCH"` solo si se aprueba la alternativa de D7). Comparte con `obtener` la dirección, el tiempo límite, la interpretación de errores y la exigencia de JSON; agrega `Content-Type: application/json` y `body: JSON.stringify(cuerpo)`. Cuando una escritura no obtiene respuesta (`tipo` `red` o `tiempo`), el `ErrorDeApi` lleva `resultadoIncierto: true` y el mensaje fijo «No se pudo confirmar si el servidor registró la operación. Revisá los datos antes de reintentar.». No hay reintentos en ningún método.

Alternativas: un `solicitar(metodo, …)` genérico (dejaría `DELETE` y `PUT` a un paso); un cliente de escritura separado (duplicaría tiempo límite y errores).

### D2 — Adaptadores y frontera

`crearRepositoriosApi(cliente)` pasa a entregar `Repositorios` completo:

- `libros.crear` → `POST /libros/` con `precio` como texto con dos decimales (redondeo al centavo con la regla existente de `src/logica/dinero.ts`, mitades hacia arriba).
- `clientes.obtener` → `GET /clientes/{id}`; `clientes.crear` → `POST /clientes/`; `clientes.crearPerfil` → `POST /clientes/{id}/perfil`; `clientes.listar` y `autores.listar` → sondeo (D5).
- `ventas.listar` → `recorrerPaginas` sobre `GET /ventas/` (sin esto solo llegarían 20); `ventas.crear` → `POST /ventas/` con `{ cliente_id, renglones: [{ libro_id, cantidad }] }`.
- Se quitan de `RepositorioClientes` las operaciones sin endpoint que no se implementan: `actualizarTelefono` y, si se aprueba la recomendación de D7, `actualizar`. Se quita `Renglon.isbn?` de `src/types/venta.ts` (dato de transición del adaptador local).

Las respuestas se estrechan como hoy (`comoObjeto`, `comoArreglo`), con fixtures nuevos copiados de los esquemas desplegados y declarados con `satisfies`.

### D3 — Errores de la API en los formularios

Función pura `erroresDeFormulario(error, mapaDeCampos)` (en `src/logica/`): convierte los `ErrorDeCampo` del 422 a los nombres de los controles (`editorial_id` → `editorial`, `genero_id` → `genero`, `autores`/`autor_id`/`rol`/`orden` → `autores`, `cliente_id` → `cliente`, `libro_id`/`cantidad` → `renglones`; los demás, igual). Reglas de 409:

- `POST /clientes/` → junto al email: el único conflicto posible de ese alta es el email único (`clientes/service.py:19`).
- `POST /libros/` y `POST /ventas/` → error de la operación con el `detail` del servidor: su mensaje no distingue la causa (`libros/service.py:44`, `ventas/service.py:39`).

La validación local previa (ISBN y email contra los listados de la API, existencia de editorial, género, autores, cliente y libros, límites de D10) hace que estos rechazos sean raros; quedan para carreras con otro operador.

### D4 — Composición: todo sobre la API

`proveedor.ts` crea un único cliente HTTP y exporta todos los repositorios sobre la API (`repositorioCatalogo` pasa a ser `repositorios.libros`, con la interfaz de lectura). El servicio de autenticación sigue sobre `almacen-usuarios`. Crear los repositorios sigue sin hacer solicitudes.

### D5 — Listado de clientes y autores por sondeo (requiere aprobación)

`sondearPorIdentificador(obtener, { conocidos, hueco = 10, concurrencia = 4 })` en `src/datos/api/paginacion.ts`: pide los identificadores 1, 2, 3… en tandas de 4; un 404 cuenta como ausente, cualquier otra falla rechaza todo el listado; se detiene cuando acumula 10 ausentes seguidos y ya pasó el mayor identificador de `conocidos`. Entrega los encontrados en orden de identificador.

- Clientes: `conocidos` = identificadores de cliente de todas las ventas (`GET /ventas/`, que Ventas e Historial ya necesitan).
- Autores: `conocidos` = `autor_id` de los detalles de libros (el listado de libros ya los trae).

Por qué es correcto en la práctica: la API no tiene `DELETE`, así que los huecos de identificadores solo nacen de altas fallidas (PostgreSQL consume el valor de la secuencia aunque la inserción se revierta). La validación local de email repetido evita la mayoría de esas fallas en clientes, y la aplicación no crea autores. Costo actual: 3 clientes → 13 consultas; 5 autores → 15; crece en `n + 10`, con a lo sumo 4 en curso y 10 s de tiempo límite cada una.

Alternativas: solo clientes con ventas (un cliente recién creado no podría venderse: descartada); índice local de identificadores creados por esta aplicación (vuelve a guardar datos de negocio en el navegador, no ve los creados desde otro navegador ni los sembrados: descartada); recorrer `GET /clientes/{id}/ventas` (no lista clientes: no aplica); pedir el identificador a mano en Ventas (inusable). Riesgo aceptado: más de 10 altas fallidas seguidas sin un alta exitosa posterior ocultarían a los clientes siguientes hasta que una venta los mencione; queda documentado y la constante es ajustable.

### D6 — Perfil de una sola vez y alta en dos escrituras (requiere aprobación)

- Alta: `crear` y, solo si responde 201, `crearPerfil({ telefono, direccion })`. Si el perfil falla (rechazo o resultado incierto), el cliente ya existe: se informa «El cliente se registró, pero no se pudo guardar su teléfono y dirección: <motivo>. Podés completarlos con «Completar perfil».», se relee el listado y no se repite ningún `POST`.
- Listado: teléfono y dirección como texto («—» si faltan). Cliente con perfil: sin controles para cambiarlos. Cliente sin perfil: botón «Completar perfil de <nombre>» que abre el diálogo existente (reutilizado) con teléfono y dirección; un 409 «El cliente ya tiene un perfil» se muestra y se relee el listado.
- Reglas: el teléfono sigue obligatorio con la validación existente (7 a 15 dígitos) más el máximo de 30 caracteres; la dirección es opcional (supuesto: la API la admite vacía y nadie pidió exigirla), hasta 255 caracteres, y vacía se envía como `null`.

Alternativa: sin recuperación (el cliente queda sin perfil para siempre); o crear el perfil antes de anunciar nada y, si falla, «deshacer» (imposible: no hay `DELETE`).

### D7 — Edición de clientes existente (requiere aprobación)

Recomendación: retirar el diálogo de edición de nombre, email y teléfono. Motivos: contradice la regla dura 9 y RN-CL-05; el teléfono no se puede editar en la API; y con la API cada `PATCH` modificaría registros de producción que no se pueden restaurar, incluidos clientes que figuran en la evidencia de ventas del backend. El diálogo queda solo para «Completar perfil» (D6).

Alternativa: conservar la edición de nombre y email con `PATCH /clientes/{id}` (comprobación de email repetido excluyendo al propio cliente, 409 junto al email) y teléfono y dirección de solo lectura. Exige ampliar `enviar` a `PATCH` (D1) y cambiar la spec `clientes` (requisito «Clientes no modificables»).

### D8 — Stock: se captura y no se gestiona

El formulario de Libros pide `stock` (entero de 0 a 2 147 483 647, sin valor por defecto) porque la API lo exige. No se muestra en los listados ni se valida en la venta: el servidor no lo descuenta (`ventas/service.py`), así que el número quedaría fijo y cualquier validación sería engañosa; la regla dura 9 y RN-VE-16 excluyen la gestión de stock. Alternativas: mostrar una columna «Stock» en Libros (informativa, pero sugeriría un inventario que nadie actualiza); impedir vender más que el stock (bloquearía ventas de forma arbitraria). El README documenta la limitación.

### D9 — Protección de producción en desarrollo y verificación (requiere aprobación)

Tres capas, ninguna dependiente de la disciplina de quien desarrolla:

1. **Guarda en el reenvío**: función pura `debeRechazarEscritura(metodo, destino)` (en `src/datos/api/reenvio.ts`, con pruebas; ninguna página la importa, así que no entra en la compilación) que es verdadera si el método no es `GET`, `HEAD` ni `OPTIONS` y el anfitrión del destino es `api.ismaelsuarez.me`. `vite.config.ts` agrega un complemento con `configureServer` y `configurePreviewServer` que registra un intermediario **antes** del reenvío: si la guarda da verdadero, responde `403` con `{"detail": "El servidor de desarrollo no reenvía escrituras a la API de producción. Usá un backend local con API_PROXY_TARGET."}` sin reenviar. No hay variable para desactivarla: desde desarrollo nunca se escribe en producción. Las lecturas siguen yendo a producción por defecto (el Catálogo y los casos CM-A siguen funcionando sin Docker).
2. **Backend local para toda verificación con escrituras**: el README documenta cómo levantar, desde un clon del repositorio del backend, PostgreSQL 17 y la imagen construida desde `despliegue/` (el mismo `Dockerfile` y las mismas migraciones que producción) en una red de Docker local, sembrar con `python seed.py` dentro de ese contenedor local (vacía y recarga solo esa base) y arrancar el frontend con `API_PROXY_TARGET=http://127.0.0.1:8000`. Antes de cualquier escritura manual se comprueba `GET /api/health/ready` y que `API_PROXY_TARGET` apunte a `127.0.0.1`. Se descarta SQLite: el árbol desplegado solo instala `asyncpg` y SQLite no aplicaría las claves foráneas que producen los 409 de producción.
3. **Pruebas sin red**: además de las solicitudes inyectadas, un archivo de preparación de Vitest reemplaza el `fetch` global por uno que rechaza, de modo que una prueba que olvide inyectar falla en vez de salir a la red.

La aplicación desplegada (T-06) no usa `vite`: su proxy reenvía escrituras a producción cuando la opera el bibliotecario, que es el uso legítimo.

Alternativas: cambiar el destino por defecto a `http://127.0.0.1:8000` (seguro, pero el Catálogo dejaría de funcionar en desarrollo sin Docker y cambiaría el flujo documentado); permitir escrituras a producción con una variable explícita (abre la puerta que se quiere cerrar; si alguna vez hace falta, se decide en otro change); confiar solo en pruebas con `fetch` simulado (no protege la verificación manual).

### D10 — Escrituras: envío único, resultado incierto y límites

- Envío único: cada formulario lleva una bandera «en curso»; mientras vale verdadero, el botón está `disabled` y el manejador de `submit` sale sin hacer nada (cubre doble clic y Enter). Se libera en `finally`.
- Resultado incierto (D1): no se anuncia éxito; Libros y Clientes releen su listado para que el operador vea si quedó; Ventas conserva el borrador y pide revisar el Historial antes de reintentar. Nunca se reintenta solo.
- Límites que la API no valida y harían fallar el servidor (ver la tabla de Contexto): longitudes de texto, precio hasta 99 999 999,99, stock y cantidad hasta 2 147 483 647. Se validan en `src/logica/` con mensajes junto al campo.

### D11 — Retiro de `localStorage` para datos de negocio (requiere aprobación)

- Las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` dejan de leerse y escribirse. No se borran ni se migran: borrarlas es irreversible y sin beneficio (nada las lee), y migrarlas escribiría en producción. El README explica cómo quitarlas a mano.
- Se eliminan `src/datos/local/repositorios-locales.ts`, `datos-iniciales.ts` y `tipos-locales.ts` con sus pruebas, y la parte de negocio de `almacen-local.ts`, que queda como el único punto que obtiene el almacenamiento del navegador (`obtenerAlmacenamientoDelNavegador` y `AlmacenamientoInyectable`) para `almacen-usuarios.ts`. `construirVenta` (lógica pura usada solo por el adaptador local) se elimina con sus pruebas; `calcularVenta` y las demás funciones del borrador se conservan. Conservar los adaptadores «para pruebas» se descarta: las pruebas de API ya usan solicitudes simuladas y un adaptador vivo invitaría a reconectarlo.
- Reglas duras: la 4 pasa a decir que la red llega a la API solo por los repositorios y la base `/api`; la 7, que `almacen-local.ts` es el único que nombra `localStorage` y que los almacenes locales son los de usuarios y sesión. La afirmación «el cliente HTTP es solo `GET`» se reemplaza en `CLAUDE.md`, `AGENTS.md` y la base de conocimiento.

### D12 — Mínimos de la consigna frente a producción (decisión del equipo)

La consigna pide al menos 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes; producción tiene 5 libros (el resto cumple). Este change no escribe en producción para completarlo. Opciones para el equipo, fuera de este plan: registrar el sexto libro desde la aplicación desplegada (T-06) como operación real del bibliotecario, pedirlo al responsable del backend, o declarar la diferencia en la entrega. Se registra como pregunta abierta en `knowledge-base/10_preguntas_abiertas.md`.

### D13 — Historial y Ventas sobre la API

- Historial: `ventas.listar()` con todas las páginas, en el orden de la API (`id` creciente). El detalle usa solo la venta: `precio_unitario`, `subtotal` y `total` son históricos (se copian al confirmar); `titulo` y `cliente` son los actuales. La regla dura 8 se mantiene: nunca se lee el precio del catálogo para una venta confirmada. CM-6 pasa a verificarse en el backend local con `PATCH /libros/{id}` de precio después de una venta.
- Ventas: lee clientes (sondeo) y libros una vez al abrir; el borrador calcula un importe estimado con la lógica existente; al confirmar envía solo identificadores y cantidades, y el comprobante muestra la venta devuelta por la API. Los libros con precio no utilizable siguen rechazándose en el borrador.

## Risks / Trade-offs

- [Escritura accidental en producción] → guarda de D9 en `dev` y `preview` sin desactivación, backend local documentado, `fetch` global bloqueado en las pruebas; tarea de verificación que comprueba el `403` contra el destino por defecto.
- [Sondeo incompleto tras más de 10 altas fallidas seguidas] → validación local de duplicados, identificadores conocidos por ventas y libros, constante ajustable, limitación documentada.
- [Costo de lectura: `1 + n` libros, `n + 10` clientes y autores, páginas de ventas] → concurrencia 4 y lectura única por apertura de vista; aceptable para decenas de registros.
- [Alta de cliente a medias] → mensaje explícito y «Completar perfil» (D6).
- [Precio distinto entre borrador y venta confirmada] → el comprobante muestra los importes del servidor (spec `ventas`).
- [Historial muestra título y nombre actuales] → declarado en la spec `historial`; precios e importes sí son históricos.
- [Respuestas 500 por datos que la API no valida] → límites locales de D10.
- [Datos de producción compartidos con la evidencia del backend] → sin edición ni borrado desde la aplicación (D7); este change no escribe en producción.
- [Constante de la dirección de producción en `src/`] → la importan solo `vite.config.ts` y las pruebas; la verificación revisa que `dist/` no contenga `api.ismaelsuarez.me`.

## Migration Plan

1. Rama `feat/operaciones-contra-api` desde la punta de T-04; línea base registrada (`npm test`, `npm run build`).
2. Unidades de trabajo en el orden de `tasks.md`: guarda y backend local primero (antes de que exista cualquier escritura), luego cliente HTTP, adaptadores, lógica, conmutación de `proveedor.ts` con el retiro del almacén local, vistas, documentación y verificación contra el backend local.
3. Sin migración de datos: las claves `libreria.*` quedan sin uso. Reversión: revertir la rama devuelve las vistas al almacén local, que encontrará sus claves intactas.

## Open Questions

Las decisiones marcadas «requiere aprobación» (D5, D6, D7, D9, D11) y D12 se presentan al usuario en la propuesta; la gobernanza ALTO impide escribir código antes de su aprobación. Si se elige una alternativa en D7, cambian la spec `clientes` y las tareas del grupo de Clientes.
