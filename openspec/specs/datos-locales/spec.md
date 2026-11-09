# datos-locales Specification

## Purpose
Representa los datos de la librería (editoriales, géneros, autores, libros y clientes) como arreglos de objetos con identificadores estables y datos iniciales de ejemplo, y concentra su consulta en un único punto de lectura al que acceden todas las vistas.

## Requirements

### Requirement: Identificadores estables

Toda entidad del modelo (editorial, género, autor, libro y cliente) SHALL tener un identificador de texto único, de forma prefijo más contador (por ejemplo `edi-01`, `lib-03`), que NO cambie una vez asignado y NO dependa de servicios externos. Fuera del almacén local, cada identificador SHALL exponerse como el número entero de su contador (`lib-03` → `3`), y un número recibido SHALL resolverse al registro cuyo contador vale ese número.

#### Scenario: Cada entidad tiene su identificador

- **WHEN** se inspecciona cualquier registro de los datos iniciales
- **THEN** posee un identificador de texto único que lo distingue dentro de su entidad

#### Scenario: El esquema no depende de servicios del navegador

- **WHEN** se generan o leen identificadores sin conexión a Internet
- **THEN** los identificadores pueden generarse y leerse sin usar servicios de contexto seguro ni conexión

#### Scenario: Identificador expuesto como entero

- **WHEN** el repositorio entrega el libro guardado con identificador `lib-07`
- **THEN** su identificador es el entero `7`, y pedir el libro `7` devuelve ese mismo registro

### Requirement: Datos iniciales de ejemplo

Los datos iniciales SHALL incluir al menos 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes ficticios. Cada libro SHALL referenciar una editorial existente y al menos un autor existente; el género SHALL ser opcional y, cuando exista, referenciar un género existente.

#### Scenario: Mínimos exigidos

- **WHEN** se cuentan los registros de datos iniciales
- **THEN** hay al menos 6 libros, 2 editoriales, 2 géneros, 3 autores y 3 clientes, todos ficticios

#### Scenario: Relaciones existentes

- **WHEN** se recorre cada libro de los datos iniciales
- **THEN** su editorial, su género (si lo tiene) y todos sus autores existen en los datos

#### Scenario: Casos exigidos por los casos manuales

- **WHEN** se revisa el conjunto inicial
- **THEN** incluye al menos un libro sin género, al menos un libro con más de un autor y libros con precios 1500 y 2000

### Requirement: Normalización compartida

El proyecto SHALL proveer reglas compartidas de normalización: el texto de búsqueda se recorta y se compara sin distinguir mayúsculas de minúsculas, el ISBN se compara sin espacios ni guiones, y el email se recorta y se pasa a minúsculas.

#### Scenario: Texto de búsqueda normalizado

- **WHEN** se normaliza un texto con espacios en los extremos y mezcla de mayúsculas
- **THEN** se obtiene el texto sin esos espacios y en minúsculas

#### Scenario: ISBN normalizado

- **WHEN** se normaliza un ISBN con espacios y guiones
- **THEN** se obtiene el mismo ISBN sin espacios ni guiones

#### Scenario: Email normalizado

- **WHEN** se normaliza un email con espacios exteriores y mayúsculas
- **THEN** se obtiene el email sin esos espacios y en minúsculas

### Requirement: Persistencia de libros y clientes en el navegador

El Almacén SHALL leer y escribir los libros y los clientes en `localStorage` del navegador, bajo las claves `libreria.libros` y `libreria.clientes`. El acceso a `localStorage` SHALL concentrarse en el componente de almacén: ningún script de página ni función de lógica accede directamente. Cuando el entorno no ofrece `localStorage` (por ejemplo Node en las pruebas), el Almacén SHALL operar en memoria con los datos iniciales.

#### Scenario: Escritura bajo la clave correspondiente

- **WHEN** se registra un libro o un cliente por primera vez
- **THEN** la lista completa queda guardada en `localStorage` bajo `libreria.libros` o `libreria.clientes`, según la entidad

#### Scenario: Acceso concentrado

- **WHEN** se revisa el código del proyecto
- **THEN** `localStorage` solo aparece en el componente de almacén, no en la lógica ni en los scripts de página

#### Scenario: Entorno sin `localStorage`

- **WHEN** el almacén se usa en un entorno sin `localStorage` (las pruebas de Node)
- **THEN** las lecturas y altas funcionan en memoria sobre los datos iniciales, sin errores

### Requirement: Lectura que prioriza lo guardado con carga provisoria de ejemplos

`obtenerLibros`, `obtenerClientes` y `obtenerVentas` SHALL devolver lo guardado en `localStorage` cuando la clave existe y contiene un arreglo JSON válido; en caso contrario (clave ausente o contenido ilegible) SHALL devolver los datos iniciales de ejemplo —o la lista vacía, en el caso de ventas— sin modificar el almacenamiento: la lectura no siembra la clave. El almacén SHALL exponer una operación de inicialización, invocada al comienzo de cada script de página, que siembra únicamente las claves ausentes en el primer inicio: `libreria.libros` y `libreria.clientes` con sus datos iniciales de ejemplo y `libreria.ventas` con una lista vacía. «Primer inicio» equivale a la ausencia de la clave correspondiente; no existe una clave marcadora adicional. Las claves presentes se respetan: un arreglo JSON válido no se sobrescribe ni se duplica, y un contenido ilegible se conserva intacto. La inicialización SHALL ser idempotente: volver a ejecutarla no duplica datos. Un fallo al escribir la siembra no SHALL interrumpir la carga de la página: el almacén degrada a su reserva en memoria para esa sesión.

#### Scenario: Clave ausente

- **WHEN** se lee una clave que no existe todavía, sin haber ejecutado la inicialización
- **THEN** se devuelven los datos iniciales de ejemplo —o la lista vacía para ventas— y la clave no se escribe

#### Scenario: Contenido ilegible

- **WHEN** el contenido de la clave no es un arreglo JSON válido
- **THEN** se devuelven los datos iniciales de ejemplo y tanto la lectura como la inicialización conservan el contenido alterado sin sobrescribirlo; un alta posterior sí reemplaza la lista completa

#### Scenario: Contenido guardado

- **WHEN** ya se registraron libros, clientes o ventas en una sesión anterior
- **THEN** al abrir cualquier página se leen esos registros guardados, sin duplicar los ejemplos ni las ventas

#### Scenario: Primer inicio siembra las tres claves

- **WHEN** el almacenamiento no tiene ninguna de las tres claves y se ejecuta la inicialización
- **THEN** se escriben `libreria.libros` y `libreria.clientes` con sus datos iniciales de ejemplo y `libreria.ventas` con una lista vacía, y las lecturas devuelven esos datos

#### Scenario: Reapertura sin duplicados

- **WHEN** las tres claves existen con arreglos JSON válidos y se vuelve a ejecutar la inicialización
- **THEN** no se escribe ninguna clave y las lecturas devuelven lo guardado, sin agregar de nuevo los ejemplos ni duplicar ventas

#### Scenario: Clave parcial solo siembra la ausente

- **WHEN** existe únicamente una de las tres claves con contenido válido y se ejecuta la inicialización
- **THEN** solo se siembra la clave ausente y la clave existente conserva su contenido sin sobrescritura

#### Scenario: Fallo de escritura durante la siembra

- **WHEN** el navegador rechaza la escritura de una clave durante la inicialización
- **THEN** la página termina de cargar sin errores y el almacén responde en memoria para esa sesión, sin presentar la siembra como guardada duradero

### Requirement: Registro con identificador nuevo en el Almacén

Al registrar un libro o un cliente, el Almacén SHALL asignar un identificador nuevo con el esquema de prefijo más contador de al menos dos dígitos (`lib-07`, `cli-04`, …), copiar los datos recibidos (incluida una copia de la lista de autores en el libro), agregar el registro a la lista completa y persistirla, y devolver el registro almacenado. El Almacén no valida ni normaliza: la validación es responsabilidad del formulario. No se ofrecen operaciones de edición ni borrado.

#### Scenario: Identificador siguiente

- **WHEN** se registra un libro con los seis ejemplos existentes, o un cliente con los tres ejemplos existentes
- **THEN** el registro nuevo recibe `lib-07` o `cli-04` respectivamente

#### Scenario: Alta sobre una clave ausente

- **WHEN** se registra un libro o cliente cuando la clave de `localStorage` todavía no existe
- **THEN** se persisten los ejemplos más el registro nuevo, sin perder datos

#### Scenario: Devolución del registro almacenado

- **WHEN** la operación de registro termina correctamente
- **THEN** devuelve el libro o cliente ya almacenado, con su identificador asignado y su lista de autores copiada

### Requirement: Lectura y persistencia de ventas
El almacén SHALL recuperar y agregar ventas mediante su interfaz existente, usando exclusivamente la clave `libreria.ventas`. Una clave ausente SHALL representar una lista vacía; leerla no SHALL escribir datos. Registrar una venta válida SHALL conservar las anteriores y persistir la lista completa sin tocar libros ni clientes.

#### Scenario: Primera venta
- **WHEN** se registra la primera venta y no existe `libreria.ventas`
- **THEN** se guarda una lista con esa venta bajo dicha clave, sin sembrar ni modificar otras claves

#### Scenario: Ventas anteriores conservadas
- **WHEN** se registra una segunda venta
- **THEN** quedan ambas ventas en orden de registro y las lecturas posteriores no duplican ninguna

#### Scenario: Lectura sin siembra
- **WHEN** se consulta la lista sin clave de ventas
- **THEN** se obtiene una lista vacía y no se produce ninguna escritura

### Requirement: Identificador asignado al registrar la venta
El almacén SHALL ser la única autoridad que asigna el identificador persistido de cada venta, con prefijo `ven-` y contador de al menos dos dígitos superior al máximo existente. El alta SHALL devolver el registro guardado con ese identificador y no SHALL ofrecer edición ni eliminación.

#### Scenario: Identificadores sucesivos
- **WHEN** se registran dos ventas desde una lista vacía
- **THEN** reciben `ven-01` y `ven-02`, respectivamente

#### Scenario: Contador basado en el máximo
- **WHEN** las ventas existentes incluyen `ven-02` y `ven-07` y se registra otra
- **THEN** la nueva venta recibe `ven-08`, sin reutilizar identificadores

### Requirement: Copias independientes de ventas
El almacén SHALL copiar los datos de la venta, incluyendo el objeto cliente, el arreglo de renglones y cada renglón, tanto al registrar como al devolver registros. Modificar una entrada o una respuesta no SHALL alterar otras lecturas ni los datos guardados.

#### Scenario: Mutación de entrada o respuesta del alta
- **WHEN** después de registrar se modifican el cliente o los renglones de la entrada o del registro devuelto
- **THEN** una lectura nueva conserva los datos originalmente guardados

#### Scenario: Mutación de una lectura
- **WHEN** se cambia el precio de un renglón o se elimina una fila de una lista de ventas leída
- **THEN** otra lectura devuelve la venta íntegra con sus importes originales

### Requirement: Compatibilidad y errores del almacenamiento de ventas
Las operaciones de ventas SHALL conservar el modo en memoria cuando Node no ofrece almacenamiento y no SHALL alterar los contratos de libros y clientes. En el navegador, la imposibilidad de persistir SHALL informarse al llamador como fallo, sin sustituirla por un éxito en memoria. Los errores de lectura o escritura SHALL permitir a la interfaz conservar el borrador.

#### Scenario: Pruebas sin almacenamiento
- **WHEN** se usa el almacén en Node sin `localStorage`
- **THEN** se pueden agregar y consultar ventas en memoria con identificadores y copias independientes

#### Scenario: Escritura rechazada
- **WHEN** el navegador rechaza la escritura de la lista de ventas
- **THEN** el alta comunica el error y no devuelve una venta como si hubiera sido guardada

#### Scenario: Acceso bloqueado en navegador
- **WHEN** el navegador no permite acceder al almacenamiento necesario para confirmar
- **THEN** el alta comunica que no pudo persistir y no presenta la reserva en memoria como guardado duradero

#### Scenario: Contratos existentes conservados
- **WHEN** se registran o consultan libros y clientes después de incorporar ventas
- **THEN** se conservan sus firmas, claves, normalización, datos, identificadores y comportamiento previo

### Requirement: Almacén local para las vistas de gestión

El almacén local SHALL ser la implementación transitoria de los repositorios que usan las vistas de gestión (Libros, Clientes, Ventas e Historial): lectura de libros, clientes, ventas, editoriales, géneros y autores y las altas existentes, siempre por esos repositorios. El Catálogo SHALL leer los libros de la API, no del almacén. Ninguna página SHALL usar el almacén ni los datos iniciales en forma directa.

#### Scenario: Las vistas de gestión leen a través del almacén

- **WHEN** la vista Libros o la vista Ventas necesita el listado de libros
- **THEN** lo obtiene del repositorio de libros, que hoy lo lee del almacén local, sin acceder a los datos iniciales en forma directa

#### Scenario: El Catálogo no lee el almacén local

- **WHEN** la vista Catálogo necesita el listado de libros
- **THEN** lo obtiene del repositorio de lectura de libros sobre la API, y lo guardado en `libreria.libros` no aparece en el Catálogo

#### Scenario: La interfaz de lectura es estable

- **WHEN** se consulta al repositorio por libros, clientes, ventas, editoriales, géneros o autores
- **THEN** cada operación devuelve el conjunto correspondiente listo para usar, con la misma forma de datos en todas las páginas y la forma de la API de producción

#### Scenario: Formato guardado sin cambios

- **WHEN** un navegador ya tiene guardadas las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` escritas por la versión anterior, en el mismo origen
- **THEN** la aplicación las lee sin migrarlas ni reescribirlas, y las altas posteriores mantienen el mismo formato
