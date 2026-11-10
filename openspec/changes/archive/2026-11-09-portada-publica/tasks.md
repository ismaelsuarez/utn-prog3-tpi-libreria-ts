# Tasks

Gobernanza MEDIO (interfaz y página estática), con la unidad del contenedor en ALTO (entorno de despliegue). Ninguna tarea de los grupos 1 a 4 empieza antes de cerrar el grupo 0. El agente **no** contacta el VPS ni despliega: el grupo 5 lo ejecuta el usuario. Ninguna verificación escribe en la API de producción: contra producción solo `GET`/`HEAD`.

**TDD estricto**: la única lógica comprobable con Vitest es la estructura de las páginas (no hay TypeScript nuevo). Primero la prueba estructural y su RED observado (se registra la salida), después el HTML/CSS mínimo para el GREEN, luego el ajuste con la suite en verde. Para la configuración del contenedor, la prueba ejecutable es `despliegue/comprobar.sh`: se amplía primero y se observa que falla contra la imagen actual. Red de seguridad de la guarda: `npx vitest run tests/logica/sesion.test.ts` en verde antes y después, y `src/main.ts`, `src/logica/`, `src/types/`, `src/utils/` y `src/datos/` sin cambios (design D2). Por cada comando existente que toque el cambio (`npm run dev`, `npm run preview`, `npm run build`, `npm test`), una comprobación de que su comportamiento previo se conserva salvo la entrada pedida.

**Unidades de trabajo** (≈ 400 líneas por unidad, orientativo; previsión total ≈ 450 líneas cambiadas):

| Unidad | Grupos | Previsión | Riesgo | Commit sugerido |
|---|---|---|---|---|
| U1 | 1 | ≈ 240 | ninguno (página estática nueva y enlaces; cubierta por la prueba estructural) | `feat(portada): add static public landing page at the site root` |
| U2 | 2 | ≈ 60 | **alto, ítem 5** (entorno de despliegue) e **ítem 2** (cabeceras de seguridad de la nueva entrada) | `build(deploy): serve the landing page at / instead of redirecting to login` |
| U3 | 3–4 | ≈ 150 | ninguno (documentación y casos manuales) | `docs(portada): document the public landing page and T-07` |

U2 va en su propio commit y recibe verificación independiente. No hay commit de guarda: la protección de rutas no cambia (design D2); si durante el apply hiciera falta tocar `src/main.ts` o `src/logica/sesion.ts`, se detiene el trabajo y se consulta al usuario (sería ítem 2, commit propio).

**Superficies de edición del apply** (fuera de ellas no se escribe):

- `index.html`
- `src/styles/portada.css`
- `src/pages/auth/login/login.html`
- `src/pages/auth/registro/registro.html`
- `tests/paginas/portada.test.ts`
- `despliegue/nginx/default.conf.template`
- `despliegue/comprobar.sh`
- `despliegue/DESPLIEGUE.md`
- `README.md`
- `CHANGES.md`
- `CLAUDE.md`
- `AGENTS.md`
- `knowledge-base/02_descripcion_general.md`
- `knowledge-base/08_arquitectura_propuesta.md`
- `knowledge-base/09_decisiones_y_supuestos.md`
- `openspec/changes/portada-publica/**`

Carpetas temporales siempre en `mktemp -d` fuera del repositorio; los contenedores, redes e imágenes de verificación se eliminan al terminar cada grupo.

## 0. Aprobación del plan

- [x] 0.1 Presentar al usuario las decisiones que lo necesitan: D3 (portada igual con o sin sesión, sin «Ir a la librería»), D5 (marca del login y del registro enlazada a la portada) y el texto borrador de D4 (título de pestaña, título principal, presentación y nota); registrar su respuesta en «Decisions» de `design.md` y, si elige otra alternativa, ajustar specs y tareas; verificar con `openspec validate portada-publica --strict` — Aprobado por el usuario el 2026-11-09 tal como está (registrado en «Open Questions» de `design.md`); `openspec validate portada-publica --strict` válido.
- [x] 0.2 Línea base en la rama `feat/portada-publica`: `npm test` (cantidad de pruebas), `npx tsc --noEmit`, `npm run build` y `npx vitest run tests/logica/sesion.test.ts`; verificar que todo pasa antes de tocar archivos y registrar los números — Línea base: `npm test` 626/626 (23 archivos), `npx tsc --noEmit` sin errores, `npm run build` correcto, `tests/logica/sesion.test.ts` 95/95.

## 1. Portada estática (U1)

- [x] 1.1 RED: escribir `tests/paginas/portada.test.ts` (design D7) que lee `index.html` con `node:fs` y exige: sin `<script`, sin atributos `on…=`, sin `<style` ni `style=`, sin `/api`, sin `http://` ni `https://`; `body` sin `hidden`; exactamente un `<h1`; `<header`, `<nav`, `<main` y `<footer`; `<title>` con «Librería El Faro»; enlace «Ingresar» a `src/pages/auth/login/login.html` y «Crear cuenta» a `src/pages/auth/registro/registro.html`. Verificar que falla contra el `index.html` actual y registrar la salida — RED observado: 15 de 22 pruebas fallan contra el `index.html` anterior (script, sin h1, sin landmarks, sin accesos, sin marca enlazada).
- [x] 1.2 GREEN: reescribir `index.html` como la portada de design D4 (clases existentes, hojas `base`, `disposicion`, `componentes`, `vista-inmersiva` y `portada.css`, accesos dentro de `nav[aria-label="Acceso"]`, pie igual al del login) y crear `src/styles/portada.css` solo con lo que D4 enumera; verificar `npx vitest run tests/paginas/portada.test.ts` en verde — GREEN: las 16 pruebas de la portada pasan (6 restantes eran D5).
- [x] 1.3 RED → GREEN de D5: ampliar la prueba para exigir en `login.html` y `registro.html` un enlace a `../../../../index.html` en la marca del encabezado, sin la clase `navegacion__enlace`; observar el fallo; agregar el enlace con clase propia (y su estilo y foco en `portada.css` solo si hace falta, o en la hoja que ya enlazan esas páginas); verificar la prueba en verde — RED observado (6 fallos: marca sin enlace en login y registro) → GREEN: 22/22.
- [x] 1.4 Comprobaciones de la unidad: `npm test` completo (línea base + pruebas nuevas), `npx vitest run tests/logica/sesion.test.ts` igual que en 0.2, `npm run build` sin errores y `dist/index.html` sin `<script` ni `/api` (`grep -c`), con sus hojas e imagen en `dist/assets/`; `git diff --quiet main -- src/main.ts src/logica src/types src/utils src/datos vite.config.ts` sin diferencias; con `npm run dev` y con `npm run preview`, `/` muestra la portada y «Ingresar» abre el login (comportamiento previo de ambos comandos conservado salvo la entrada) — `npm test` 648/648 (626 + 22), `sesion.test.ts` 95/95, build correcto, `dist/index.html` con 0 `<script` y 0 `/api`, `git diff main` sin cambios en la guarda, `vite.config.ts` ni `src/{logica,types,utils,datos}`; `npm run dev` y `npm run preview` sirven la portada en `/` (200) y el login en su ruta (200).
- [x] 1.5 README: fila de la portada en «Navegación entre vistas» (la raíz es la portada; el login ya no dice «`index.html` redirige aquí») y `index.html` y `portada.css` en «Estructura de carpetas»; verificar que el README no dice en tiempo presente que la raíz lleva al login, salvo en resultados ya registrados — README: fila Portada, fila Ingresar sin «redirige aquí», `index.html` y `portada.css` en la estructura; quedan en presente solo resultados históricos de CM (nota en 3.4).
- [x] 1.6 Commit U1 (`feat(portada): add static public landing page at the site root`) con los archivos del grupo 1

## 2. Entrada del contenedor (U2, riesgo alto)

- [x] 2.1 RED: actualizar `despliegue/comprobar.sh` (design D6): para `/` y `/index.html`, `200`, `text/html`, `Cache-Control: no-cache`, sin `Location`, cabeceras de seguridad, cuerpo que enlaza a `src/pages/auth/login/login.html` y sin `<script`; construir la imagen con la configuración actual y la portada de U1 (`docker build`), correr el script contra ella y observar que fallan exactamente los casos de la entrada; registrar la salida — RED observado (commit 55bbe08): contra la imagen con la portada de U1 y el nginx anterior, 52 de 60 casos correctos; fallan exactamente los 8 de la entrada (`/` y `/index.html`: estado 302, sin `no-cache`, con `Location`, sin enlace al login).
- [x] 2.2 GREEN: en `despliegue/nginx/default.conf.template`, `location = /` con `add_header Cache-Control "no-cache"`, `include /etc/nginx/cabeceras-seguridad.conf` y `try_files /index.html =404`; eliminar `location = /index.html`; actualizar el comentario. Reconstruir y verificar `sh despliegue/comprobar.sh http://127.0.0.1:<puerto>` en verde completo (los casos previos de login, `assets/`, 404, `/api` y redirecciones del destino siguen igual) contra un backend local o contra `API_UPSTREAM=https://api.ismaelsuarez.me` (solo `GET`) — GREEN: 60 de 60 casos contra `API_UPSTREAM=https://api.ismaelsuarez.me` (solo `GET`, sin backend local); los casos previos no cambian.
- [x] 2.3 `despliegue/DESPLIEGUE.md`: en la prueba de humo, la raíz muestra la portada y «Ingresar» lleva al login; en «Redesplegar», la nota de design D8: después de **Implementar** `web`, comprobar que el servicio `api` está en verde y, si se detuvo, **reiniciarlo** (no Implementar). Verificar que el documento no pide al agente ninguna acción en el VPS y que cada comando local se ejecuta tal como está escrito — Prueba de humo con la portada y «Ingresar»; nota de design D8 sobre comprobar y reiniciar `api`; sin acciones del agente en el VPS.
- [x] 2.4 Commit U2 (`build(deploy): serve the landing page at / instead of redirecting to login`) solo con los archivos del grupo 2; verificación independiente del commit (cabeceras de seguridad en `/` y `/index.html`, ninguna otra ruta cambió de comportamiento respecto de `main`, comparando la salida de `comprobar.sh` de ambas imágenes) — Commit 55bbe08 solo con nginx y `comprobar.sh` (`DESPLIEGUE.md` va en el commit de documentación). Comparación contra una imagen de `main`: el mismo script falla solo los 8 casos de la entrada y las cabeceras de `/healthz`, login, registro, `assets/`, 404, `/api`, `/apiclientes/` y `/src/pages/auth/login` son idénticas. Verificación independiente: pendiente del orquestador.

## 3. Documentación (U3)

- [x] 3.1 `CHANGES.md`: entrada `[T-07] portada-publica` (scope: portada estática en la raíz sin datos ni scripts, entrada del contenedor y marca enlazada; depende de T-06; governance MEDIO con la unidad del contenedor en ALTO; «Leer antes»: este `design.md` y `knowledge-base/08`), árbol de dependencias y tabla de dependencias; verificar que T-01 a T-06 no cambian — T-01 a T-06 sin cambios; T-07 queda `[ ]` (no archivado).
- [x] 3.2 `CLAUDE.md` y `AGENTS.md` (copias idénticas): fila «Estructura» del stack (`index.html` es la portada estática), serie vigente con 7 changes y fila T-07 en el roadmap; verificar `diff CLAUDE.md AGENTS.md` vacío — `diff CLAUDE.md AGENTS.md` vacío.
- [x] 3.3 `knowledge-base/02` (entrada) y `08` (árbol de `src/`, entrada y bloque de nginx) y decisión nueva en `09` (portada estática sin scripts ni datos; la guarda no cambia; con sesión se ve igual) con el número siguiente a DD-33; verificar que las rutas citadas existen — DD-34; rutas citadas verificadas.
- [x] 3.4 README, sección «Despliegue»: `/` y `/index.html` responden 200 con la portada; y una nota bajo los casos manuales que citan «la raíz lleva al login» (CM-12, CM-13, CM-A6, CM-25, CM-28, CM-29) aclarando que desde T-07 la raíz muestra la portada, sin modificar lo observado entonces (regla dura 10); verificar con `grep -n "lleva al login\|redirige al login" README.md` que solo quedan apariciones históricas — Nota al inicio de «Casos manuales» (CM-12, CM-13, CM-25, CM-28, CM-29 y CM-A6) y sección de Despliegue actualizada; lo que queda en presente son resultados históricos.

## 4. Verificación final

- [x] 4.1 Suite y compilación: `npm test`, `npx tsc --noEmit`, `npm run build`; `grep -c "<script" dist/index.html` en 0 y `grep -c "/api" dist/index.html` en 0; `git diff --stat main -- src/main.ts src/logica src/types src/utils src/datos` vacío; verificar que todo pasa — `npm test` 648/648, `tsc` sin errores, build correcto, `dist/index.html` con 0 `<script` y 0 `/api`, `git diff main` de guarda, tipos, utilidades, datos y `vite.config.ts` vacío.
- [x] 4.2 Contenedor: `docker build` desde un clon limpio de la rama y `sh despliegue/comprobar.sh` contra la imagen nueva, en verde; verificar que no quedan contenedores, redes, volúmenes ni carpetas temporales de la verificación — Imagen construida desde un clon limpio de la rama (`55bbe08`): 60 de 60, `healthy`, uid 101; sin contenedores, imágenes, redes ni volúmenes `t07-` y carpetas temporales fuera del repositorio.
- [x] 4.3 Chrome sin cabeza contra el contenedor local (backend local para cualquier escritura, por ejemplo el registro de un usuario de prueba, que solo toca `localStorage`): portada sin sesión, con sesión `admin` y con sesión `client`, con el registro de red mostrando ninguna solicitud a `/api` ni a otro origen y la consola sin violaciones de CSP ni errores; «Ingresar» y «Crear cuenta» sin sesión (login y registro) y con sesión (destino del rol); marca del login y del registro → portada; Catálogo por dirección sin sesión → login sin solicitudes a `/api`; portada a 320 px y a 1280 px sin desplazamiento horizontal; recorrido con Tab y foco visible en cada enlace; `userData` y `users` iguales antes y después de abrir la portada. Verificar registrando lo observado — 54 de 54 comprobaciones en Chrome 157 sin cabeza contra el contenedor (y bajo `/libreria/`); registrado en CM-31 a CM-37.
- [x] 4.4 README: registrar lo observado en 4.3 como casos manuales nuevos (CM-31 en adelante) con el comportamiento real si alguno falla (regla dura 10) y actualizar la cantidad de casos en `CLAUDE.md`/`AGENTS.md` (copias idénticas); verificar que cada caso corresponde a una observación de 4.3 y `diff CLAUDE.md AGENTS.md` vacío — CM-31 a CM-37 y `CLAUDE.md`/`AGENTS.md` con 37 casos; `diff` vacío.
- [x] 4.5 `openspec validate portada-publica --strict` en verde (con el aviso informativo de la delta de `despliegue` mientras T-06 no esté archivado) y commit U3 (`docs(portada): document the public landing page and T-07`) con los grupos 3 y 4 — `openspec validate portada-publica --strict` válido (con el aviso informativo de la delta de `despliegue`).

## 5. Redespliegue en Easypanel [lo ejecuta el usuario; el agente no]

El agente no marca estas tareas por su cuenta: las marca solo cuando el usuario informa el resultado observado.

- [x] 5.1 [usuario] Integrar el PR de `feat/portada-publica` en `main`
- [x] 5.2 [usuario] En la App `web` del proyecto `libreria`, pulsar **Implementar** y esperar el estado `healthy`
- [x] 5.3 [usuario] Comprobar que el servicio `api` sigue en verde; si se detuvo durante la implementación de `web` (ya ocurrió una vez en el VPS de 2 GB, probablemente por memoria), **reiniciarlo** (no Implementar) y esperar que vuelva a verde
- [x] 5.4 [usuario] Prueba de humo: `sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me` en verde y, en el navegador, la raíz muestra la portada, «Ingresar» lleva al login y el Catálogo sin sesión lleva al login
- [x] 5.5 Registrar en el README la fecha del redespliegue y el resultado de la prueba de humo informados por el usuario; verificar que no contiene credenciales ni datos privados

## Workflow follow-up

- Archivar primero `despliegue-frontend` (T-06): la delta de `despliegue` de este change modifica la especificación que crea T-06, y el archivo la rechaza mientras esa capacidad no exista en `openspec/specs/`.
- Después, archivar con `/opsx:archive portada-publica` y marcar T-07 en `CHANGES.md`.
- Regenerar el `.zip` final con `npm run entrega` sobre el último commit integrado.
