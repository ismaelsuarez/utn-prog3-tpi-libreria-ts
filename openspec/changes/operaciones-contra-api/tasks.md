# Tasks

Gobernanza ALTO: ninguna tarea de los grupos 1 a 10 empieza antes de cerrar el grupo 0. Ninguna tarea escribe en la API de producción: toda escritura manual va a un backend local (D9).

**TDD estricto** (Vitest, `npm test`, solicitudes simuladas e inyectadas; nunca red real): por cada comportamiento, primero la prueba que falla (RED, se registra la salida), después el mínimo código (GREEN) y luego el refactor con la suite en verde. Una prueba por regla pedida; por cada comando u opción existente que toque el cambio, una prueba de que su comportamiento previo se conserva. El DOM se verifica con los casos manuales del grupo 10.

**Unidades de trabajo**: cada grupo de código es un commit convencional propio (aprox. ≤ 400 líneas cambiadas, orientativo), con sus pruebas y su documentación. Los grupos marcados **[alto riesgo]** se revisan solos. Previsión total: ≈ 2 700 líneas agregadas y ≈ 1 800 eliminadas (≈ 4 500 cambiadas; la eliminación del almacén local es mecánica). Entrega sugerida en PR encadenados: (1) grupos 1–2, (2) grupo 3, (3) grupo 4, (4) grupo 5, (5) grupos 6–7, (6) grupos 8–10.

**Superficies de edición de la aplicación** (fuera de ellas no se escribe):

- `src/datos/**`, `src/logica/**`, `src/types/**`, `src/pages/admin/**`, `src/utils/**`, `src/styles/**` (solo estilos de los controles nuevos)
- `tests/**`, `vite.config.ts`
- `README.md`, `CHANGES.md`, `CLAUDE.md`, `AGENTS.md`, `knowledge-base/**`
- `openspec/changes/operaciones-contra-api/**`

## 0. Aprobación del plan

- [x] 0.1 Presentar al usuario las decisiones D5, D6, D7, D9 y D11 (y la pregunta D12) de `design.md`, obtener su aprobación explícita o la alternativa elegida, y registrarla en la sección «Open Questions» de `design.md`; verificar que, si se eligió otra alternativa, la spec y las tareas afectadas quedaron ajustadas y `openspec validate operaciones-contra-api --strict` pasa
- [x] 0.2 Registrar la línea base de la rama: `npm test`, `npm run build` y la cantidad de pruebas; verificar que todo pasa antes de tocar código (línea base observada el 2026-11-09: 22 archivos, 509/509 pruebas, `tsc` y `npm run build` en verde)

## 1. Guarda de escrituras y backend local [alto riesgo: entorno de desarrollo]

- [x] 1.1 RED/GREEN: `debeRechazarEscritura(metodo, destino)` en `src/datos/api/reenvio.ts` (verdadero para `POST`, `PUT`, `PATCH` y `DELETE` hacia `https://api.ismaelsuarez.me`, con o sin barra final y en cualquier capitalización del anfitrión; falso para `GET`, `HEAD`, `OPTIONS` y para `http://127.0.0.1:8000`); verificar con `tests/datos/api/reenvio.test.ts`
- [x] 1.2 Complemento en `vite.config.ts` con `configureServer` y `configurePreviewServer` que responde `403` con el `detail` de D9 antes del reenvío; `API_DE_PRODUCCION` sale de `reenvio.ts`. Verificar con `npm run dev`: `curl -s -X POST http://localhost:5173/api/health/live` devuelve `403` con ese `detail` (si la guarda fallara, producción respondería `405` en esa ruta de solo lectura, sin efecto), y `curl -s http://localhost:5173/api/health/live` sigue devolviendo 200
- [x] 1.3 Archivo de preparación de Vitest (`setupFiles`) que reemplaza el `fetch` global por uno que rechaza; RED/GREEN con una prueba que invoca `fetch` sin inyectar y espera el rechazo; verificar que la suite completa sigue en verde
- [x] 1.4 README, sección «Backend local para verificar escrituras»: clonar el repositorio del backend, red de Docker, PostgreSQL 17, imagen desde `despliegue/`, `python seed.py` dentro del contenedor local, `API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev`, comprobación previa de `GET /api/health/ready` y del destino, y apagado; verificar ejecutando la receta tal como está escrita y obteniendo `{"estado":"ok","base":"disponible"}` por `/api/health/ready`
- [x] 1.5 Commit `build(dev): block writes to the production API from dev and preview`

## 2. Cliente HTTP con escrituras [alto riesgo: escrituras a un sistema externo]

- [x] 2.1 RED/GREEN: `enviar("POST", ruta, cuerpo)` arma la dirección como `obtener`, envía `Content-Type: application/json` y el cuerpo serializado, y devuelve el JSON del 201; verificar en `tests/datos/api/cliente-http.test.ts`
- [x] 2.2 RED/GREEN: errores de `enviar` (409 con `detail` de texto, 422 con lista, respuesta no JSON, 502 sin cuerpo) iguales a los de `obtener`; falla de red y tiempo agotado producen `resultadoIncierto: true`, el mensaje de D1 y **una sola** llamada a `solicitar`; verificar con las mismas pruebas
- [x] 2.3 Prueba de regresión: las pruebas existentes de `obtener` pasan sin cambios y una lectura sin respuesta no marca `resultadoIncierto`; verificar con `npm test`
- [x] 2.4 Commit `feat(api): add JSON POST to the HTTP client without retries`

## 3. Adaptadores de la API: sondeo y escrituras [alto riesgo: escrituras a un sistema externo]

- [x] 3.1 RED/GREEN: `sondearPorIdentificador` (tandas de 4, 404 como ausente, corte tras 10 ausentes seguidos pasado el mayor conocido, rechazo ante otra falla, orden por identificador); verificar con los escenarios de la spec `acceso-a-datos` («Clientes consecutivos», «Hueco menor que el límite», «Identificador conocido por otra fuente», «Falla distinta de 404») en `tests/datos/api/paginacion.test.ts`
- [x] 3.2 Fixtures de `POST /libros/`, `POST /clientes/`, `POST /clientes/{id}/perfil`, `POST /ventas/`, `GET /clientes/{id}` y `GET /autores/{id}` copiados de los esquemas del árbol desplegado, con `satisfies`; verificar con `npm run build` (falla si un tipo no coincide)
- [x] 3.3 RED/GREEN: `clientes.listar` (sondeo con identificadores conocidos por las ventas), `clientes.obtener`, `autores.listar` (sondeo con `autor_id` de los detalles de libros); verificar en `tests/datos/api/repositorios-api.test.ts`
- [x] 3.4 RED/GREEN: `libros.crear` (precio redondeado al centavo como texto, `autores` con rol y orden), `clientes.crear`, `clientes.crearPerfil` (dirección vacía como `null`), `ventas.crear` (solo `cliente_id` y renglones) y `ventas.listar` (todas las páginas); cada prueba comprueba método, dirección, cuerpo y que se entrega lo que devolvió la API; verificar en `tests/datos/api/repositorios-api.test.ts`
- [x] 3.5 Commit `feat(api): add write adapters and id probing for clients and authors`

## 4. Lógica pura de validación y errores

- [x] 4.1 RED/GREEN en `src/logica/libros.ts`: stock (vacío, negativo, decimal, texto, mayor que 2 147 483 647, cero válido), título > 200, ISBN > 20, precio > 99 999 999,99, rol fuera de los cuatro; verificar en `tests/logica/libros.test.ts`, conservando los casos existentes
- [x] 4.2 RED/GREEN en `src/logica/clientes.ts`: teléfono > 30 caracteres, dirección opcional > 255, nombre > 100, email > 255, y la validación del perfil sola (para «Completar perfil»); verificar en `tests/logica/clientes.test.ts`, conservando los casos existentes
- [x] 4.3 RED/GREEN en `src/logica/ventas.ts`: cantidad o acumulación mayor que 2 147 483 647 rechazada; verificar en `tests/logica/ventas.test.ts`
- [x] 4.4 RED/GREEN: `erroresDeFormulario` (D3) traduce `loc` de la API a los nombres de los controles y ubica el 409 del alta de cliente en el email; verificar con una prueba nueva en `tests/logica/`
- [x] 4.5 Actualizar `knowledge-base/05_reglas_de_negocio.md` con las reglas nuevas (límites, rol, perfil de una sola vez, venta sin control de stock); verificar que cada regla nueva cita su spec
- [x] 4.6 Commit `feat(logica): validate API limits, roles and client profile`

## 5. Conmutación a la API y retiro del almacén local de negocio [alto riesgo: contrato de datos y formato persistido]

- [x] 5.1 RED/GREEN en `tests/datos/proveedor.test.ts`: importar `proveedor` no hace solicitudes; las vistas de gestión reciben repositorios sobre `/api`; ninguna clave `libreria.*` se lee ni se escribe (almacenamiento simulado con claves previas, que quedan intactas)
- [x] 5.2 `src/datos/proveedor.ts` exporta todos los repositorios sobre la API; `src/datos/repositorios.ts` quita `actualizarTelefono` (y `actualizar`, según lo aprobado en D7) y las marcas «SIN ENDPOINT»; `src/types/venta.ts` quita `Renglon.isbn`; la vista Clientes deja de usar las operaciones quitadas (D7) y la vista Historial, la rama del ISBN; verificar con `npm run build`
- [x] 5.3 Eliminar `src/datos/local/{repositorios-locales,datos-iniciales,tipos-locales}.ts`, la parte de negocio de `almacen-local.ts`, `construirVenta` y sus pruebas; conservar y pasar las de usuarios, contraseñas y sesión; listar en el commit los casos retirados y su motivo; verificar con `npm test` y `npm run build`
- [x] 5.4 Documentación: `CLAUDE.md` y `AGENTS.md` (fila de datos del stack, reglas duras 4 y 7, comando `npm run dev` con la guarda), `knowledge-base/04` (persistencia: solo `users` y `userData`; claves `libreria.*` sin uso), `08` (repositorios sobre la API, sondeo, guarda), `09` (decisiones nuevas a partir de DD-26, con los supuestos), `10` (pregunta abierta de los mínimos, D12), README «Origen de los datos» y «Datos y almacenamiento» (cómo quitar a mano las claves viejas); verificar con `grep -rn "solo \`GET\`\|libreria.libros" CLAUDE.md AGENTS.md knowledge-base README.md` que no queden afirmaciones vigentes contradictorias
- [x] 5.5 Commit `refactor(datos)!: move management views to the API and retire local business storage`

## 6. Vista Libros

- [x] 6.1 `libros.html`: campo stock (numérico, con etiqueta, ayuda y lugar de error) y, por cada autor, un selector de rol asociado a su casilla; verificar en el navegador a 320 px y 1280 px, con teclado y foco visible
- [x] 6.2 `libros.ts`: lee libros, editoriales, géneros y autores una vez al abrir; valida contra esas listas; envía `stock`, roles y orden; tras el 201 relee el listado; muestra 409 y 422 con `erroresDeFormulario`; resultado incierto relee el listado; envío único (botón deshabilitado durante la espera); verificar con `npm run build` y los casos del grupo 10
- [x] 6.3 README, sección Libros: campos nuevos y que el stock no se muestra ni se descuenta; verificar que coincide con la spec `libros`
- [x] 6.4 Commit `feat(libros): register books with stock and author roles in the API`

## 7. Vista Clientes

- [ ] 7.1 `clientes.html`: campo dirección, columna dirección, botón «Completar perfil de <nombre>» por cliente sin perfil y diálogo reutilizado solo para el perfil (sin edición de nombre ni email, según D7); verificar en el navegador a 320 px y 1280 px, con teclado y foco visible
- [ ] 7.2 `clientes.ts`: listado por sondeo; alta en dos escrituras con el mensaje de perfil fallido de D6; 409 del alta junto al email; «Completar perfil» con su 409; envío único en ambos formularios; verificar con `npm run build` y los casos del grupo 10
- [ ] 7.3 README, sección Clientes: teléfono y dirección de una sola vez, «Completar perfil», ausencia de edición y la limitación del sondeo; verificar que coincide con la spec `clientes`
- [ ] 7.4 Commit `feat(clientes): register clients with a one-time profile in the API`

## 8. Ventas e Historial

- [ ] 8.1 `ventas.ts`: lee clientes y libros una vez al abrir; el borrador no vuelve a pedir datos; confirma con el cuerpo de la spec; el comprobante usa la venta devuelta; rechazo y resultado incierto conservan el borrador con su mensaje; envío único; verificar con `npm run build` y los casos del grupo 10
- [ ] 8.2 `historial.ts`: ventas de todas las páginas; detalle solo con los datos de la venta, sin ISBN; verificar con `npm run build` y los casos del grupo 10
- [ ] 8.3 README, secciones Ventas e Historial: importes del servidor, venta sin control de stock, qué datos del detalle son históricos; verificar que coincide con las specs `ventas` e `historial`
- [ ] 8.4 Commit `feat(ventas): confirm sales and read history from the API`

## 9. Comprobaciones automáticas de integración

- [ ] 9.1 `npm test`, `npm run build` y `grep -r "api.ismaelsuarez.me" dist/` (sin resultados); verificar los tres
- [ ] 9.2 Comprobación diferencial: para cada lectura existente (Catálogo con `npm run dev` y destino por defecto), comparar estado y cuerpo contra la línea base en una copia temporal fuera del repositorio (`mktemp -d`); verificar que no hay diferencias no pedidas

## 10. Verificación manual contra el backend local (nunca producción)

- [ ] 10.1 Preparación: backend local de la tarea 1.4 sembrado; `API_PROXY_TARGET=http://127.0.0.1:8000`; `curl -s http://localhost:5173/api/health/ready` responde `{"estado":"ok","base":"disponible"}` y el registro del contenedor local muestra esa solicitud; verificar las dos cosas antes de la primera escritura
- [ ] 10.2 Guarda: con el destino por defecto, «Registrar cliente» muestra el `403` de la guarda como mensaje y la API de producción no recibe la escritura; verificar en la pestaña de red del navegador
- [ ] 10.3 Libros: alta válida con stock y dos autores con roles distintos (aparece en Libros, Catálogo y Ventas), ISBN repetido con separadores, stock inválido, título de 201 caracteres, doble clic en registrar (un solo `POST`); verificar en el navegador y en el registro del backend local
- [ ] 10.4 Clientes: alta con perfil; email repetido (junto al email); perfil fallido provocado bloqueando en las herramientas del navegador las solicitudes a `/api/clientes/*/perfil` (el cliente queda registrado sin perfil), y luego «Completar perfil» sin el bloqueo; cliente sembrado con perfil sin controles de edición; verificar en el navegador
- [ ] 10.5 Ventas: venta de referencia con libros de precio 1500 y 2000 creados en el backend local (CM-5), venta sin cliente o sin renglones (CM-4), cantidad mayor que el stock aceptada y stock sin cambios, resultado incierto (solicitudes a `/api/ventas/` bloqueadas en las herramientas del navegador) con el borrador conservado y sin reenvío; verificar en el navegador y en el Historial
- [ ] 10.6 Historial y precio histórico (CM-6): `PATCH /libros/{id}` de precio en el backend local después de una venta y recarga del Historial; la venta conserva unitario, subtotales y total; verificar en el navegador
- [ ] 10.7 Accesibilidad y adaptación: Libros, Clientes y Ventas a 320 px y 1280 px, con teclado y foco visible (regla dura 11); verificar sin desplazamiento horizontal
- [ ] 10.8 Registrar en el README los resultados realmente observados (casos nuevos a partir de CM-17 y CM-2 a CM-6 reescritos), marcar T-05 en `CHANGES.md` y apagar el backend local; verificar que ningún caso figura aprobado sin haberse ejecutado (regla dura 10)
- [ ] 10.9 Commit `docs(readme): record manual verification of API operations`

## Workflow follow-up

- Revisión de cada PR encadenado; los grupos 1, 2, 3 y 5 se revisan solos.
- Archivar el change con `/opsx:archive operaciones-contra-api` y actualizar el `## Purpose` de `openspec/specs/datos-locales/spec.md`, que tras el retiro solo conserva la normalización compartida y las claves sin uso.
