# Preguntas Abiertas

## Inconsistencias detectadas

### IN-01 — Visibilidad entre páginas antes de la persistencia
**La consigna dice (ejercicio 4)**: tras un alta correcta, el listado y las opciones relacionadas se actualizan sin recargar la página; un libro nuevo debe aparecer en catálogo y selección de venta (CM-2).
**La decisión DD-01 dice**: cada vista es una página HTML distinta, sin memoria compartida.
**La consigna dice (ejercicio 6)**: `localStorage` se utiliza «en la etapa final».
**Impacto**: con varias páginas, un libro dado de alta en la página de Libros no puede aparecer en Catálogo ni en Ventas hasta que exista persistencia. Los ejercicios 4 y 5 no son comprobables de extremo a extremo antes del ejercicio 6.
**Resolución (decidida por el equipo, 2026-10-13)**: introducir el Almacén desde el ejercicio 3 con una interfaz estable y adelantar la escritura en `localStorage` al ejercicio 4, dejando para el ejercicio 6 la carga inicial sin duplicados, la documentación y los casos manuales. Ver DD-09 en `09_decisiones_y_supuestos.md`.

### IN-02 — «Sin recargar» frente a navegación entre páginas
**La consigna dice**: el listado y las opciones relacionadas se actualizan sin recargar la página.
**La decisión DD-01 implica**: las opciones relacionadas que viven en otra página (por ejemplo el selector de libros de Ventas) solo se actualizan al cargar esa página.
**Impacto**: interpretación del criterio de evaluación.
**Resolución propuesta**: «sin recargar» se cumple dentro de la página donde ocurre el alta; las demás páginas leen los datos vigentes al abrirse. Conviene explicarlo en el README.

## Preguntas abiertas (priorizadas)

| ID | Prioridad | Pregunta | Bloquea | Decisor |
|---|---|---|---|---|
| PA-01 | Resuelta | ¿Se adelanta la escritura en `localStorage` a los ejercicios 4 y 5? **Sí** (DD-09) | — | Equipo |
| PA-02 | Alta | Fechas y canal de entrega. El docente los comunica por separado | Planificación | Docente |
| PA-03 | Resuelta | Paleta de colores y tipografía local de la identidad visual. **Verde biblioteca + crema y tipografía del sistema** (DD-15, change `presentacion-css-y-uso-adaptable`) | — | Equipo |
| PA-04 | Media | ¿Cómo se distingue «primer inicio» de un almacenamiento parcialmente vacío (una clave presente y otra ausente)? | Change 6 | Equipo |
| PA-05 | Media | ¿Qué hace la aplicación si el contenido de `localStorage` es ilegible o fue alterado a mano? El docente lo edita en CM-6 | Change 6 | Equipo |
| PA-06 | Media | Ante un libro repetido en la venta, ¿se suma la cantidad al renglón existente o se informa el duplicado? La consigna admite ambas | Change 5 | Equipo |
| PA-07 | Media | Reparto de tareas entre los tres integrantes | Planificación | Equipo |
| PA-08 | Baja | Esquema de identificadores de libros, clientes y ventas (SU-03) | Change 3 | Equipo |
| PA-09 | Resuelta | ¿`index.html` es directamente el Catálogo o una portada? **Es el Catálogo** (DD-10, change `estructura-y-pantallas-html`) | — | Equipo |
| PA-10 | Baja | Formato de presentación de la fecha de la venta en el historial | Change 5 | Equipo |
| PA-11 | Baja | Criterio exacto de «email con formato válido» (SU-07) | Change 4 | Equipo |
| PA-12 | Resuelta | ¿El detalle de una venta se muestra en la misma página de Historial o en una página aparte? **En la misma página** (DD-11, change `estructura-y-pantallas-html`) | — | Equipo |
| PA-13 | Baja | ¿Se usan imágenes ajenas? Si las hay, el README debe indicar su procedencia | Change 6 | Equipo |
| PA-14 | Baja | ¿Cómo se excluyen de la entrega las carpetas de desarrollo (`tests/`, `openspec/`, `knowledge-base/`, `discovery/`, `docs/`)? | Entrega | Equipo |
| PA-15 | Media | Producción tiene 5 libros y la consigna pide al menos 6 (el resto de los mínimos se cumple: 3 editoriales, 3 géneros, 5 autores y 3 clientes). `operaciones-contra-api` no escribe en producción para completarlo. ¿Se registra el sexto libro desde la aplicación desplegada como operación real del bibliotecario, se pide al responsable del backend o se declara la diferencia en la entrega? | Entrega | Equipo |
