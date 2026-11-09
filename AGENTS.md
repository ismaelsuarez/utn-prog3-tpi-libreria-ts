# TPI: frontend de una librería — Instrucciones para Agentes

> Este archivo (y su copia `CLAUDE.md`) es lo PRIMERO que todo agente lee al entrar al repo.
> Generado a partir de `knowledge-base/` y `CHANGES.md`. No editar a mano sin volver a sincronizar ambos archivos.

Trabajo Práctico Integrador de Programación III (Tecnicatura Universitaria en
Programación a Distancia, UTN). Frontend estático de una librería: catálogo,
alta de libros y clientes, venta simulada e historial, con datos en el
navegador. Consigna: `docs/Repaso Primer Parcial.pdf`.

Integrantes: Avalos Pablo, Blangetti Sofia, Suarez Ismael.

---

## Stack Tecnológico

| Capa | Tecnologías | Observaciones |
|---|---|---|
| Estructura | HTML5 semántico | Una página por vista en `src/pages/<zona>/<vista>/`; `index.html` de la raíz redirige al Catálogo |
| Presentación | CSS propio en archivos externos (`src/styles/`) | Flexbox o Grid; sin frameworks ni CDNs; tipografías e imágenes locales |
| Comportamiento | TypeScript estricto, módulos ES (`<script type="module">`) | Sin librerías de ejecución; Vite 7 compila y sirve |
| Datos | Repositorios asíncronos (`src/datos/repositorios.ts`) con forma de la API de producción | Hoy los implementa un adaptador sobre `localStorage`; la API `https://api.ismaelsuarez.me` se consume por la base `/api` del mismo origen (`VITE_API_BASE`) con reenvío en `npm run dev` y `npm run preview` |
| Verificación de desarrollo | Vitest (`npm test`) y `tsc` | Las pruebas viven en `tests/`, fuera de la entrega |
| Verificación de entrega | Casos manuales en el navegador | Ocho casos (CM-1 a CM-8) registrados en el README |

Requiere Node 20.19+ o 22.12+ (exigencia de Vite 7) y npm. La aplicación ya no se
abre desde `file://`: se ejecuta con `npm run dev` o con la compilación servida.
La API de producción no se puede modificar ni redesplegar: todo cambio va en el
frontend. Limitación conocida: la autenticación y los roles viven solo en el
cliente (`localStorage`), de modo que la API queda abierta.

Detalle completo: [knowledge-base/02_descripcion_general.md](knowledge-base/02_descripcion_general.md)

### Comandos

```bash
npm install        # instala las dependencias de desarrollo
npm run dev        # servidor de desarrollo (reenvía /api a la API de producción)
npm run build      # tsc (tipos estrictos) y compilación de producción en dist/
npm run preview    # sirve dist/ con el mismo reenvío de /api
npm test           # Vitest, una sola corrida
```

---

## Base de Conocimiento

La fuente de verdad del dominio vive en `knowledge-base/`. **Leer el archivo relevante ANTES de implementar.**

| Archivo | Cuándo leerlo |
|---|---|
| [01_vision_y_objetivos.md](knowledge-base/01_vision_y_objetivos.md) | Propósito, alcance por ejercicio, etapas y fuera de alcance |
| [02_descripcion_general.md](knowledge-base/02_descripcion_general.md) | Stack, arquitectura multipágina, vistas |
| [03_actores_y_roles.md](knowledge-base/03_actores_y_roles.md) | Operador único, capacidades por recurso, accesibilidad |
| [04_modelo_de_datos.md](knowledge-base/04_modelo_de_datos.md) | Entidades, venta como instantánea, claves de `localStorage`, datos iniciales |
| [05_reglas_de_negocio.md](knowledge-base/05_reglas_de_negocio.md) | Reglas codificadas (RN-XX-NN) |
| [06_funcionalidades.md](knowledge-base/06_funcionalidades.md) | Historias de usuario por épica y casos manuales CM-1 a CM-8 |
| [07_flujos_principales.md](knowledge-base/07_flujos_principales.md) | Flujos extremo a extremo, incluido el precio histórico |
| [08_arquitectura_propuesta.md](knowledge-base/08_arquitectura_propuesta.md) | Estructura de directorios, carga de scripts, exportación dual, verificación |
| [09_decisiones_y_supuestos.md](knowledge-base/09_decisiones_y_supuestos.md) | Decisiones DD-01 a DD-09 y supuestos a validar |
| [10_preguntas_abiertas.md](knowledge-base/10_preguntas_abiertas.md) | Inconsistencias y preguntas abiertas a resolver ANTES de codificar |

Pendiente de prioridad **Alta** en `10_preguntas_abiertas.md`:

- **PA-02**: fechas y canal de entrega; los comunica el docente por separado.

Cada change resuelve en su `/opsx:explore` las preguntas abiertas que lo
bloquean (columna «Bloquea» de ese archivo).

---

## Skills Disponibles

Fuente de verdad: `.atl/skill-registry.md`. Solo se listan las skills que
aplican a este stack; las de React, Python, SQL, Docker o Go del registro no
corresponden a este proyecto.

| Agente | Rol | Skills que carga |
|---|---|---|
| **Maquetado** | HTML semántico, formularios, tablas, estados | `accessibility` |
| **Presentación** | CSS propio, adaptación a 320 px y 1280 px, foco | `responsive-design` (solo su parte de CSS puro), `accessibility` |
| **Lógica y datos** | Funciones puras, almacén, `localStorage`, pruebas | `tdd`, `security-best-practices` |
| **Documentación y entrega** | README, casos manuales, armado de la entrega | `cognitive-doc-design`, `work-unit-commits` |
| **Orquestación** | SDD / OPSX / documentación de fundación | `kb-creator`, `roadmap-generator`, `agents-md-generator`, `skill-registry` |

Cargar la skill correspondiente al contexto ANTES de escribir código.

> El orquestador resuelve cada skill desde `.atl/skill-registry.md` (generado por `skill-registry`; no versionado). El registro es un índice de rutas: los subagentes leen el `SKILL.md` completo desde la ruta indicada. Esta tabla solo relaciona skill y rol.

---

## Roadmap de Changes

El plan de implementación completo está en [CHANGES.md](CHANGES.md). Resumen:

- **Total**: 6 changes en 3 fases, uno por ejercicio de la consigna (100 puntos).
- **Camino crítico** (5): `C-01 → C-03 → C-04 → C-05 → C-06`. C-02 avanza en paralelo y se une en C-06.
- **Hito 1 (Etapa 1, maqueta)**: C-01 + C-02.
- **Primer change**: `C-01` (`estructura-y-pantallas-html`).

| Change | Nombre | Depende de | Ejercicio |
|---|---|---|---|
| C-01 | `estructura-y-pantallas-html` | ninguna | 1 (20 puntos) |
| C-02 | `presentacion-css-y-uso-adaptable` | C-01 | 2 (20 puntos) |
| C-03 | `datos-locales-catalogo-y-filtro` | C-01 | 3 (15 puntos) |
| C-04 | `alta-de-libros-y-clientes` | C-03 | 4 (15 puntos) |
| C-05 | `venta-simulada-e-historial` | C-04 | 5 (20 puntos) |
| C-06 | `persistencia-verificacion-y-documentacion` | C-05, C-02 | 6 (10 puntos) |

No se crean changes adicionales: lo transversal se incluye en alguno de los seis.

**Antes de cualquier `/opsx:propose`**: leer [CHANGES.md](CHANGES.md), identificar las dependencias del change y los archivos de «Leer antes».

---

## Reglas Duras (específicas del proyecto)

> Reglas globales ya definidas en `~/.claude/CLAUDE.md` (orquestador, gobernanza, TDD, engram, commits convencionales sin coautoría de IA): el proyecto las hereda. Aquí viven solo las reglas **específicas de este proyecto**.

Son contrato; romperlas es un defecto. Las reglas 1 a 4 fijan la arquitectura
de la serie TypeScript (la consigna exige Vite, TypeScript estricto y datos desde
la API de producción).

1. **NUNCA** usar librerías de ejecución, frameworks ni CDNs de CSS o JavaScript → todo recurso (estilos, scripts, tipografías, imágenes) es propio y local; las únicas dependencias son de desarrollo: `vite`, `typescript`, `vitest` y `@types/node`.
2. **NUNCA** usar scripts clásicos ni el espacio de nombres global `Libreria` → módulos ES de TypeScript con `import`/`export` y `import type` para los tipos.
3. **NUNCA** dejar que `npm run build` falle ni usar `any` explícito → los tipos se declaran en `src/types/` y `tsc` corre en modo estricto sobre `src/` y `tests/`.
4. **NUNCA** acceder a datos o a la red fuera de los repositorios → las vistas usan solo `src/datos/proveedor.ts`; la red se dirige únicamente a la base del mismo origen (`/api`), nunca a `https://api.ismaelsuarez.me` en forma directa.
5. **NUNCA** insertar datos de usuario con `innerHTML` → usar `textContent` o creación de nodos.
6. **NUNCA** tocar el DOM dentro de `src/logica/` → allí solo funciones puras; el DOM vive en los módulos de `src/pages/` y en `src/utils/dom.ts`.
7. **NUNCA** acceder a `localStorage` fuera de `src/datos/local/almacen-local.ts` → toda lectura y escritura pasa por el almacén local, que implementa los repositorios.
8. **NUNCA** leer del catálogo el precio de una venta confirmada → la venta guarda copia del precio unitario y de los datos descriptivos.
9. **NUNCA** agregar edición o borrado de registros, gestión de stock ni cobros → el alcance es el de la consigna.
10. **NUNCA** marcar un caso manual como aprobado sin ejecutarlo → el README registra el resultado realmente observado; si falla o queda pendiente, se registra el comportamiento real.
11. **NUNCA** dar por terminada una vista sin comprobarla a 320 px y a 1280 px, con teclado y foco visible → sin desplazamiento horizontal de la página; las tablas se desplazan dentro de su contenedor.
12. **NUNCA** aplicar de `responsive-design` nada que requiera librerías → solo su parte de CSS puro.
13. **Idioma**: código (nombres de archivos, funciones y propiedades), interfaz y documentación en español neutro. Esta regla reemplaza, para este proyecto, el valor por defecto global de artefactos en inglés.
14. **NUNCA** usar `var` → declarar con `const` por defecto y con `let` solo cuando la variable se reasigna. Cada archivo es un módulo con su propio ámbito: no hace falta función envolvente.

15. **NUNCA** empezar a trabajar sin traer primero la memoria compartida → al iniciar una sesión, y después de cada `git pull`, `git merge` o cambio de rama, ejecutar `engram sync --import` en la raíz del proyecto. Antes de eso, comprobar que los hooks estén activos con `git config core.hooksPath`; si no devuelve `.githooks`, ejecutar `git config core.hooksPath .githooks`.
16. **NUNCA** hacer un commit sin la memoria actualizada → antes de cada `git commit`, ejecutar `engram sync` y sumar la carpeta con `git add .engram`, de modo que el commit y el `git push` lleven lo último. El hook `pre-commit` lo hace solo; si los hooks no están activos, hacerlo a mano.
17. **NUNCA** ejecutar `engram sync --all` ni `engram sync --cloud` en este proyecto → la base de Engram es global y `--all` publicaría la memoria de otros proyectos en un repositorio público. Usar siempre `engram sync` sin opciones, que exporta solo este proyecto.
18. **NUNCA** guardar en Engram datos personales, credenciales ni rutas de la máquina propia → el repositorio es público y todo lo que se guarda en la memoria del proyecto queda visible para cualquiera, incluidos los mensajes escritos al agente.

---

## Memoria Compartida (Engram)

La memoria del proyecto viaja dentro del repositorio, en `.engram/`, para que
los tres integrantes y sus agentes compartan decisiones y hallazgos.

| Momento | Qué ocurre | Quién lo hace |
|---|---|---|
| Después de `git pull`, `git merge`, `git rebase` o cambio de rama | `engram sync --import` | Hooks `post-merge`, `post-rewrite` y `post-checkout` |
| Antes de cada `git commit` | `engram sync` y `git add .engram` | Hook `pre-commit` |
| Al iniciar una sesión de trabajo | `engram sync --import` | El agente (regla dura 15) |

- **Activación, una sola vez por clon**: `git config core.hooksPath .githooks`. Git no activa hooks al clonar; hasta ejecutar ese comando nada es automático.
- El proyecto se llama `parcial_javascript` para Engram; lo fija `.engram/config.json` y no debe cambiarse.
- Si Engram no está instalado, los hooks no hacen nada y no interrumpen el commit.
- `.engram/manifest.json` puede entrar en conflicto si dos personas hacen commit a la vez: se resuelve conservando las entradas de ambos lados.

---

## Flujo de Trabajo

```
1. Leer la KB relevante (knowledge-base/)        → entender el dominio
2. Identificar el change en CHANGES.md           → respetar dependencias
3. /opsx:explore <nombre>                        → resolver las preguntas abiertas del change
4. /opsx:propose <nombre>                        → proposal + design + specs + tasks
5. /opsx:apply <nombre>                          → implementar las tasks cargando skills
6. /opsx:archive <nombre> + marcar [x]           → cerrar el change en CHANGES.md
```

- La lógica pura se escribe con pruebas primero (Vitest, `npm test`); el DOM se
  verifica con los casos manuales.
- Repositorio: <https://github.com/ismaelsuarez/utn-prog3-tpi-libreria> (público, rama `main`).
- No forman parte de la entrega: `node_modules/`, `dist/`, `tests/`, `docs/`, `discovery/`,
  `knowledge-base/`, `openspec/`, `.atl/`, `.claude/`, `CHANGES.md`,
  `AGENTS.md`, `CLAUDE.md` y `.active-orchestrator-state.json`.

Aplicar TODAS las reglas duras en cada paso. Ante conflicto entre la KB y este archivo, las reglas duras prevalecen.
