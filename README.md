<div align="center">

# Librería El Faro

**Trabajo Práctico Integrador · Frontend de una librería**

Programación III · Tecnicatura Universitaria en Programación a Distancia · UTN
Unidad HTML, CSS y JavaScript · Revisor de la unidad: Prof. Matías Torres

`HTML5` · `CSS3` · `JavaScript nativo` · `localStorage` · Sin librerías, frameworks ni CDNs

</div>

---

## 👥 Integrantes

| Integrante | Usuario de GitHub |
|---|---|
| **Avalos Pablo** | [@pabloavalos25](https://github.com/pabloavalos25) |
| **Blangetti Sofia** | [@Sofiablangetti](https://github.com/Sofiablangetti) |
| **Suarez Ismael** | [@ismaelsuarez](https://github.com/ismaelsuarez) |

---

## Resumen

Frontend de una librería ficticia: catálogo con buscador, alta de libros y
clientes, venta simulada con comprobante e historial de ventas, escrito en
TypeScript estricto y compilado con Vite.

> [!NOTE]
> **Estado de la migración**: las vistas acceden a los datos solo mediante
> repositorios con la forma de la API de producción
> (`https://api.ismaelsuarez.me`). Por ahora esos repositorios guardan los datos
> en `localStorage`; los changes `cliente-http-y-catalogo` y
> `operaciones-contra-api` los conectarán con la API a través de la base `/api`
> del mismo origen. El registro y el inicio de sesión ya existen
> (`registro-login-y-sesion`); la protección de las páginas según el rol llega
> con `proteccion-de-rutas-y-roles`. Todo vive solo en el navegador: la API no
> tiene usuarios y queda abierta (ver [Usuarios de demostración y
> seguridad](#usuarios-de-demostración-y-seguridad)).

> [!NOTE]
> Los datos de ejemplo son ficticios. Las validaciones del navegador sirven para
> la práctica; no representan seguridad ni integridad garantizada por un
> servidor. No se gestionan cobros ni facturación fiscal.

## Contenido

- [Cómo abrir el proyecto](#cómo-abrir-el-proyecto)
- [Navegación entre vistas](#navegación-entre-vistas)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Funcionalidades pendientes](#funcionalidades-pendientes)
- [Usuarios de demostración y seguridad](#usuarios-de-demostración-y-seguridad)
- [Datos y almacenamiento](#datos-y-almacenamiento)
- [Casos manuales: resultado observado](#casos-manuales-resultado-observado)
- [Imágenes y recursos](#imágenes-y-recursos)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Entrega](#entrega)
- [Para quienes desarrollan](#para-quienes-desarrollan)

---

## Cómo abrir el proyecto

Requisitos: Node 20.19 o superior (o 22.12 o superior), exigencia de Vite 7, y
npm.

```bash
npm install        # una sola vez: instala las dependencias de desarrollo
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # comprueba los tipos y genera la compilación en dist/
npm run preview    # sirve dist/ localmente
npm test           # corre la suite de Vitest una sola vez
```

1. Ejecutar `npm install` y luego `npm run dev`.
2. Abrir la dirección que informa el servidor (por defecto `http://localhost:5173`):
   la página de entrada lleva al login.
3. Ingresar con un usuario de demostración (ver [Usuarios de demostración y
   seguridad](#usuarios-de-demostración-y-seguridad)) o crear una cuenta; el
   administrador llega a Libros y el cliente al Catálogo.
4. Navegar entre las vistas con la barra superior.

El proyecto ya no se abre con doble clic desde `file://`: los módulos de
TypeScript necesitan un servidor. Los estilos, imágenes y scripts siguen siendo
locales, sin librerías de ejecución ni CDNs.

**Contexto seguro**: el login y el registro protegen la contraseña con la API
criptográfica del navegador (`crypto.subtle`), que solo existe en `localhost` y
en HTTPS. Abrir la aplicación desde `http://<IP de la red>` muestra un mensaje de
error al crear una cuenta o ingresar.

**Cambio de origen**: lo guardado en el navegador cuando se abría desde
`file://` no se ve en `http://localhost:5173`, porque `localStorage` es propio de
cada origen. Es esperado: en el origen nuevo se vuelven a cargar los ejemplos.

**API de producción**: el navegador usa la base `/api` del mismo origen
(`VITE_API_BASE`); `npm run dev` y `npm run preview` la reenvían a
`https://api.ismaelsuarez.me` (variable `API_PROXY_TARGET`). Ver `.env.example`.

## Navegación entre vistas

Las cinco páginas de la librería comparten la misma barra de navegación, que
indica la vista actual, y muestran en el encabezado el email del usuario en curso
con el botón «Cerrar sesión». Las páginas de acceso (login y registro) no la
muestran y se enlazan entre sí.

| Vista | Archivo | Qué se hace |
|---|---|---|
| Ingresar | `src/pages/auth/login/login.html` (`index.html` redirige aquí) | Iniciar sesión con email y contraseña; lleva a Libros (administrador) o al Catálogo (cliente) |
| Crear cuenta | `src/pages/auth/registro/registro.html` | Registrarse con email y contraseña (siempre como cliente) |
| Catálogo | `src/pages/client/catalogo/catalogo.html` | Buscar por título y ver los libros en tarjetas, con su ficha de lectura |
| Libros | `src/pages/admin/libros/libros.html` | Registrar un libro y consultar la tabla de libros |
| Clientes | `src/pages/admin/clientes/clientes.html` | Registrar un cliente, consultar la tabla y editar sus datos de contacto |
| Ventas | `src/pages/admin/ventas/ventas.html` | Elegir cliente, armar los renglones, confirmar y ver el comprobante |
| Historial | `src/pages/admin/historial/historial.html` | Consultar las ventas confirmadas y el detalle de cada una |

## Funcionalidades implementadas

### Catálogo

- Tarjetas generadas desde los datos: título, ISBN, editorial, género, autores
  y precio. Un libro sin género muestra «Sin clasificar».
- Filtro por título: no distingue mayúsculas de minúsculas, admite
  coincidencias parciales e ignora los espacios de los extremos. Una búsqueda
  vacía muestra todo el catálogo; una sin coincidencias muestra un mensaje.
- **Ficha de lectura**: el botón «Ver sinopsis» de cada tarjeta abre un
  diálogo con portada, datos y sinopsis. Las sinopsis de los seis libros de
  ejemplo son ilustrativas y la ficha lo aclara.

### Libros

- Editorial y género se eligen con selectores, y los autores con casillas;
  todas las opciones salen de los datos locales. El género incluye
  «Sin clasificar».
- Validaciones:

  | Campo | Regla |
  |---|---|
  | Título | Obligatorio |
  | ISBN | Obligatorio y sin repetir; se compara sin espacios ni guiones (sin dígito de control) |
  | Precio | Numérico y mayor que cero |
  | Editorial | Obligatoria y existente en los datos |
  | Autores | Al menos uno; todos existentes en los datos |
  | Género | Opcional; si se elige, debe existir en los datos |

- Los errores se muestran junto a cada campo. El alta correcta actualiza la
  tabla sin recargar la página.

### Clientes

- Alta con **nombre completo, email y teléfono**:

  | Campo | Regla |
  |---|---|
  | Nombre completo | Obligatorio |
  | Email | Obligatorio, con formato válido y sin repetir (se compara sin espacios exteriores y sin distinguir mayúsculas) |
  | Teléfono | Obligatorio, de 7 a 15 dígitos; admite `+`, espacios, guiones, puntos y paréntesis |

- **Edición de datos de contacto** desde el botón «Editar» de cada fila, con
  las mismas validaciones. Las ventas ya confirmadas conservan los datos del
  cliente que tenían al confirmarse.

### Ventas

- Se elige un cliente existente y se agregan renglones con un libro y una
  cantidad entera mayor que cero.
- Agregar otra vez el mismo libro suma la cantidad al renglón existente, sin
  duplicar filas. Antes de confirmar se pueden cambiar cantidades y quitar
  renglones.
- Cada renglón muestra libro, cantidad, precio unitario y subtotal, con dos
  decimales. El total es la suma de los subtotales.
- No se confirma una venta sin cliente, sin renglones o con cantidades
  inválidas.
- Al confirmar, el formulario se limpia, se muestra un mensaje y se abre un
  **comprobante interno no fiscal** animado, que se puede imprimir o guardar
  como PDF desde el navegador. Con «reducir movimiento» activado, el
  comprobante aparece sin animación.

**Importes**: el precio unitario se redondea al centavo antes de multiplicar,
con las mitades hacia arriba. Por ejemplo, `1500,125` pasa a `1500,13` y dos
unidades cuestan `3000,26`. Los cálculos usan centavos enteros.

### Historial

- Tabla con identificador, fecha (`dd/mm/aaaa HH:mm`, hora local), cliente y
  total, y un botón para ver el detalle de cada venta.
- El historial lee la **copia guardada en la venta**, no el catálogo actual:
  si después cambia el precio de un libro, la venta conserva sus importes.
- Las ventas confirmadas no se editan ni se eliminan desde la interfaz.

> [!NOTE]
> «Sin recargar» significa dentro de la misma página donde ocurre el alta.
> Al navegar a otra vista, esa vista vuelve a leer el almacenamiento.

## Funcionalidades pendientes

No hay funcionalidades pendientes: las cinco vistas y todas las operaciones
de la consigna están implementadas.

Además del alcance pedido, el proyecto incluye la ficha de lectura del
Catálogo, el comprobante de venta y la edición de los datos de contacto de
los clientes.

---

## Usuarios de demostración y seguridad

**Usuario administrador de demostración** (se crea solo en el primer inicio, si la
clave `users` no existe):

| Email | Contraseña | Rol | Después de ingresar |
|---|---|---|---|
| `admin@libreria.test` | `Faro-Admin-2026` | `admin` | Libros |

Son **datos de prueba** de una aplicación sin seguridad de servidor, para el
evaluador; no son un secreto ni deben reutilizarse en otro sistema, y la página de
login no los muestra. Quien se registra desde la página de registro queda siempre
con el rol `client` y llega al Catálogo; la página no ofrece elegir el rol.

**Lo que se guarda** (claves fijadas por la consigna, sin el prefijo `libreria.`):

| Clave | Contenido |
|---|---|
| `users` | Arreglo de usuarios: `email` (recortado y en minúsculas), `role`, `creadoEn` y `contrasena`, que no es el texto sino una huella PBKDF2-SHA-256 con sal propia de cada usuario (`algoritmo`, `iteraciones`, `sal`, `huella`) |
| `userData` | La sesión en curso: exactamente `email`, `loggedIn: true` y `role`; nunca la contraseña ni su huella. «Cerrar sesión» la quita y no cambia `users` |

> [!WARNING]
> **Limitación de seguridad**: el registro, el login, la sesión y los roles
> existen **solo en el navegador**. Cualquiera con acceso al navegador puede editar
> `userData` (por ejemplo, escribir `role: "admin"`) sin conocer ninguna
> contraseña, y la API de producción no exige autenticación. La huella evita
> exponer en `localStorage` las contraseñas escritas, nada más: no es seguridad
> real. Si se borra `users` del navegador, el administrador de demostración se
> vuelve a crear al abrir cualquier página; los demás usuarios se pierden.

## Datos y almacenamiento

### Datos iniciales

Viven en `src/datos/local/datos-iniciales.ts`: 6 libros, 2 editoriales, 2 géneros,
3 autores y 3 clientes ficticios, con identificadores estables (`lib-01`,
`edi-01`, `gen-01`, `aut-01`, `cli-01`…). Editoriales, géneros y autores
**no se guardan** en `localStorage`: se leen siempre de ese archivo. Las
vistas no lo importan: piden los datos a los repositorios
(`src/datos/repositorios.ts`), que hoy implementa un adaptador sobre
`localStorage` y que `cliente-http-y-catalogo` y `operaciones-contra-api`
reemplazarán por la API de producción sin tocar las vistas.

### Cómo funciona `localStorage`

- Solo `src/datos/local/almacen-local.ts` nombra `localStorage`; los almacenes de
  `src/datos/local/` (datos de la librería, usuarios y sesión) reciben el
  almacenamiento ya obtenido.
- En el **primer inicio**, la raíz de composición (`src/datos/proveedor.ts`)
  carga los ejemplos en las claves que faltan. Al volver a abrir, se recuperan los registros guardados **sin
  duplicar** los datos iniciales.
- Identificadores nuevos: `lib-07`, `cli-04`, `ven-01`, etc.

| Clave | Contenido |
|---|---|
| `libreria.libros` | Arreglo de libros: `id`, `titulo`, `isbn`, `precio`, `editorialId`, `generoId` (o `null`) y `autorIds` |
| `libreria.clientes` | Arreglo de clientes: `id`, `nombreCompleto`, `email` y, en los registrados desde la interfaz, `telefono` |
| `users` y `userData` | Usuarios y sesión: ver [Usuarios de demostración y seguridad](#usuarios-de-demostración-y-seguridad) |
| `libreria.ventas` | Arreglo de ventas `{id, fecha, cliente, renglones, total}`; cada renglón guarda `libroId`, `titulo`, `isbn`, `cantidad`, `precioUnitario` y `subtotal` |

### Límites

> [!IMPORTANT]
> `localStorage` depende del **navegador**, del **perfil** y de la
> **ubicación desde la que se abre** el proyecto. Los datos **no se comparten
> entre usuarios** ni entre perfiles, no se respaldan en un servidor y se
> pierden si el navegador borra los datos del sitio. No se sincronizan
> pestañas abiertas en simultáneo.

**Claves dañadas**: si una clave no contiene un arreglo JSON válido (por
ejemplo, porque se alteró a mano), la aplicación no la repara ni la
sobrescribe. Libros y clientes muestran los ejemplos de forma provisoria; el
historial informa que no pudo leer las ventas. La clave se reemplaza recién
con el próximo alta de ese tipo (ejemplos + registro nuevo).

### Ubicación y estructura del catálogo guardado

Herramientas de desarrollo → **Application** (o *Almacenamiento*) →
**Local Storage** → origen `http://localhost:5173` (o el de la compilación servida) → clave `libreria.libros`. Un libro
guardado tiene esta forma:

```json
{
  "id": "lib-01",
  "titulo": "El faro de los vientos",
  "isbn": "978-987-000-001-1",
  "precio": 1500,
  "editorialId": "edi-01",
  "generoId": "gen-01",
  "autorIds": ["aut-01"]
}
```

**Para reproducir CM-6** en una copia de prueba: confirmar una venta, editar
**solo** el campo `precio` del libro dentro de `libreria.libros` (sin tocar
`libreria.ventas`), recargar Historial y comparar el detalle con los importes
confirmados.

---

## Casos manuales: resultado observado

**Ejecución del 2026-11-09** (migración a Vite y TypeScript, change
`migracion-vite-typescript`): recorrido automatizado en Google Chrome 157
(modo headless, mediante el protocolo de herramientas de desarrollo) contra
`npm run dev` (`http://localhost:5173`) y contra la copia del commit anterior a
la migración abierta con `file://`, ambas con un perfil nuevo y el mismo guion.
En los ocho casos los resultados de la versión nueva coinciden con los de la
versión anterior; las únicas diferencias son la hora de las ventas, el orden de
las claves del JSON guardado y que la versión anterior registraba en la consola
un error 404 por imágenes de maqueta inexistentes, que ya no existe. No
reemplaza una pasada visual en el navegador habitual de cada integrante ni una
auditoría con lector de pantalla.

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-1** Búsqueda en mayúsculas, vacía e inexistente | Coincidencias sin distinguir mayúsculas; catálogo completo; mensaje sin resultados | `FARO` → 1 tarjeta; `   faro   ` → 1; vacía → 6; `zzzz` → 0 con «No se encontraron libros cuyo título coincida con la búsqueda.»; «Sin clasificar» solo en «La casa del río»; un título con `<i>&</i>` se muestra como texto; la ficha de lectura abre con su portada | ✅ Aprobado |
| **CM-2** Alta de libro con ISBN existente y luego nuevo | El duplicado se rechaza; el válido aparece en catálogo y en la venta | `978 987 000 001 1` rechazado con «Ese ISBN ya está registrado.»; el libro nuevo aparece en la tabla (7 filas), en el Catálogo (7) y en el selector de Ventas (7 libros) | ✅ Aprobado |
| **CM-3** Alta de cliente con email inválido, existente en mayúsculas y nuevo | Se rechazan los dos primeros; el nuevo aparece en listado y selección | `ana@` rechazado con «El email no tiene un formato válido.»; `  LAURA.MENDOZA@CORREO.TEST ` rechazado con «Ese email ya está registrado.»; el cliente nuevo se registra sin recargar (4 filas) y aparece en el selector de Ventas; editar conservando el email propio se acepta y usar el de otro cliente se rechaza | ✅ Aprobado |
| **CM-4** Venta sin cliente, cantidad 0, negativa o decimal; libro repetido | No se confirma; el duplicado no crea otro renglón | Sin cliente: «Seleccione un cliente existente.»; `0`, `-2`, `1.5` y vacía rechazadas con «La cantidad debe ser un entero positivo seguro.»; un renglón editado a `0` bloquea la confirmación; el libro repetido suma en la misma fila (1 + 1 → 2); el borrador se conserva ante cada error | ✅ Aprobado |
| **CM-5** Dos unidades a 1500 y una a 2000 | Subtotales 3000 y 2000; total 5000; detalle en el historial | $ 3000,00 y $ 2000,00; total $ 5000,00; comprobante `ven-01` y venta guardada con el mismo detalle en Historial | ✅ Aprobado |
| **CM-6** Cambio exclusivo del precio en el catálogo guardado | El historial conserva los importes confirmados | Precio de `lib-01` cambiado a 9999 y página recargada: el detalle conserva $ 1500,00 / $ 2000,00, $ 3000,00 / $ 2000,00 y $ 5000,00; el Catálogo muestra $ 9999,00; con `libreria.ventas` ilegible el Historial informa el error y no modifica lo guardado | ✅ Aprobado |
| **CM-7** Recarga después de altas y venta | Se recuperan los datos sin duplicar | Tras dos recargas de las cinco vistas: 7 libros, 4 clientes y 1 venta, sin duplicar ejemplos ni ventas | ✅ Aprobado |
| **CM-8** Teclado y anchos de 320 px y 1280 px | Foco visible, controles utilizables y tablas con desplazamiento propio | Sin desplazamiento horizontal de la página en las cinco vistas ni con los diálogos abiertos (ficha, edición de cliente, comprobante y detalle de venta); foco visible en todas las paradas de Tab y foco contenido dentro de los diálogos | ✅ Aprobado |

### Casos manuales del acceso y la sesión (`registro-login-y-sesion`)

**Ejecución del 2026-11-09**: recorrido automatizado en Google Chrome 157 (modo
headless, mediante el protocolo de herramientas de desarrollo) contra
`npm run dev` (`http://localhost:5199`) y contra la compilación servida, con un
perfil nuevo. Las condiciones de almacenamiento bloqueado se simularon haciendo
que `Storage.prototype.setItem` lance un error; no se probó con el bloqueo real de
datos del sitio. No reemplaza una pasada visual en el navegador habitual de cada
integrante ni una auditoría con lector de pantalla.

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-9** Registro: email inválido, duplicado en mayúsculas, contraseña corta, repetición distinta y alta correcta | Los rechazos muestran el error junto al campo, marcan el campo inválido y llevan el foco al primero; el alta agrega un `client` y lleva al login con el aviso | Campos Email, Contraseña y Repetir contraseña, botón «Crear cuenta», sin selector de rol y con enlace al login. Todo vacío: «El email es obligatorio.», «La contraseña es obligatoria.», «Repetí la contraseña.» con resumen «Revisá los campos marcados. No se creó la cuenta.», tres campos `aria-invalid` y foco en Email. `ana@`: «El email no tiene un formato válido.»; 7 caracteres: «La contraseña debe tener entre 8 y 64 caracteres.» (foco en Contraseña); repetición distinta: «Las contraseñas no coinciden.»; `ADMIN@libreria.test` y `  LAURA@Correo.TEST ` (con `laura@correo.test` ya registrado): «Ese email ya está registrado.» y `users` idéntico antes y después. Alta de `laura@correo.test`: `users` pasa de 1 a 2 elementos (`admin` y `client`), no hay `userData` y el login abre con `?cuenta=creada` y «Cuenta creada. Ingresá con tu email y contraseña.» | ✅ Aprobado |
| **CM-10** Login por rol, credenciales incorrectas, campos vacíos y `userData` | El administrador llega a Libros y el cliente al Catálogo; las credenciales incorrectas dan un único mensaje; `userData` no lleva la contraseña | Campos vacíos: «Ingresá tu email.» y «Ingresá tu contraseña.» (foco en el primero con error); sin el parámetro `?cuenta=creada` el aviso de cuenta creada no se muestra. Contraseña equivocada y email inexistente: el mismo «El email o la contraseña no son correctos.» y `userData` sin crear. `  ADMIN@Libreria.TEST ` con la contraseña de demostración: llega a `libros.html` y `userData` es exactamente `{"email":"admin@libreria.test","loggedIn":true,"role":"admin"}`. `LAURA@correo.test`: llega a `catalogo.html` y `userData` es `{"email":"laura@correo.test","loggedIn":true,"role":"client"}`. Con `userData` ilegible o con `role` `"superusuario"`, login y Ventas cargan como sin sesión y el encabezado no muestra el bloque de sesión. Con `setItem` que lanza: registro y login muestran «No se pudo acceder al almacenamiento del navegador. Revisá que no esté bloqueado e intentá nuevamente.» y no navegan | ✅ Aprobado |
| **CM-11** Cierre de sesión y acceso con sesión iniciada | «Cerrar sesión» quita `userData`, conserva `users` y lleva al login; login y registro redirigen con sesión | Las cinco vistas muestran el email y «Cerrar sesión» con sesión iniciada. Desde Ventas, el botón deja `userData` en `null`, `users` igual y abre `login.html`; también con el teclado (foco por Tab con contorno visible y Espacio). Con sesión de administrador, login y registro redirigen a Libros; con sesión de cliente, el login redirige al Catálogo, sin mostrar el formulario | ✅ Aprobado |
| **CM-12** Inspección de `users` y entrada por `index.html`, también bajo una subruta | Sin la contraseña en texto plano; la raíz lleva al login | Tras registrar `Faro-2026`, ninguna clave de `localStorage` contiene ese texto; dos usuarios con la misma contraseña tienen huellas distintas (2 huellas distintas). Con `npm run preview` y con `dist/` copiada a `/libreria/` de un servidor estático, `index.html` llega a `…/src/pages/auth/login/login.html`; las páginas de login y registro responden 200 (no se revisaron las solicitudes de recursos ni la consola); el alta, el ingreso (al Catálogo) y el cierre de sesión (de vuelta al login) funcionan en ambas direcciones | ✅ Aprobado |

**Anchos y teclado de las páginas nuevas** (regla dura 11): a 320 px y a 1280 px
login, registro y las cinco vistas con sesión (con un email largo en el encabezado)
no tienen desplazamiento horizontal de la página, y a 768 px y 1024 px tampoco
Ventas; en el login, Tab recorre el enlace de la otra página de acceso, Email,
Contraseña, «Ingresar» y el enlace al registro, todos con contorno visible de 3 px,
y Enter en la contraseña envía el formulario; en el registro no se recorrió Tab. No se repitió la pasada con lector de pantalla.

**Regresión de CM-1 a CM-8 con sesión de administrador** (sesión iniciada por el
login, perfil nuevo): CM-1 a CM-5 y CM-7 se repitieron y dieron el mismo resultado
que el registro anterior (búsquedas 1, 1, 6 y 0 tarjetas; ISBN existente
rechazado y libro nuevo en tabla, Catálogo y Ventas con 7; email `ana@` y
`LAURA.MENDOZA@CORREO.TEST` rechazados y cliente nuevo con 4 filas; las
cantidades `0`, `-2`, `1.5` y vacía rechazadas, el libro repetido suma y el total
es $ 5000,00 con comprobante `ven-01`; tras dos recargas de las cinco vistas
7 libros, 4 clientes, 1 venta y 1 usuario). CM-6 también: el Historial conserva $ 1500,00, $ 3000,00 y $ 5000,00 con el
precio de `lib-01` cambiado y el Catálogo muestra $ 9999,00; con `libreria.ventas`
ilegible el Historial informa «No se pudo consultar el historial. Los datos
guardados no se modificaron…» y la clave queda intacta. CM-8 se repitió con
sesión de administrador: a 320 px y a 1280 px no hay desplazamiento horizontal con
el comprobante, el detalle de venta, la edición de cliente y la ficha de lectura
abiertos; con Tab dentro de cada diálogo (10 paradas) el foco no sale del diálogo y
cada parada tiene contorno visible (la única parada fuera del diálogo es el salto
a la interfaz del navegador, con `body` como elemento activo); y en las cinco
vistas, en 14 paradas de Tab, todas las paradas tienen contorno visible salvo ese
mismo salto al navegador.

También se comprobó la compilación servida (ejecución de la migración, cuando la
raíz llevaba al Catálogo; ahora lleva al login, ver CM-12): `npm run build` genera `dist/`; copiada
a una subruta (`/libreria/`) de un servidor estático, `index.html` redirige al
Catálogo, las cinco vistas cargan sin respuestas 404 ni errores de consola y el
recorrido por la navegación llega a cada vista; `dist/` no contiene la dirección
`https://api.ismaelsuarez.me`. Con `npm run preview`, `GET /api/health/live`
responde 200 por el reenvío. En las cinco vistas todas las solicitudes
observadas fueron `GET` al mismo origen de la aplicación; no se escribe en la
API de producción.

---

## Imágenes y recursos

| Recurso | Uso | Procedencia |
|---|---|---|
| `src/assets/estanteria.webp` | Fondo decorativo (CSS) | Imagen descargada de la red; se conserva como recurso local |
| `src/assets/portadas/*.png` (6 archivos) | Portadas de los libros de ejemplo en el Catálogo y en la ficha | Imágenes ajenas, tomadas de otros proyectos y cargadas por el equipo como recursos locales |

Las tipografías son las del sistema operativo (`system-ui`, `Georgia`); no se
descarga ninguna fuente. Si una portada no carga, la tarjeta muestra una
cubierta de respaldo con el título.

## Estructura de carpetas

```text
index.html                  redirige al login (ruta relativa)
package.json, tsconfig.json, vite.config.ts, .env.example
src/
├── main.ts                 entrada común, importada primero por cada vista
├── pages/                  una carpeta por zona y vista: <vista>.html + <vista>.ts
│   ├── auth/               login y registro (sin la navegación de las cinco vistas)
│   ├── client/catalogo/    Catálogo y ficha de lectura
│   └── admin/              libros, clientes, ventas (con comprobante) e historial
├── logica/                 funciones puras sin DOM: texto, dinero, fecha, catálogo, libros, clientes, ventas, usuarios, sesión
├── datos/                  repositorios, raíz de composición (proveedor), base /api y adaptador local
│   └── local/              almacén local (único que nombra localStorage), datos iniciales, repositorios locales,
│                           almacén de usuarios y sesión, contraseñas (PBKDF2) y usuario administrador inicial
├── types/                  tipos de dominio alineados con la API de producción
├── utils/                  dom.ts (mensajes, errores de campo, cierre de sesión), auth.ts y navigate.ts (sesión y navegación)
├── styles/                 estilos: base, disposición, componentes y uno por función
└── assets/                 estanteria.webp y portadas/
tests/                      pruebas de Vitest (lógica, almacén, repositorios, fixtures de la API)
```

## Entrega

Se entrega el código fuente del proyecto: `index.html`, `src/`, `package.json`,
`package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.env.example` y
`README.md`; la compilación (`npm run build`) genera `dist/`, que se sirve desde
cualquier subruta. No incluye `node_modules/` ni `dist/`.

Quedan fuera: `tests/`, `docs/`, `discovery/`, `knowledge-base/`, `openspec/`,
`.atl/`, `.claude/`, `.engram/`, `.githooks/`, `.git/`, `.gitignore`,
`CHANGES.md`, `AGENTS.md`, `CLAUDE.md` y `.active-orchestrator-state.json`.

---

## Para quienes desarrollan

<details>
<summary>Pruebas automatizadas y memoria compartida</summary>

### Pruebas de la lógica

```bash
npm test         # Vitest, una sola corrida (tests/**/*.test.ts)
npx tsc          # comprobación de tipos de src/ y tests/
```

Las pruebas no necesitan navegador y no sustituyen los recorridos manuales
(CM-1 a CM-12).

### Memoria compartida (Engram)

Después de clonar el repositorio, ejecutar una sola vez:

```bash
git config core.hooksPath .githooks
engram sync --import
```

El primer comando activa los hooks que sincronizan la memoria del proyecto
(`.engram/`); el segundo la carga en la base local. Sin Engram, el proyecto se
usa y se edita igual. Detalle en `AGENTS.md`.

</details>
