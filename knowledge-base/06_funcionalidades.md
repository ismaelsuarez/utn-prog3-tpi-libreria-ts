# Funcionalidades

Organizadas por **épica** (una por ejercicio de la consigna) y luego por
**historia de usuario** (formato US-NNN). Los puntajes provienen de la rúbrica.

## Épica 1: Estructura y pantallas HTML (20 puntos)

Rúbrica: vistas y navegación 10; semántica, formularios y estados 10.

### US-001 — Navegar entre las vistas
**Como** operador
**Quiero** una navegación clara entre Catálogo, Libros, Clientes, Ventas e Historial
**Para** llegar a cualquier operación desde cualquier página

**Criterios de aceptación**:
- [ ] `index.html` es la entrada del proyecto.
- [ ] Existen las cinco vistas y cada una enlaza a las demás.
- [ ] Cada página usa encabezado, navegación y contenido principal con
      etiquetas semánticas.

**Reglas relacionadas**: RN-UI-10

### US-002 — Maquetar formularios, tablas y estados
**Como** operador
**Quiero** formularios y listados con etiquetas, encabezados y mensajes de estado
**Para** entender qué se espera en cada campo y qué ocurrió tras cada acción

**Criterios de aceptación**:
- [ ] Catálogo: título de la librería, buscador por título y listado con
      título, ISBN, editorial, género, autores y precio.
- [ ] Libros: formulario de alta y listado.
- [ ] Clientes: formulario de alta y listado.
- [ ] Ventas: selección de cliente, composición de renglones y resumen.
- [ ] Historial: listado de ventas y acceso a sus detalles.
- [ ] Cada campo tiene una etiqueta asociada y cada botón un texto que
      describe su acción.
- [ ] Las tablas incluyen encabezados.
- [ ] Hay lugares previstos para mensajes de lista vacía, búsqueda sin
      resultados y operación correcta o rechazada.
- [ ] La estructura contempla los campos y estados que luego usa JavaScript.
- [ ] En la Etapa 1 los listados y el historial pueden mostrar datos estáticos.

**Reglas relacionadas**: RN-UI-06, RN-UI-07, RN-UI-08, RN-UI-09, RN-CA-02, RN-CA-03

## Épica 2: Presentación con CSS y uso adaptable (20 puntos)

Rúbrica: coherencia y organización 8; adaptación 8; accesibilidad básica 4.

### US-003 — Identidad visual coherente
**Como** operador
**Quiero** una interfaz con identidad visual propia y consistente
**Para** reconocer elementos equivalentes en todas las vistas

**Criterios de aceptación**:
- [ ] Se definen colores, tipografía, espaciado, tarjetas, formularios y botones.
- [ ] El CSS está en archivos externos.
- [ ] Se reutilizan clases para elementos equivalentes.
- [ ] No se usan librerías, frameworks ni CDNs; las tipografías son locales.

**Reglas relacionadas**: RN-GL-01, RN-GL-02, RN-GL-03

### US-004 — Interfaz adaptable
**Como** operador
**Quiero** usar la aplicación en pantallas angostas y anchas
**Para** trabajar tanto en un teléfono como en un escritorio

**Criterios de aceptación**:
- [ ] El contenido se organiza con Flexbox o Grid.
- [ ] A 320 px y a 1280 px los textos y controles son legibles.
- [ ] No hay desplazamiento horizontal de toda la página.
- [ ] Una tabla que necesita más espacio se desplaza dentro de su contenedor.

**Reglas relacionadas**: RN-GL-04, RN-UI-14, RN-UI-15

### US-005 — Accesibilidad básica
**Como** operador que usa teclado
**Quiero** foco visible y errores expresados con texto
**Para** operar sin depender del ratón ni del color

**Criterios de aceptación**:
- [ ] Todos los controles se recorren con el teclado y conservan foco visible.
- [ ] Los mensajes de error se expresan con texto.
- [ ] Las imágenes informativas tienen texto alternativo; las decorativas no
      repiten información.

**Reglas relacionadas**: RN-UI-11, RN-UI-12, RN-UI-13

## Épica 3: Datos locales, catálogo y filtro (15 puntos)

Rúbrica: modelo y ejemplos 5; renderizado 5; filtro y estados 5.

### US-006 — Modelo de datos y ejemplos
**Como** equipo
**Quiero** los datos representados con arrays y objetos con identificadores estables
**Para** generar la interfaz a partir de ellos

**Criterios de aceptación**:
- [ ] Hay al menos 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes ficticios.
- [ ] Cada libro tiene una editorial existente y uno o más autores existentes.
- [ ] El género es opcional y, si se asigna, existe.

### US-007 — Catálogo generado por JavaScript
**Como** operador
**Quiero** ver el catálogo armado desde los datos
**Para** que refleje siempre los libros registrados

**Criterios de aceptación**:
- [ ] El listado se genera desde el array de libros.
- [ ] Editorial, género y autores se resuelven por sus identificadores.
- [ ] Sin género se muestra «Sin clasificar».
- [ ] Los datos se insertan en el DOM como texto.
- [ ] Las funciones tienen responsabilidades reconocibles.

**Reglas relacionadas**: RN-CA-01, RN-CA-02, RN-CA-03, RN-UI-05

### US-008 — Filtro por título
**Como** operador
**Quiero** filtrar el catálogo escribiendo parte del título
**Para** encontrar un libro rápidamente

**Criterios de aceptación**:
- [ ] Ignora mayúsculas y minúsculas.
- [ ] Encuentra coincidencias parciales.
- [ ] Recorta espacios de los extremos.
- [ ] Búsqueda vacía muestra todo el catálogo.
- [ ] Sin coincidencias muestra un mensaje claro.

**Reglas relacionadas**: RN-CA-04 a RN-CA-08

## Épica 4: Alta de libros y clientes (15 puntos)

Rúbrica: libros y selectores 6; clientes 4; validación y actualización 5.

### US-009 — Alta de libro
**Como** operador
**Quiero** registrar un libro con título, ISBN, precio, editorial, género y autores
**Para** incorporarlo al catálogo y a la selección de ventas

**Criterios de aceptación**:
- [ ] Editorial y género se eligen con selectores generados desde los datos.
- [ ] Los autores se eligen con un selector múltiple o controles equivalentes.
- [ ] El selector de género ofrece «Sin clasificar».
- [ ] Se rechaza título vacío, ISBN vacío, ISBN existente (sin espacios ni
      guiones), precio no numérico o no mayor que cero, editorial inexistente,
      ningún autor y autor o género inexistente.
- [ ] Tras un alta correcta el listado se actualiza sin recargar.

**Reglas relacionadas**: RN-LI-01 a RN-LI-11, RN-UI-01 a RN-UI-04

### US-010 — Alta de cliente
**Como** operador
**Quiero** registrar un cliente con nombre completo y email
**Para** poder asignarle ventas

**Criterios de aceptación**:
- [ ] Se rechaza nombre completo vacío, email vacío y email con formato inválido.
- [ ] Se rechaza un email ya registrado, aunque difiera en mayúsculas o en
      espacios exteriores.
- [ ] Tras un alta correcta el listado se actualiza sin recargar.

**Reglas relacionadas**: RN-CL-01 a RN-CL-04, RN-UI-01 a RN-UI-04

## Épica 5: Venta simulada e historial (20 puntos)

Rúbrica: composición y validaciones 8; cálculos 5; confirmación e historial
inmutable 7.

### US-011 — Componer una venta
**Como** operador
**Quiero** elegir un cliente y agregar renglones con libro y cantidad
**Para** armar la venta antes de confirmarla

**Criterios de aceptación**:
- [ ] Se selecciona un cliente existente.
- [ ] Cada renglón tiene un libro existente y una cantidad entera mayor que cero.
- [ ] Un libro repetido no crea otro renglón: se actualiza la cantidad o se
      informa el duplicado.
- [ ] Se pueden cambiar cantidades y quitar renglones antes de confirmar.

**Reglas relacionadas**: RN-VE-01 a RN-VE-06

### US-012 — Calcular subtotales y total
**Como** operador
**Quiero** ver subtotal por renglón y total de la venta
**Para** conocer el importe antes de confirmar

**Criterios de aceptación**:
- [ ] Cada renglón muestra libro, cantidad, precio unitario y subtotal.
- [ ] Subtotal = cantidad × precio; total = suma de subtotales.
- [ ] Los importes se presentan con dos decimales.

**Reglas relacionadas**: RN-VE-07 a RN-VE-10

### US-013 — Confirmar la venta
**Como** operador
**Quiero** confirmar la venta
**Para** dejarla registrada con sus valores

**Criterios de aceptación**:
- [ ] No se confirma sin cliente, sin renglones o con cantidades inválidas.
- [ ] Se registran identificador, fecha, cliente, renglones y total.
- [ ] El precio unitario y los datos descriptivos se copian a la venta.
- [ ] El formulario se limpia y se muestra un mensaje de resultado.

**Reglas relacionadas**: RN-VE-11 a RN-VE-15

### US-014 — Consultar el historial
**Como** operador
**Quiero** ver las ventas confirmadas y el detalle de cada una
**Para** revisar qué se vendió y a qué importes

**Criterios de aceptación**:
- [ ] El listado muestra identificador, fecha, cliente y total.
- [ ] Se pueden consultar los renglones de cada venta.
- [ ] No hay controles para editar ni eliminar ventas.
- [ ] El detalle no depende del precio actual del catálogo.

**Reglas relacionadas**: RN-HI-01 a RN-HI-04

## Épica 6: Persistencia, verificación y documentación (10 puntos)

Rúbrica: persistencia 4; pruebas manuales registradas 3; documentación y
entrega 3.

### US-015 — Persistir los datos
**Como** operador
**Quiero** que libros, clientes y ventas se conserven al cerrar y volver a abrir
**Para** no perder lo registrado

**Criterios de aceptación**:
- [ ] Se guardan libros, clientes y ventas en la API (desde `operaciones-contra-api`; antes, en `localStorage`).
- [ ] La aplicación no carga ejemplos: los datos iniciales son los sembrados en la API.
- [ ] Al recargar no se duplican libros, clientes ni ventas.

**Reglas relacionadas**: RN-PE-01 a RN-PE-03

### US-016 — Registrar los casos manuales
**Como** docente evaluador
**Quiero** ver el resultado observado de cada caso manual
**Para** contrastarlo con el comportamiento real

**Criterios de aceptación**: el README registra el resultado observado de:

| # | Caso | Resultado esperado |
|---|---|---|
| CM-1 | Búsqueda con una parte del título en mayúsculas; luego búsqueda vacía y texto inexistente | Coincidencias sin distinguir mayúsculas; catálogo completo; mensaje sin resultados |
| CM-2 | Alta de libro con ISBN existente y luego con ISBN nuevo | El duplicado se rechaza; el válido aparece en Libros, Catálogo y selección de venta |
| CM-3 | Alta de cliente con email inválido, email existente en mayúsculas y email nuevo | Se rechazan los dos primeros; el nuevo aparece en listado y selección |
| CM-4 | Venta sin cliente, cantidad cero, negativa o decimal; libro repetido | No se confirma; el duplicado no crea otro renglón |
| CM-5 | Venta válida: dos unidades a 1500 y una a 2000 | Subtotales 3000 y 2000; total 5000; detalle conservado en el historial |
| CM-6 | Venta confirmada y cambio exclusivo del precio del libro con `PATCH /libros/{id}` en el backend local (nunca en producción) | Tras recargar el Historial, el precio unitario, los subtotales y el total de esa venta conservan los valores confirmados |
| CM-7 | Recarga después de altas y venta | Se recuperan los datos de la API sin duplicar libros, clientes ni ventas |
| CM-8 | Navegación por teclado y anchos de 320 px y 1280 px | Foco visible, controles utilizables y tabla con desplazamiento propio si lo necesita |

**Reglas relacionadas**: RN-GL-07

### US-017 — Documentar y entregar
**Como** docente evaluador
**Quiero** un README completo y una entrega sin dependencias
**Para** abrir y evaluar el trabajo sin instalar nada

**Criterios de aceptación**: el README contiene

- [ ] Integrantes del trabajo.
- [ ] Pasos para abrir `index.html` en el navegador sin npm.
- [ ] Navegación entre vistas.
- [ ] Funcionalidades implementadas y pendientes.
- [ ] Ubicación de los datos iniciales.
- [ ] Origen de los datos (la API) y qué se guarda aún en `localStorage` (usuarios y
      sesión; depende del navegador y no comparte información entre usuarios).
- [ ] Cómo reproducir CM-6 con el backend local de Docker.
- [ ] Resultados de los casos manuales.
- [ ] Procedencia de imágenes ajenas, si existen.
- [ ] La entrega es una carpeta o archivo comprimido con `index.html`, los
      demás HTML, carpetas de CSS, JavaScript y recursos locales, y `README.md`,
      sin dependencias ni herramientas de compilación.

**Reglas relacionadas**: RN-GL-06, RN-GL-08
