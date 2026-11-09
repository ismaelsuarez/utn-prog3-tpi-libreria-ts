# Reglas de Negocio

Cada regla tiene un código único `RN-{DOMINIO}-{NN}` para trazabilidad. Todas
provienen de la consigna (`docs/Repaso Primer Parcial.pdf`).

## Dominio: Catálogo (RN-CA)

- **RN-CA-01**: El catálogo se genera con JavaScript a partir del array de libros.
- **RN-CA-02**: Cada libro muestra título, ISBN, editorial, género, autores y precio.
- **RN-CA-03**: Un libro sin género asignado muestra «Sin clasificar».
- **RN-CA-04**: El filtro por título ignora diferencias entre mayúsculas y minúsculas.
- **RN-CA-05**: El filtro busca coincidencias parciales dentro del título.
- **RN-CA-06**: El filtro elimina los espacios sobrantes en los extremos de la búsqueda.
- **RN-CA-07**: Una búsqueda vacía muestra todo el catálogo.
- **RN-CA-08**: Una búsqueda sin coincidencias muestra un mensaje claro.

## Dominio: Libros (RN-LI)

- **RN-LI-01**: El título no puede estar vacío.
- **RN-LI-02**: El ISBN no puede estar vacío.
- **RN-LI-03**: El ISBN no puede existir ya en el conjunto local. Se compara
  sin espacios ni guiones.
- **RN-LI-04**: No se valida el dígito de control del ISBN.
- **RN-LI-05**: El precio es numérico y mayor que cero.
- **RN-LI-06**: La editorial es obligatoria y debe existir en los datos locales.
- **RN-LI-07**: Se selecciona al menos un autor.
- **RN-LI-08**: Todos los autores seleccionados deben existir en los datos locales.
- **RN-LI-09**: El género es opcional. Si se asigna, debe existir en los datos locales.
- **RN-LI-10**: El selector de género incluye la opción «Sin clasificar», que
  representa la ausencia de género.
- **RN-LI-11**: Las opciones de editorial, género y autores se generan a
  partir de los datos locales.
- **RN-LI-12**: No se editan ni eliminan libros.
- **RN-LI-13**: El stock es obligatorio y es un entero de 0 a 2 147 483 647
  (la API lo exige; la aplicación no lo muestra ni lo descuenta).
  Spec: `libros`, «Stock y límites del servidor en el alta de libro».
- **RN-LI-14**: Título de hasta 200 caracteres, ISBN de hasta 20 y precio de
  hasta 99 999 999,99, porque la API no los valida y fallaría; el precio se
  envía redondeado al centavo, con mitades hacia arriba.
  Spec: `libros`, «Stock y límites del servidor en el alta de libro».
- **RN-LI-15**: Cada autor elegido lleva un rol entre «autor», «coautor»,
  «traductor» e «ilustrador» (por defecto «autor») y un orden de autoría que
  empieza en 1 según la lista.
  Spec: `libros`, «Selección de autores».
- **RN-LI-16**: Si la API rechaza el alta, se muestra su mensaje (junto al campo
  en un 422) y se conserva lo escrito; sin respuesta no se anuncia éxito.
  Spec: `libros`, «Errores por campo sin registrar el libro» y «Efecto del alta
  de libro».

## Dominio: Clientes (RN-CL)

- **RN-CL-01**: El nombre completo no puede estar vacío. No hay campo de
  apellido separado.
- **RN-CL-02**: El email no puede estar vacío.
- **RN-CL-03**: El email debe tener un formato válido.
- **RN-CL-04**: No puede existir otro cliente con el mismo email. Se compara
  sin espacios exteriores y sin distinguir mayúsculas de minúsculas.
- **RN-CL-05**: No se editan ni eliminan clientes.
- **RN-CL-06**: El teléfono es obligatorio (7 a 15 dígitos, hasta 30
  caracteres); la dirección es opcional (hasta 255 caracteres; vacía se envía
  como `null`); el nombre admite hasta 100 caracteres y el email hasta 255.
  Spec: `clientes`, «Teléfono, dirección y límites del servidor en el alta de
  cliente».
- **RN-CL-07**: El perfil (teléfono y dirección) se registra una sola vez: un
  cliente con perfil no ofrece controles para cambiarlo y uno sin perfil ofrece
  «Completar perfil».
  Spec: `clientes`, «Perfil del cliente de una sola vez» y «Clientes no
  modificables».
- **RN-CL-08**: El alta registra primero el cliente y después su perfil; si el
  perfil falla, el cliente queda registrado, se informa el motivo y no se
  reintenta ninguna escritura.
  Spec: `clientes`, «Alta de cliente con perfil fallido».

## Dominio: Ventas (RN-VE)

- **RN-VE-01**: La venta requiere un cliente existente.
- **RN-VE-02**: La venta requiere al menos un renglón.
- **RN-VE-03**: Cada renglón corresponde a un libro existente.
- **RN-VE-04**: La cantidad es un entero mayor que cero. Se rechazan cero,
  negativos y decimales.
- **RN-VE-05**: No se admiten libros repetidos en una misma venta: se modifica
  la cantidad del renglón existente o se informa el duplicado. En ningún caso
  se crea un segundo renglón para el mismo libro.
- **RN-VE-06**: Antes de confirmar se pueden cambiar cantidades y quitar renglones.
- **RN-VE-07**: Cada renglón muestra libro, cantidad, precio unitario y subtotal.
- **RN-VE-08**: Subtotal = cantidad × precio unitario.
- **RN-VE-09**: Total = suma de los subtotales.
- **RN-VE-10**: Los importes se presentan con dos decimales.
- **RN-VE-11**: No se puede confirmar una venta sin cliente, sin renglones o
  con cantidades inválidas.
- **RN-VE-12**: Al confirmar se registran identificador, fecha, cliente,
  renglones y total.
- **RN-VE-13**: El precio unitario se copia al renglón como valor histórico.
  No se obtiene nuevamente del precio actual del catálogo al consultar el
  historial.
- **RN-VE-14**: La venta conserva los datos descriptivos necesarios para
  leerla (cliente y libros).
- **RN-VE-15**: La confirmación limpia el formulario para una nueva venta y
  muestra un mensaje de resultado.
- **RN-VE-16**: La venta no gestiona stock, cobros ni facturación fiscal.
- **RN-VE-17**: La cantidad de un renglón, sola o acumulada, no supera
  2 147 483 647.
  Spec: `ventas`, «Cantidad dentro del límite del servidor».
- **RN-VE-18**: La venta no valida ni descuenta el stock del libro (el
  servidor tampoco lo descuenta): se puede vender más que el stock cargado.
  Spec: `ventas`, «Venta sin control de stock».

## Dominio: Historial (RN-HI)

- **RN-HI-01**: El historial muestra identificador, fecha, cliente y total de
  cada venta.
- **RN-HI-02**: El historial permite consultar los renglones de una venta.
- **RN-HI-03**: Las ventas confirmadas no se editan ni eliminan desde la interfaz.
- **RN-HI-04**: Tras un cambio del precio de catálogo, el detalle de una venta
  anterior conserva precio unitario, subtotales y total confirmados.

## Dominio: Persistencia (RN-PE)

- **RN-PE-01**: Se utiliza `localStorage` para conservar libros, clientes y ventas.
- **RN-PE-02**: En el primer inicio se cargan los ejemplos.
- **RN-PE-03**: Al volver a abrir se recuperan los registros guardados sin
  duplicar los datos iniciales ni las ventas.

## Dominio: Formularios e interfaz (RN-UI)

- **RN-UI-01**: El envío de formularios se controla con `preventDefault`.
- **RN-UI-02**: Los errores se muestran cerca del formulario.
- **RN-UI-03**: El registro se agrega solo si todas las comprobaciones pasan.
- **RN-UI-03a**: Mientras una escritura espera la respuesta de la API, el botón
  de envío queda deshabilitado y un segundo envío no produce otra solicitud.
  Spec: `formularios-y-mensajes`, «Envío único mientras la operación está en
  curso».
- **RN-UI-04**: Tras un alta correcta, el listado y las opciones relacionadas
  se actualizan sin recargar la página.
- **RN-UI-05**: Los datos escritos por usuarios se insertan en el DOM como texto.
- **RN-UI-06**: Cada campo posee una etiqueta asociada.
- **RN-UI-07**: Los botones tienen textos que describen su acción.
- **RN-UI-08**: Las tablas incluyen encabezados.
- **RN-UI-09**: Existen mensajes para listas vacías, búsquedas sin resultados
  y operaciones correctas o rechazadas.
- **RN-UI-10**: Se usan encabezado, navegación y contenido principal con
  etiquetas semánticas.
- **RN-UI-11**: Los mensajes de error se expresan con texto y no dependen
  únicamente de un color.
- **RN-UI-12**: Los controles conservan un foco visible y se recorren con el teclado.
- **RN-UI-13**: Las imágenes informativas tienen texto alternativo; las
  decorativas no repiten información innecesaria.
- **RN-UI-14**: A 320 px y a 1280 px los textos y controles son legibles y el
  contenido no provoca desplazamiento horizontal de toda la página.
- **RN-UI-15**: Si una tabla necesita más espacio, se desplaza dentro de su
  propio contenedor.

## Dominio: Excepciones globales (RN-GL)

- **RN-GL-01**: Solo HTML, CSS y JavaScript nativos. No se usan librerías,
  frameworks ni CDNs de CSS o JavaScript.
- **RN-GL-02**: Estilos, scripts, imágenes y demás recursos se incluyen en el
  proyecto.
- **RN-GL-03**: El CSS se mantiene en archivos externos y se reutilizan clases
  para elementos equivalentes.
- **RN-GL-04**: Se usa Flexbox o Grid para organizar el contenido.
- **RN-GL-05**: No se requiere `fetch` ni ABM de editoriales, géneros o autores.
- **RN-GL-06**: La entrega no incluye dependencias instaladas ni herramientas
  de compilación.
- **RN-GL-07**: No se indica una prueba como aprobada sin ejecutarla. Si un
  caso falla o una funcionalidad queda pendiente, se registra el
  comportamiento real.
- **RN-GL-08**: En un avance de la Etapa 1 se identifica expresamente qué
  pantallas son maquetas y qué interacciones ya funcionan.
