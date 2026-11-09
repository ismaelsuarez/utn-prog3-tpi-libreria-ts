<div align="center">

# Librería El Faro

**Trabajo Práctico Integrador · Frontend de una librería**

Programación III · Tecnicatura Universitaria en Programación a Distancia · UTN
Unidad HTML, CSS y JavaScript · Revisor de la unidad: Prof. Matías Torres

`HTML5` · `CSS3` · `TypeScript` · `Vite` · Sin librerías de ejecución, frameworks ni CDNs

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
> (`https://api.ismaelsuarez.me`). El **Catálogo ya lee los libros de la API**
> por la base `/api` del mismo origen (`cliente-http-y-catalogo`); Libros,
> Clientes, Ventas e Historial también leen y registran en la API
> (`operaciones-contra-api`; ver [Origen de los datos](#origen-de-los-datos)). El registro y el inicio de sesión ya existen
> (`registro-login-y-sesion`) y las páginas se protegen según el rol
> (`proteccion-de-rutas-y-roles`). Todo vive solo en el navegador: la API no
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
- [Origen de los datos](#origen-de-los-datos)
- [Datos y almacenamiento](#datos-y-almacenamiento)
- [Casos manuales: resultado observado](#casos-manuales-resultado-observado)
- [Imágenes y recursos](#imágenes-y-recursos)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Entrega](#entrega)
- [Backend local para verificar escrituras](#backend-local-para-verificar-escrituras)
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
cada origen. Es esperado: los datos de negocio ya no se guardan en el navegador
(salen de la API) y los usuarios se vuelven a sembrar en el origen nuevo.

**API de producción**: el navegador usa la base `/api` del mismo origen
(`VITE_API_BASE`); `npm run dev` y `npm run preview` la reenvían a
`https://api.ismaelsuarez.me` (variable `API_PROXY_TARGET`), **pero solo las
lecturas**: toda escritura hacia producción se rechaza con `403` en el propio
servidor de desarrollo. Para probar altas y ventas, ver [Backend local para
verificar escrituras](#backend-local-para-verificar-escrituras). Ver `.env.example`.

## Navegación entre vistas

Las cinco páginas de la librería comparten la misma barra de navegación, que
indica la vista actual, y muestran en el encabezado el email del usuario en curso
con el botón «Cerrar sesión». La barra ofrece solo las vistas que el rol puede
abrir: el administrador ve las cinco y el cliente solo el Catálogo. Las páginas
de acceso (login y registro) no la muestran y se enlazan entre sí.

**Quién puede abrir cada página** (lo decide `src/main.ts` al cargar cada página,
por la carpeta de zona de su dirección y la sesión vigente):

| Sesión | Login y registro | Catálogo (`/client/`) | Libros, Clientes, Ventas e Historial (`/admin/`) |
|---|---|---|---|
| Sin sesión | se muestran | redirige al login | redirige al login |
| `client` | redirige al Catálogo | se muestra | redirige al Catálogo, sin mensaje |
| `admin` | redirige a Libros | se muestra | se muestran |

La página pedida no se ve ni ejecuta su código mientras se redirige; la decisión se
repite al recargar y al volver atrás con el historial. La sesión solo vale si
`userData` coincide con un usuario de `users` (mismo email y mismo rol).

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

- Tarjetas generadas desde los libros que entrega la API de producción: título,
  ISBN, editorial, género, autores y precio. Un libro sin género muestra «Sin
  clasificar». Mientras llegan los datos se ve «Cargando libros…»; si la API no
  responde, un mensaje de error en texto con el motivo.
- Filtro por título: no distingue mayúsculas de minúsculas, admite
  coincidencias parciales e ignora los espacios de los extremos. Una búsqueda
  vacía muestra todo el catálogo; una sin coincidencias muestra un mensaje. El
  filtro se aplica en el navegador sobre la lista ya cargada.
- **Ficha de lectura**: el botón «Ver sinopsis» de cada tarjeta abre un
  diálogo con portada, datos y sinopsis. Las sinopsis de los seis libros de
  ejemplo son ilustrativas y la ficha lo aclara; los libros de producción no
  tienen portada ni sinopsis de muestra, así que ven la cubierta textual y «Este
  libro todavía no tiene una sinopsis cargada.».

### Libros

- Editorial y género se eligen con selectores, y los autores con casillas; cada
  autor marcado tiene su **rol** (autor, coautor, traductor o ilustrador; «autor»
  por defecto). El orden de autoría es el de las casillas marcadas, desde 1.
  Todas las opciones salen de la API y se leen una sola vez al abrir la
  página; el género incluye «Sin clasificar». Si esa lectura falla, se muestra
  el error y no se puede registrar.
- El alta envía el libro a la API (`POST /libros/`). **Stock**: es obligatorio
  porque la API lo exige, pero la aplicación no lo muestra ni lo descuenta
  (la venta no lo modifica y el alcance excluye la gestión de stock).
- Validaciones, todas junto al campo y antes de enviar nada:

  | Campo | Regla |
  |---|---|
  | Título | Obligatorio, hasta 200 caracteres |
  | ISBN | Obligatorio, hasta 20 caracteres (se cuenta el texto escrito, sin espacios exteriores) y sin repetir; se compara sin espacios ni guiones (sin dígito de control) |
  | Precio | Numérico, mayor que cero y hasta 99 999 999,99; se envía redondeado al centavo (`1500,125` se envía como `1500.13`) |
  | Stock | Obligatorio, entero de 0 a 2 147 483 647 |
  | Editorial | Obligatoria y existente en la API |
  | Autores | Al menos uno, todos existentes en la API y con uno de los cuatro roles |
  | Género | Opcional; si se elige, debe existir en la API |

  Los límites de longitud, de precio y de stock son los de la base del servidor,
  que la API no valida y que, excedidos, producirían un error 500.
- Un rechazo de la API (`409` o `422`) se muestra en texto, junto al campo cuando
  la API lo identifica, y el formulario conserva lo escrito. El alta correcta
  vuelve a leer el listado y limpia el formulario sin recargar la página. Si la
  API no responde, no se anuncia éxito: se avisa que no se pudo confirmar si se
  guardó y se vuelve a leer el listado para que se compruebe antes de
  reintentar. Nunca se reenvía solo, y el botón queda deshabilitado mientras
  la operación está en curso (un doble clic envía una sola vez).

### Clientes

- Alta con **nombre completo, email, teléfono y dirección**. Se hace en dos
  escrituras: primero el cliente (`POST /clientes/`) y, solo si se registró, su
  perfil con teléfono y dirección (`POST /clientes/{id}/perfil`):

  | Campo | Regla |
  |---|---|
  | Nombre completo | Obligatorio, hasta 100 caracteres |
  | Email | Obligatorio, con formato válido, hasta 255 caracteres y sin repetir (se compara sin espacios exteriores y sin distinguir mayúsculas) |
  | Teléfono | Obligatorio, de 7 a 15 dígitos y hasta 30 caracteres; admite `+`, espacios, guiones, puntos y paréntesis |
  | Dirección | Opcional, hasta 255 caracteres; vacía se envía como `null` |

- **El perfil se guarda una sola vez**: la API no permite modificarlo. Un cliente
  con perfil muestra su teléfono y dirección sin ningún control de edición; uno
  sin perfil (se ve «—») ofrece el botón «Completar perfil de <nombre>», que
  registra teléfono y dirección una única vez con las mismas reglas del alta. Si
  el cliente se registra pero el perfil falla, se avisa que quedó sin perfil y
  se ofrece completarlo; nunca se repite ninguna escritura sola. Un `409` del
  perfil («El cliente ya tiene un perfil») se muestra y se vuelve a leer el
  listado.
- Un `409` del alta del cliente (email ya registrado en la API) se muestra junto
  al email y el formulario conserva lo escrito.
- **No hay edición ni borrado de clientes** (regla dura 9). Quien necesite
  corregir un dato debe hacerlo en la API fuera de esta aplicación.
- **Limitación del listado**: la API no tiene `GET /clientes/`, así que el listado
  se arma consultando `GET /clientes/1`, `/2`, `/3`… hasta encontrar 10 ausentes
  seguidos pasado el mayor cliente que mencionan las ventas. Más de 10 altas
  fallidas seguidas sin un alta posterior exitosa ocultarían a los clientes
  siguientes hasta que una venta los mencione.

### Ventas

- Los clientes y los libros se leen de la API **una sola vez, al abrir la
  página**; componer la venta no hace solicitudes. Si esa lectura falla, se
  muestra el error y no se puede confirmar. Un cliente o libro dado de alta
  después aparece al volver a abrir Ventas.
- Se elige un cliente existente y se agregan renglones con un libro y una
  cantidad entera mayor que cero (hasta 2 147 483 647).
- Agregar otra vez el mismo libro suma la cantidad al renglón existente, sin
  duplicar filas. Antes de confirmar se pueden cambiar cantidades y quitar
  renglones.
- Cada renglón muestra libro, cantidad, precio unitario y subtotal **estimados**,
  con dos decimales, y el total estimado es la suma de los subtotales.
- No se confirma una venta sin cliente, sin renglones o con cantidades
  inválidas.
- **La venta no controla ni descuenta el stock**: se puede vender más unidades
  que el stock del libro y el stock no cambia al vender, porque la API no lo
  descuenta y el alcance excluye la gestión de stock.
- Al confirmar se envía a la API (`POST /ventas/`) solo el cliente y, por
  renglón, el libro y la cantidad. **Los importes definitivos los calcula el
  servidor**: copia el precio vigente en ese momento, calcula los subtotales y el
  total, y el **comprobante interno no fiscal** (que se puede imprimir o guardar
  como PDF desde el navegador, con animación o sin ella si el navegador tiene
  «reducir movimiento») muestra la venta que devolvió la API; si el precio
  cambió desde que se abrió la página, puede diferir del borrador.
- Si la API rechaza la venta, se muestra su mensaje y el borrador se conserva.
  Si no responde, **no se anuncia éxito**: se avisa que no se pudo confirmar si
  la venta se registró y que conviene revisar el Historial antes de reintentar;
  el borrador se conserva y no se reenvía solo. El botón queda deshabilitado
  mientras la confirmación está en curso (un doble clic o Enter envía una sola
  venta).

**Importes estimados**: el precio unitario se redondea al centavo antes de
multiplicar, con las mitades hacia arriba. Por ejemplo, `1500,125` pasa a
`1500,13` y dos unidades cuestan `3000,26`. Los cálculos usan centavos enteros.

### Historial

- Tabla con identificador, fecha (`dd/mm/aaaa HH:mm`, hora local), cliente y
  total, y un botón para ver el detalle de cada venta. Se leen **todas las
  páginas** de ventas de la API (de 100 en 100), en el orden que entrega.
- El detalle usa solo los datos de la venta: el **precio unitario, los subtotales
  y el total son los registrados al confirmar** y no cambian si después cambia el
  precio de un libro; el **título del libro y el cliente son los actuales** (la
  API los informa al consultar) y no se muestra el ISBN porque la API no lo
  entrega. El Historial no consulta el catálogo.
- Las ventas confirmadas no se editan ni se eliminan desde la interfaz.

> [!NOTE]
> «Sin recargar» significa dentro de la misma página donde ocurre el alta.
> Al navegar a otra vista, esa vista vuelve a leer la API.

## Funcionalidades pendientes

No hay funcionalidades pendientes: las cinco vistas y todas las operaciones
de la consigna están implementadas.

Además del alcance pedido, el proyecto incluye la ficha de lectura del
Catálogo y el comprobante de venta.

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
> `users` y `userData` sin conocer ninguna contraseña (ver el párrafo siguiente),
> y la API de producción no exige autenticación. La huella evita
> exponer en `localStorage` las contraseñas escritas, nada más: no es seguridad
> real. Si se borra `users` del navegador, el administrador de demostración se
> vuelve a crear al abrir cualquier página; los demás usuarios se pierden.
>
> **La protección de rutas tampoco es seguridad real**: ordena el uso de la
> aplicación en el navegador (un cliente no llega a las vistas de gestión desde la
> barra ni escribiendo su dirección), pero decide solo con lo guardado en el
> navegador. Como la sesión se coteja con `users`, cambiar solo el `role` de
> `userData` no alcanza; quien edite también el `role` de su entrada en `users`
> sí entra, y las credenciales de demostración del administrador están en este
> archivo. Cualquiera puede además llamar a la API de producción, que no exige
> autenticación.

## Origen de los datos

Todos los datos de negocio salen de la API de producción
(`https://api.ismaelsuarez.me`) por la base `/api` del mismo origen, solo por
medio de los repositorios (`src/datos/proveedor.ts`):

| Vistas | Operaciones contra `/api` |
|---|---|
| Catálogo | Solo lectura: `GET /api/libros/` (todas las páginas de 100) y `GET /api/libros/{id}` por cada libro para traer sus autores, con a lo sumo 4 consultas a la vez; tiempo límite de 10 s por solicitud |
| Libros, Clientes, Ventas e Historial | Lecturas de libros, editoriales, géneros, autores, clientes y ventas; altas con `POST /libros/`, `POST /clientes/`, `POST /clientes/{id}/perfil` y `POST /ventas/`. Solo `GET` y `POST`: nunca `PUT`, `PATCH` ni `DELETE` |

Lo que conviene conocer:

- **Escrituras**: el servidor devuelve el registro creado (identificadores,
  precio copiado, subtotales y total); la aplicación muestra eso y no lo
  enviado. Una escritura sin respuesta (red o tiempo agotado) se informa como
  resultado desconocido y **nunca se reintenta sola**.
- **Listados por sondeo**: la API no ofrece `GET /clientes/` ni `GET /autores/`.
  Esos listados se arman pidiendo `GET /clientes/{id}` y `GET /autores/{id}`
  desde el 1, de a 4 a la vez, hasta 10 identificadores seguidos sin registro
  posteriores al mayor identificador que mencionan las ventas o los libros. Como
  la API no borra, solo más de 10 altas fallidas seguidas ocultarían a los
  registros siguientes hasta que una venta o un libro los mencione.
- **Stock**: se carga al registrar un libro (la API lo exige), pero no se
  muestra ni se descuenta: la venta no controla el stock.
- **Producción desde desarrollo**: `npm run dev` y `npm run preview` rechazan con
  `403` toda escritura cuyo destino sea la API de producción; las pruebas
  automatizadas no usan la red. Ver [Backend local para verificar
  escrituras](#backend-local-para-verificar-escrituras).
- Sin el reenvío de `/api` (por ejemplo, si se sirve `dist/` con otro servidor)
  o con la API caída, las vistas informan «No se pudieron cargar los datos.» y
  el motivo. No hay respaldo local, a propósito.

## Datos y almacenamiento

El navegador guarda únicamente dos claves, ambas de acceso y sesión (ver
[Usuarios de demostración y seguridad](#usuarios-de-demostración-y-seguridad)):

| Clave | Contenido |
|---|---|
| `users` | Usuarios registrados (contraseña protegida con PBKDF2) y el administrador inicial |
| `userData` | Sesión vigente |

- Solo `src/datos/local/almacen-local.ts` nombra `localStorage`; los almacenes de
  `src/datos/local/` (usuarios y sesión) reciben el almacenamiento ya obtenido.
- Las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` de
  versiones anteriores **ya no se leen, escriben, migran ni borran**: quedan en el
  navegador sin uso y ninguna vista muestra sus registros. Para quitarlas a
  mano: Herramientas de desarrollo → **Application** (o *Almacenamiento*) →
  **Local Storage** → origen `http://localhost:5173` (o el de la compilación
  servida) → borrar esas tres claves.
- No hay datos iniciales de ejemplo en el código: los libros, clientes y ventas
  son los que tiene la API (para pruebas manuales, la siembra del backend local).

### Límites

> [!IMPORTANT]
> `users` y `userData` dependen del **navegador**, del **perfil** y de la
> **ubicación desde la que se abre** el proyecto: no se comparten entre
> usuarios ni perfiles, no se respaldan en un servidor y se pierden si el
> navegador borra los datos del sitio. Los datos de negocio, en cambio, viven en
> la API y los ven todos los navegadores.

---

## Casos manuales: resultado observado

> [!NOTE]
> Los resultados de CM-1 a CM-8 siguientes se observaron antes de
> `operaciones-contra-api`, cuando Libros, Clientes, Ventas e Historial
> guardaban en `localStorage`. Esas vistas ya usan la API: los casos se vuelven a
> ejecutar contra el backend local y se registran de nuevo (la fila de cada caso
> se reemplaza solo con lo realmente observado).

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
| **CM-1** Búsqueda en mayúsculas, vacía e inexistente | Coincidencias sin distinguir mayúsculas; catálogo completo; mensaje sin resultados | Reejecutado el 2026-11-09 con los libros de producción (`cliente-http-y-catalogo`; 5 libros ese día): `RAYUELA` → 1 tarjeta; `   rayuela   ` → 1; vacía → 5; `ISIDRO` → 1; `zzzz` → 0 con «No se encontraron libros cuyo título coincida con la búsqueda.»; «Sin clasificar» solo en «La invención de Morel»; la ficha de «Rayuela» abre con su cubierta textual y la sinopsis «Este libro todavía no tiene una sinopsis cargada.». No ejecutado con datos de producción: un título con `<i>&</i>` (ningún libro lo trae; el código usa `textContent`, verificado en la ejecución anterior con los datos locales) | ✅ Aprobado |
| **CM-2** Alta de libro con ISBN existente y luego nuevo | El duplicado se rechaza; el válido aparece en la tabla de Libros y en la venta; su aparición en el Catálogo queda **pendiente hasta `operaciones-contra-api`** | Parte de gestión reejecutada el 2026-11-09: `978 987 000 001 1` rechazado con «Ese ISBN ya está registrado.»; el libro nuevo aparece en la tabla (7 filas) y en el selector de Ventas (7 libros); repetirlo sin recargar se rechaza. Parte del Catálogo: el libro **no aparece** (el Catálogo lee la API de producción: 5 tarjetas) | ✅ Aprobado (gestión) · ⏳ Pendiente (Catálogo) |
| **CM-3** Alta de cliente con email inválido, existente en mayúsculas y nuevo | Se rechazan los dos primeros; el nuevo aparece en listado y selección | `ana@` rechazado con «El email no tiene un formato válido.»; `  LAURA.MENDOZA@CORREO.TEST ` rechazado con «Ese email ya está registrado.»; el cliente nuevo se registra sin recargar (4 filas) y aparece en el selector de Ventas; editar conservando el email propio se acepta y usar el de otro cliente se rechaza | ✅ Aprobado |
| **CM-4** Venta sin cliente, cantidad 0, negativa o decimal; libro repetido | No se confirma; el duplicado no crea otro renglón | Sin cliente: «Seleccione un cliente existente.»; `0`, `-2`, `1.5` y vacía rechazadas con «La cantidad debe ser un entero positivo seguro.»; un renglón editado a `0` bloquea la confirmación; el libro repetido suma en la misma fila (1 + 1 → 2); el borrador se conserva ante cada error | ✅ Aprobado |
| **CM-5** Dos unidades a 1500 y una a 2000 | Subtotales 3000 y 2000; total 5000; detalle en el historial | $ 3000,00 y $ 2000,00; total $ 5000,00; comprobante `ven-01` y venta guardada con el mismo detalle en Historial | ✅ Aprobado |
| **CM-6** Cambio exclusivo del precio en el catálogo guardado | El historial conserva los importes confirmados; que el Catálogo muestre el precio nuevo queda **pendiente hasta `operaciones-contra-api`** | Parte de gestión reejecutada el 2026-11-09: precio del primer libro guardado cambiado a 9999 y página recargada: el detalle de la venta conserva $ 1500,00 / $ 4500,00, $ 2000,00 / $ 2000,00 y total $ 6500,00; Libros muestra $ 9999,00; con `libreria.ventas` ilegible el Historial informa «No se pudo consultar el historial. Los datos guardados no se modificaron…» y la clave queda intacta. Parte del Catálogo: no refleja el cambio porque lee los precios de la API (no el almacén local) | ✅ Aprobado (gestión) · ⏳ Pendiente (Catálogo) |
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
| **CM-10** Login por rol, credenciales incorrectas, campos vacíos y `userData` | El administrador llega a Libros y el cliente al Catálogo; las credenciales incorrectas dan un único mensaje; `userData` no lleva la contraseña | Campos vacíos: «Ingresá tu email.» y «Ingresá tu contraseña.» (foco en el primero con error); sin el parámetro `?cuenta=creada` el aviso de cuenta creada no se muestra. Contraseña equivocada y email inexistente: el mismo «El email o la contraseña no son correctos.» y `userData` sin crear. `  ADMIN@Libreria.TEST ` con la contraseña de demostración: llega a `libros.html` y `userData` es exactamente `{"email":"admin@libreria.test","loggedIn":true,"role":"admin"}`. `LAURA@correo.test`: llega a `catalogo.html` y `userData` es `{"email":"laura@correo.test","loggedIn":true,"role":"client"}`. Con `userData` ilegible o con `role` `"superusuario"`, el login carga como sin sesión y Ventas **redirige al login** (con `proteccion-de-rutas-y-roles`; antes cargaba sin sesión) y el encabezado no muestra el bloque de sesión. Con `setItem` que lanza: registro y login muestran «No se pudo acceder al almacenamiento del navegador. Revisá que no esté bloqueado e intentá nuevamente.» y no navegan | ✅ Aprobado |
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

### Casos manuales de la protección de rutas (`proteccion-de-rutas-y-roles`)

**Ejecución del 2026-11-09**: recorrido automatizado en Google Chrome 157 (modo
headless, mediante el protocolo de herramientas de desarrollo), con un perfil
nuevo por pasada, contra `npm run dev` (puerto 5173), `npm run preview` (4173) y
la compilación copiada a la subruta `/libreria/` de un servidor estático local
(8090); las tres pasadas dieron el mismo resultado (76 comprobaciones cada una,
todas correctas). `API_PROXY_TARGET` apuntó a un puerto local cerrado, de modo
que el Catálogo con sesión mostró el error del reenvío (esperado) y nada llegó a
la API de producción. «Sin ver el contenido» se comprobó dentro de la página con
un observador: el cuerpo nunca tuvo diseño visible, el navegador no registró
`first-paint` ni `first-contentful-paint` y el código de la vista no conectó
ningún control (0 oyentes en elementos; con acceso permitido las vistas conectan de 1 a 11).
No reemplaza una pasada visual en el navegador habitual de cada integrante ni una
auditoría con lector de pantalla.

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-13** Sin sesión, las cinco páginas de `client` y `admin` y las de acceso | Catálogo, Libros, Clientes, Ventas e Historial redirigen al login sin mostrar contenido; el Catálogo no pide `/api`; login y registro se muestran | Las cinco páginas (son cinco, no seis: el Catálogo y cuatro de gestión) llegan a `login.html`, nunca se ven ni pintan y su código no se ejecuta; 0 solicitudes a `/api`, sin 404 ni excepciones. Login y registro se muestran con su formulario; `index.html` lleva al login | ✅ Aprobado |
| **CM-14** Rol `client`, rol `admin` y sesiones falsificadas | `client` en Libros, Clientes, Ventas e Historial llega al Catálogo sin ver lo pedido y su navegación solo trae el Catálogo; `admin` abre las cinco y ve los cinco enlaces en orden; una sesión que no coincide con `users` cuenta como sin sesión | `client` (`laura@correo.test`): el Catálogo se muestra con un único enlace, «Catálogo», marcado como página actual, y su email en el encabezado; Libros, Clientes, Ventas e Historial llegan a `catalogo.html` sin verse ni conectar controles (y sin mensaje); login y registro con su sesión llevan al Catálogo. `admin`: las cinco vistas se muestran con «Catálogo, Libros, Clientes, Ventas, Historial» en ese orden; login y registro llevan a Libros. `userData` con rol `admin` editado sobre `laura@correo.test` (registrada como `client`), con un email ausente de `users`, con JSON ilegible, `loggedIn` en falso, rol `"superusuario"`, `[]` y `null`: Libros y Catálogo llevan al login en los siete casos. Con `users` ilegible el administrador sembrado sigue entrando (semilla) y un cliente deja de valer. A 320 px y a 1280 px el Catálogo del cliente no tiene desplazamiento horizontal ni huecos en la navegación (capturas revisadas: Catálogo del cliente a 320 px y a 1280 px y Libros del administrador a 320 px); con Tab el foco pasa por «Catálogo» y «Cerrar sesión» con contorno visible de 3 px | ✅ Aprobado |
| **CM-15** Recarga e historial | La decisión se repite al recargar y al volver atrás; Libros no se ve después de cerrar la sesión; con sesión, Atrás muestra Libros | Con Ventas abierta, `userData` quitado y recarga: login. Login por la interfaz como administrador → Libros → Ventas → «Cerrar sesión» (login, `userData` quitado, `users` intacto) → Atrás: Chrome restauró Libros desde la caché de ida y vuelta (`pageshow` con `persisted`, cuerpo oculto en ese instante) y pasó al login sin que Libros llegara a verse. Libros → Clientes → Atrás con sesión: Libros restaurado desde la caché y visible. Con eventos `pagehide` y `pageshow` con `persisted` simulados: `pagehide` oculta el cuerpo, `pageshow` con la misma sesión lo muestra, sin sesión pasa al login, con otro usuario permitido (`mario@correo.test`) recarga con su email, y de cliente a administrador en el Catálogo recarga con los cinco enlaces | ✅ Aprobado |
| **CM-16** Compilación bajo la subruta `/libreria/` | Las redirecciones quedan dentro de la subruta, sin 404; el Catálogo sin sesión no hace solicitudes a `/api` | Sin sesión, Libros llega a `…/libreria/src/pages/auth/login/login.html`; con `client`, Ventas llega al Catálogo de la subruta; con `admin`, las cinco vistas se muestran. En las tres pasadas todo el conjunto de CM-13 a CM-15 dio lo mismo. Las únicas respuestas 404 del servidor estático (16) fueron `GET /api/libros/` del Catálogo con sesión, porque ese servidor no reenvía `/api`; ninguna redirección dio 404 | ✅ Aprobado |

**No ejecutado**: CM-1 a CM-8 (las vistas de gestión y el Catálogo no cambian, salvo que ahora exigen la sesión del rol); el aviso de `storage` (cerrar la sesión en otra pestaña con la página abierta no la oculta hasta recargar o volver, por diseño); Firefox y Safari (solo Chrome); la caché de ida y vuelta con otros navegadores; la protección frente a quien edite a la vez `userData` y `users` (no es seguridad real, ver arriba).

**Regresión de CM-9 a CM-12** (repetidos el 2026-11-09 con las tres direcciones de arriba, 27 comprobaciones por pasada, todas correctas): CM-9, CM-10 y CM-12 dieron los resultados ya registrados; la única diferencia es la pedida por este change (CM-10: `userData` ilegible o con rol desconocido hace que Ventas redirija al login en lugar de cargar sin sesión). CM-11: «Cerrar sesión» con la barra espaciadora deja `userData` en `null`, `users` igual y abre el login; login y registro con sesión redirigen sin mostrar el formulario (ahora lo decide `src/main.ts`). CM-A6 no cambia: la raíz lleva al login y el Catálogo del administrador se muestra.

---

### Casos manuales del Catálogo desde la API (`cliente-http-y-catalogo`)

**Ejecución del 2026-11-09**: recorrido automatizado en Google Chrome (modo
headless, por el protocolo de herramientas de desarrollo) contra `npm run dev` y
`npm run preview`, con la API de producción real y solo solicitudes `GET`; los
estados de carga y de falla se provocaron reteniendo o fallando las solicitudes
`/api/libros*` desde el protocolo del navegador, y con un reenvío apuntado a un
destino inexistente (`API_PROXY_TARGET=http://127.0.0.1:9`). Los libros de
producción pueden cambiar: lo registrado es lo observado ese día. No reemplaza
una auditoría con lector de pantalla (no ejecutada).

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-A1** Catálogo con libros de producción | Tarjetas con autores, editorial, género y precio con dos decimales | 5 libros: «Rayuela» (Julio Cortázar, Sudamericana, Novela, $ 25000,00), «Ficciones» (Jorge Luis Borges, Emecé, Cuento, $ 18000,00), «La invención de Morel» (Adolfo Bioy Casares, Emecé, Sin clasificar, $ 16500,00), «Respiración artificial» (Ricardo Piglia, Anagrama, Novela, $ 27000,00) y «Seis problemas para don Isidro Parodi» (Jorge Luis Borges y Adolfo Bioy Casares, Sudamericana, Policial, $ 19500,00) | ✅ Aprobado |
| **CM-A2** Estado de carga | «Cargando libros…» anunciado como estado; ni tarjetas ni mensaje de lista vacía | Con las solicitudes retenidas: mensaje visible (`role="status"`), lista oculta, mensajes de lista vacía y de búsqueda sin resultados ocultos; al liberarlas se oculta y aparecen las 5 tarjetas | ✅ Aprobado |
| **CM-A3** API caída, sin reenvío o sin respuesta | Mensaje de error en texto con el motivo, sin lista vacía, buscador presente, sin rechazos sin controlar | Reenvío a destino inexistente (HTTP 500 del reenvío): «No se pudieron cargar los datos. El servidor respondió con un error (500).»; solicitud fallada de red: «No se pudieron cargar los datos. No se pudo conectar con el servidor.»; sin respuesta: a los 10 s «No se pudieron cargar los datos. El servidor tardó demasiado en responder.». En los tres, mensaje de carga y lista vacía ocultos y buscador presente; la consola solo registra la línea propia del navegador por la solicitud fallida, sin excepciones | ✅ Aprobado |
| **CM-A4** Solo `GET` al mismo origen | Catálogo: solicitudes `GET /api/libros/…`; gestión: ninguna a `/api` | Catálogo: `GET /api/libros/?limit=100&offset=0` y `GET /api/libros/1` a `/5`, sin origen externo (también con `npm run preview`); Libros, Clientes, Ventas e Historial: 0 solicitudes a `/api` | ✅ Aprobado |
| **CM-A5** 320 px y 1280 px, teclado y foco | Sin desplazamiento horizontal; foco visible | 320 px: ancho del documento 320 px; 1280 px: 1265 px (descontada la barra de desplazamiento); Tab recorre navegación, buscador y botones «Ver sinopsis» con contorno de 3 px | ✅ Aprobado |
| **CM-A6** Compatibilidad con el acceso y la sesión | La raíz lleva al login; el Catálogo muestra el encabezado de sesión | Raíz → login; con `admin@libreria.test` el Catálogo muestra el email y «Cerrar sesión» devuelve al login | ✅ Aprobado |
| **CM-A7** Servir `dist/` sin reenvío de `/api` | Error «La respuesta del servidor no tiene el formato esperado.» o el error HTTP | No ejecutado | ⬜ No ejecutado |

**Comparación con la versión anterior** (vistas de gestión): el mismo guion de
CM-2 a CM-6 (alta de libro con ISBN existente y nuevo, altas de cliente, venta
con cantidades inválidas y confirmada, Historial, cambio de precio y clave de
ventas ilegible) se corrió contra una copia del commit anterior al change y
contra la versión nueva, con perfiles nuevos: las salidas son idénticas (fechas
normalizadas).

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
├── datos/                  repositorios, raíz de composición (proveedor), base /api y adaptador de la API
│   ├── api/                base /api, cliente HTTP (GET y POST), errores de la API, paginación y sondeo, repositorios sobre la API y guarda de escrituras de desarrollo
│   └── local/              almacenamiento del navegador (único que nombra localStorage),
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

## Backend local para verificar escrituras

`npm run dev` y `npm run preview` reenvían las lecturas a la API de producción,
pero **rechazan con `403`, en el propio servidor de desarrollo, toda escritura
(`POST`, `PUT`, `PATCH`, `DELETE`) cuyo destino sea `https://api.ismaelsuarez.me`**.
No hay variable para desactivar esa guarda. Para probar altas y ventas se usa un
backend local construido desde el mismo código que producción, sobre PostgreSQL
en Docker. Requiere Docker y Git; nada de esto forma parte de la entrega.

1. Clonar el backend fuera de este repositorio y preparar la red y el volumen:

   ```bash
   BACKEND=$(mktemp -d)
   git clone https://github.com/pabloavalos25/Actividad--ibreria-api.git "$BACKEND/repo"
   docker network create tpi-libreria-red
   docker volume create tpi-libreria-datos
   ```

2. Levantar PostgreSQL 17 y esperar a que acepte conexiones:

   ```bash
   docker run -d --name tpi-libreria-pg --network tpi-libreria-red \
     -e POSTGRES_USER=libreria -e POSTGRES_PASSWORD=solo-local -e POSTGRES_DB=libreria \
     -v tpi-libreria-datos:/var/lib/postgresql/data postgres:17
   until docker exec tpi-libreria-pg pg_isready -U libreria -d libreria; do sleep 1; done
   ```

3. Construir la imagen desde `despliegue/` (el mismo `Dockerfile` y las mismas
   migraciones que producción) y arrancarla, publicada solo en el loopback:

   ```bash
   docker build -t tpi-libreria-api "$BACKEND/repo/despliegue"
   docker run -d --name tpi-libreria-api --network tpi-libreria-red \
     -e DATABASE_URL=postgresql+asyncpg://libreria:solo-local@tpi-libreria-pg:5432/libreria \
     -e ECHO_SQL=false -p 127.0.0.1:8000:8000 tpi-libreria-api
   until [ "$(docker inspect -f '{{.State.Health.Status}}' tpi-libreria-api)" = healthy ]; do sleep 1; done
   ```

4. Sembrar los datos de ejemplo **solo dentro del contenedor local** (vacía y
   vuelve a cargar esa base, nunca la de producción):

   ```bash
   docker exec tpi-libreria-api python seed.py
   ```

5. Comprobar el destino **antes de cualquier escritura**: debe responder el
   contenedor local, en el loopback.

   ```bash
   curl -s http://127.0.0.1:8000/health/ready      # {"estado":"ok","base":"disponible"}
   ```

6. Arrancar el frontend apuntando al backend local y repetir la comprobación
   por el reenvío:

   ```bash
   API_PROXY_TARGET=http://127.0.0.1:8000 npm run dev
   curl -s http://localhost:5173/api/health/ready  # {"estado":"ok","base":"disponible"}
   docker logs tpi-libreria-api | tail -n 3         # muestra esa solicitud
   ```

   Nunca escribir con `API_PROXY_TARGET` vacío o distinto de `127.0.0.1`.

7. Apagar y limpiar al terminar:

   ```bash
   docker rm -f tpi-libreria-api tpi-libreria-pg
   docker network rm tpi-libreria-red
   docker volume rm tpi-libreria-datos
   docker rmi tpi-libreria-api
   rm -rf "$BACKEND"
   ```

La suite automatizada (`npm test`) no necesita nada de esto: no sale a la red.

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
(CM-1 a CM-16).

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
