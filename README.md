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
- [Despliegue](#despliegue)
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
   se ve la portada pública, con los accesos «Ingresar» y «Crear cuenta».
3. Elegir «Ingresar» y entrar con un usuario de demostración (ver [Usuarios de demostración y
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
de acceso (login y registro) no la muestran, se enlazan entre sí y su marca
«Librería El Faro» vuelve a la portada.

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
| Portada | `index.html` (la raíz) | Presentar la librería y ofrecer «Ingresar» y «Crear cuenta»; HTML estático, sin scripts, sin datos y sin solicitudes a `/api`; se ve igual con o sin sesión |
| Ingresar | `src/pages/auth/login/login.html` | Iniciar sesión con email y contraseña; lleva a Libros (administrador) o al Catálogo (cliente) |
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

> **Desde `portada-publica` (T-07) la raíz muestra la portada pública, no el login.**
> Los casos CM-12, CM-13, CM-25, CM-28, CM-29 y CM-A6 de abajo dicen «la raíz lleva al
> login» o «`/` y `/index.html` redirigen al login»: eso es lo que se observó cuando
> se ejecutaron y se conserva tal cual (regla dura 10). Hoy la raíz es la portada
> y su acceso «Ingresar» lleva al login; ver CM-31 en adelante.

**Ejecución del 2026-11-09** (change `operaciones-contra-api`): recorrido
automatizado en Google Chrome 157 (modo headless, mediante el protocolo de
herramientas de desarrollo), con un perfil nuevo por pasada, **contra el backend
local de Docker** (sección «Backend local para verificar escrituras»: clon del
backend en `469b8db`, PostgreSQL 17, imagen construida desde `despliegue/` y
sembrada con `seed.py` dentro del contenedor local) y `API_PROXY_TARGET=http://127.0.0.1:8000`
con el servidor de desarrollo de Vite (`npx vite`, equivalente a `npm run dev`).
Antes de la primera escritura, `GET /api/health/ready` por el reenvío respondió
`{"estado":"ok","base":"disponible"}` y el registro del contenedor local mostró
esa solicitud. Ninguna escritura se envió a producción: la única corrida con el
destino por defecto fue CM-17, con el servidor de desarrollo detrás de un
bloqueo adicional que impide cualquier solicitud que no sea de lectura hacia un
destino remoto. Las condiciones de red (fallo, retención hasta el tiempo
agotado y latencia) se provocaron con la interceptación de solicitudes del
protocolo de herramientas de desarrollo, equivalente a bloquearlas desde la
pestaña de red. Los anchos de 320 px y 1280 px se comprobaron con el
desplazamiento horizontal de la página sin barras de desplazamiento clásicas
(como en un móvil). No reemplaza una pasada visual en el navegador habitual de
cada integrante ni una auditoría con lector de pantalla (**no ejecutadas**).

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-1** Búsqueda en mayúsculas, vacía e inexistente | Coincidencias sin distinguir mayúsculas; catálogo completo; mensaje sin resultados | Con los 5 libros sembrados: `RAYUELA` → 1 tarjeta; `   rayuela   ` → 1; vacía → 5; `ISIDRO` → 1; `zzzz` → 0 con «No se encontraron libros cuyo título coincida con la búsqueda.»; «Sin clasificar» solo en «La invención de Morel»; la ficha de «Rayuela» abre con la sinopsis «Este libro todavía no tiene una sinopsis cargada.». No ejecutado: un título con `<i>&</i>` (ningún libro de la base lo trae; el código usa `textContent`) | ✅ Aprobado |
| **CM-2** Alta de libro con ISBN existente y luego nuevo | El duplicado se rechaza; el válido aparece en Libros, en la venta y en el Catálogo | `978 950 00 0001 1` (con separadores distintos) rechazado con «Ese ISBN ya está registrado.» y sin solicitud; «El Aleph» (ISBN `978-950-00-0006-6`) se registra y la tabla pasa de 5 a 6 filas; el Catálogo lo muestra (8 tarjetas al final de la pasada) y el selector de Ventas lo ofrece; repetirlo sin recargar se rechaza como ISBN existente | ✅ Aprobado |
| **CM-3** Alta de cliente con email inválido, existente en mayúsculas y nuevo | Se rechazan los dos primeros; el nuevo aparece en listado y selección | `ana@` rechazado con «El email no tiene un formato válido.»; `  ANA@EXAMPLE.COM ` rechazado con «Ese email ya está registrado.»; ninguno envió solicitud; «María Nueva» se registra con su perfil (4 filas) y, tras la pasada, el selector de Ventas ofrece todos los clientes de la base (7 de 7) | ✅ Aprobado |
| **CM-4** Venta sin cliente, cantidad 0, negativa o decimal; libro repetido | No se confirma; el duplicado no crea otro renglón | Sin cliente ni renglones: «Seleccione un cliente existente.» y «Agregue al menos un libro a la venta.»; `0`, `-2`, `1.5` y vacía rechazadas con «La cantidad debe ser un entero positivo seguro.»; un renglón editado a `0` bloquea la confirmación («Corrija la cantidad marcada o quite ese renglón antes de continuar.»); el libro repetido suma en la misma fila (1 + 1 → 2); sin cliente se conserva el borrador. Ninguno envió `POST` | ✅ Aprobado |
| **CM-5** Dos unidades a 1500 y una a 2000 | Subtotales 3000 y 2000; total 5000; detalle en el historial | Con dos libros de 1500 y 2000 creados en el backend local: borrador $ 5000,00; `POST /ventas/` con `{"cliente_id":1,"renglones":[{"libro_id":10,"cantidad":2},{"libro_id":11,"cantidad":1}]}` → 201; comprobante `ven-03` con $ 3.000,00, $ 2.000,00 y total $ 5.000,00 (los importes son los del servidor); el Historial muestra la venta con el mismo detalle | ✅ Aprobado |
| **CM-6** Cambio exclusivo del precio del libro | El historial conserva los importes confirmados; el Catálogo muestra el precio nuevo | `PATCH /libros/10` a 9999 en el backend local y recarga del Historial: el detalle de `ven-03` conserva $ 1.500,00 × 2 = $ 3000,00, $ 2000,00 y total $ 5000,00; Libros y el Catálogo muestran $ 9999,00. El título del otro libro, renombrado también en la base, aparece con su nombre actual (así lo informa la API, ver «Historial») | ✅ Aprobado |
| **CM-7** Recarga después de altas y venta | Se recuperan los datos sin duplicar | Tras tres cargas de cada vista, con la base en 10 libros, 7 clientes y 7 ventas: Libros 10, Clientes 7, Historial 7, Catálogo 10 y Ventas con 7 clientes y 10 libros, en las tres cargas | ✅ Aprobado |
| **CM-8** Teclado y anchos de 320 px y 1280 px | Foco visible, controles utilizables y tablas con desplazamiento propio | Sin desplazamiento horizontal de la página en las cinco vistas a 1280 px y a 320 px ni con los cuatro diálogos abiertos (ficha del Catálogo, «Completar perfil», detalle de venta y comprobante); con Tab se recorrieron 17 (Catálogo), 18 (Libros), 14 (Clientes), 12 (Ventas) y 15 (Historial) paradas, todas con indicador de foco visible; al abrirse cada diálogo el foco queda dentro (en el detalle de venta, en su título). No ejecutado: recorrido completo con Tab dentro de cada diálogo ni lector de pantalla | ✅ Aprobado (alcance indicado) |
| **CM-17** Escritura hacia producción desde desarrollo | La guarda responde `403` y nada llega a producción | Con el destino por defecto, «Registrar cliente» muestra «No se registró el cliente. El servidor de desarrollo no reenvía escrituras a la API de producción. Usá un backend local con API_PROXY_TARGET.»; la pestaña de red muestra un solo `POST /api/clientes/` → 403 y un `POST /api/clientes/` directo por el reenvío también da 403 con ese `detail`; el bloqueo adicional registró 0 escrituras hacia producción | ✅ Aprobado |
| **CM-18** Alta de libro con stock y autores con rol | El libro se registra con stock, roles y orden; el precio se redondea al centavo | Título «El Aleph», precio `1500,125`, stock 3, dos autores (el primero «autor», el segundo «traductor») y doble clic en «Registrar libro»: un solo `POST /libros/` con `"precio":"1500.13","stock":3` y `"autores":[{"autor_id":2,"rol":"autor","orden":1},{"autor_id":3,"rol":"traductor","orden":2}]` → 201; la base muestra precio 1500.13, stock 3 y esos roles y orden; la tabla sube a 6 filas | ✅ Aprobado |
| **CM-19** Libros: validaciones y rechazos | Los límites se rechazan junto al campo sin enviar; los rechazos y la falta de respuesta se informan | Stock vacío, `-1`, `2,5` y `abc`: error junto al stock y 0 solicitudes (el navegador entrega vacío para `abc` y se informa «El stock es obligatorio.»); título de 201 caracteres, ISBN de 21 y precio `100000000` rechazados junto a su campo; stock `0` registrado; un ISBN creado en el backend local después de abrir la página produce el `409` mostrado como «No se registró el libro. No se pudo crear el libro: editorial, genero, autor o isbn invalidos.» con el formulario conservado; con el `POST` cortado, no se anuncia éxito y se informa que no se pudo confirmar si se guardó y que se volvió a leer el listado | ✅ Aprobado |
| **CM-20** Clientes: alta con perfil y rechazos | El alta envía cliente y perfil; los límites se rechazan; un email repetido se muestra junto al email | Nombre vacío, de 101 caracteres, teléfono de 3 y de 31 dígitos, dirección de 256 y email de 256 caracteres: error junto al campo y 0 solicitudes; «María Nueva» con teléfono `+54 9 261 123 4567` y dirección «Calle 1 100» y doble clic: `POST /clientes/` → 201 y `POST /clientes/4/perfil` → 201 (una sola vez cada uno), y la base guarda el perfil; un email creado en el backend local después de abrir la página produce el `409` mostrado junto al email, sin enviar el perfil y con lo escrito conservado; el cliente sembrado con perfil no ofrece ningún control de edición | ✅ Aprobado |
| **CM-21** Clientes: perfil fallido y «Completar perfil» | El cliente queda registrado sin perfil y se puede completar una sola vez | Con `POST /clientes/{id}/perfil` cortado: el cliente se registra (201), se informa «El cliente se registró, pero no se pudo guardar su teléfono y dirección: No se pudo confirmar si el servidor registró la operación… Podés completarlos con «Completar perfil».» y la fila muestra «—»; sin el corte, «Completar perfil» valida el teléfono (`12` rechazado), guarda con 201 y la fila muestra teléfono y dirección sin botón; si el perfil se crea por fuera antes, el `409` se muestra («El cliente ya tiene un perfil.») y se vuelve a leer el listado | ✅ Aprobado |
| **CM-22** Venta: importes del servidor y sin control de stock | El servidor calcula los importes; no se controla ni descuenta el stock | Componer (agregar, cambiar, quitar) no hizo ninguna solicitud; 12 unidades de un libro con stock 10 se aceptan, la venta se confirma y el stock sigue en 10; con el precio de un libro cambiado a 2500 en la base después de armar un borrador de $ 4000,00, el comprobante muestra $ 2.500,00 × 2 = $ 5.000,00 (los del servidor) | ✅ Aprobado |
| **CM-23** Venta: falta de respuesta y envío único | No se anuncia éxito, el borrador se conserva y no se reenvía solo; un doble envío es una venta | Con el `POST /ventas/` cortado: «No se pudo confirmar si la venta se registró. Revisá el Historial antes de reintentar…», borrador intacto y una sola solicitud (la base no registró la venta); con el `POST` retenido el mensaje apareció a los 10,1 s, con una sola solicitud y Enter durante la espera sin efecto; el reintento manual posterior se registró; con 2,5 s de latencia, un clic y dos Enter enviaron un solo `POST /ventas/`, el botón estuvo deshabilitado durante la espera y se registró una venta | ✅ Aprobado |
| **CM-24** Lectura inicial fallida | Se informa el error y no se puede registrar ni confirmar | Con las solicitudes a `/api/clientes/*` cortadas, Ventas y Clientes muestran «No se pudieron cargar los datos. No se pudo conectar con el servidor.» y sus botones quedan deshabilitados; con `/api/editoriales/*` cortadas, Libros hace lo mismo; con `/api/ventas/*` cortadas, el Historial informa el error y no una lista vacía | ✅ Aprobado |

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

**Regresión de CM-1 a CM-8 con sesión de administrador** (resultados de aquel change,
cuando Libros, Clientes y Ventas aún usaban `localStorage`; los vigentes están en la
tabla de arriba) (sesión iniciada por el
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

### Casos manuales del contenedor (`despliegue-frontend`)

**Ejecución del 2026-11-09**: la imagen construida con el `Dockerfile` (nginx 1.30.6,
Node 22.23.4) corrida en Docker local. Los recorridos del navegador son
automatizados en Google Chrome 157 (modo headless, protocolo de herramientas de
desarrollo), con un perfil nuevo, **a través del contenedor** y no del servidor de
Vite. Las escrituras fueron **solo contra el backend local** (clon del backend en
`469b8db`, PostgreSQL 17, sembrado dentro del contenedor local); antes de escribir,
`GET /api/health/ready` por el contenedor respondió `{"estado":"ok","base":"disponible"}`
y el registro del backend local mostró esa solicitud. Contra producción
(`API_UPSTREAM=https://api.ismaelsuarez.me`) solo se enviaron `GET` (el registro de nginx
no muestra ningún otro método). **No ejecutado**: la entrada a través del dominio real
con HTTPS (`https://libreria.ismaelsuarez.me`, a cargo del usuario); el nombre
`libreria_api` de Easypanel (se reprodujo con un alias de red de Docker, no se
comprobó en Easypanel); una pasada visual en el navegador habitual de cada integrante
y una auditoría con lector de pantalla.

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-25** Contenedor: salud, entrada, caché y cabeceras | `/healthz` 200; `/` y `/index.html` redirigen al login con ruta relativa; cabeceras de seguridad en toda respuesta; `no-cache` en el HTML e `immutable` en `assets/`; gzip; 404 sin respaldo de SPA; proceso sin `root`; imagen saludable y sin código fuente ni `.env` | `sh despliegue/comprobar.sh` en verde (44 de 44 casos) contra el destino por defecto resuelto por el alias, contra `API_UPSTREAM=https://api.ismaelsuarez.me` y con una barra final en el valor. `docker exec … id -u` → `101`; estado `healthy`; lo servido son `index.html`, `assets/` y `src/pages/**.html` (ningún `.ts`, `node_modules/`, `tests/` ni `.env`) y `grep` de `api.ismaelsuarez` en lo servido, sin resultados; `/src/pages/auth/login` sin barra responde 404 | Aprobado |
| **CM-26** Contenedor: reenvío de lecturas y escrituras al backend local | `POST /api/clientes/` llega como `POST /clientes/` y devuelve 201; `/apiclientes/` 404 sin llegar al backend; `GET /api/clientes` → 307 con `Location: /api/clientes/`; cuerpo de más de 64 KiB → 413 sin llegar; una escritura no se repite; el destino lento se espera | `POST /api/clientes/` → 201 (id 4) y la línea `POST /clientes/ 201` en el registro del backend; con 60 KiB válidos → 201; con 65 KiB (66 593 bytes) → 413 y el registro del backend no cambió; `POST /apiclientes/` → 404 sin línea nueva; `307` con `Location: /api/clientes/` (el backend envió `http://libreria_api:8000/clientes/`); consulta `?limit=100&offset=0&titulo=r%C3%ADo` llegó idéntica; con un destino que corta la conexión, `POST /api/ventas/` → 502 en 2 ms y el destino recibió **una** conexión; un destino que tarda 12 s (más que los 10 s del cliente) → 200 a los 12,0 s. Con el backend detenido, `POST /api/ventas/` → **504 a los 5 s** mientras la caché de nombres (30 s) conservaba la dirección vieja, y **502 inmediato** al vencer. Por eso el detenido no es «502 inmediato» como preveía la tarea: el cliente trata ambos como resultado incierto | Aprobado (con la salvedad del 504) |
| **CM-27** Contenedor: destino que no resuelve | El contenedor arranca, queda saludable y sirve las páginas; `/api/…` responde 502 enseguida; al aparecer el nombre, funciona sin reiniciar | En una red sin el alias: estado `healthy`, 0 reinicios, `/healthz` 200 y login 200; `GET /api/health/ready` → 502 en 1,7 ms (`libreria_api could not be resolved`); `comprobar.sh` 38 de 44 (fallan solo los 6 casos que necesitan la API). Al conectar el alias a esa red, las tres solicitudes siguientes → 200 sin reiniciar. Con la API detenida y reiniciada, el frontend (sin reiniciar) volvió a responder 200 | Aprobado |
| **CM-28** Contenedor en el navegador, con el backend local | La raíz lleva al login; el administrador llega a Libros; un `client` no llega a `/admin/`; las siete páginas se ven a 1280 px y a 320 px sin violaciones de CSP ni errores y sin desplazamiento horizontal; un alta de cliente aparece en el listado | 41 de 41 comprobaciones: raíz → login; registro de un usuario nuevo → login → Catálogo (rol `client`); desde allí `/admin/libros/` vuelve al Catálogo; administrador → Libros; Catálogo, Libros, Clientes, Ventas e Historial (y login y registro) a 1280 px y a 320 px sin eventos de política de seguridad de contenido ni errores de consola (los 404 del sondeo por identificador de autores y clientes son esperados), sin desplazamiento horizontal; Catálogo con 5 tarjetas; alta de «Cliente Navegador T06» con teléfono y dirección → «Cliente registrado correctamente.» y aparece en el listado; todas las solicitudes al mismo origen (`GET` y `POST`) | Aprobado |
| **CM-29** Contenedor en el navegador, con lecturas de producción | Entrada, ingreso y Catálogo con los libros de producción; ninguna escritura; todo al mismo origen | 8 de 8 comprobaciones con `API_UPSTREAM=https://api.ismaelsuarez.me`: raíz → login, administrador → Libros, Catálogo con 5 tarjetas, sin errores ni violaciones de CSP, 6 solicitudes a `/api` todas `GET` y al mismo origen | Aprobado |
| **CM-30** Paquete de entrega | `npm run entrega` deja un `.zip` con una sola carpeta raíz, lo incluido y nada de lo excluido; los cambios sin commit no entran; desde el `.zip` corren `npm ci`, `npm run build` y `npm test` y la imagen se construye | Código 0; una única carpeta raíz `utn-prog3-tpi-libreria-ts/` (149 archivos: `index.html`, `src/`, `tests/`, los archivos de configuración, `.env.example`, `README.md`, `Dockerfile`, `.dockerignore` y `despliegue/`); ninguno de `node_modules/`, `dist/`, `.git/`, `.engram/`, `.githooks/`, `.claude/`, `.atl/`, `openspec/`, `knowledge-base/`, `discovery/`, `docs/`, `CHANGES.md`, `AGENTS.md`, `CLAUDE.md` ni `.zip`. Un cambio en `index.html` sin commit no apareció en el `.zip`. Descomprimido en una carpeta vacía: `npm ci` 0, `npm run build` 0 (`dist/` con la entrada y las vistas), `npm test` 626 de 626 y `docker build` 0 | Aprobado |

### Casos manuales de la portada pública (`portada-publica`)

**Ejecución del 2026-11-09**: la imagen construida con el `Dockerfile` desde un clon
limpio de la rama, corrida en Docker local con `API_UPSTREAM=https://api.ismaelsuarez.me`
(el destino de producción, **solo con `GET`**: no se levantó el backend local porque
ninguna comprobación escribe en la API; el único alta, un usuario de prueba, solo toca
`localStorage` del perfil del navegador). Recorridos automatizados en Google Chrome 157
(modo headless, protocolo de herramientas de desarrollo), con un perfil nuevo, a través
del contenedor: 54 comprobaciones, todas correctas. Los contrastes se calcularon sobre
los colores computados y un fondo oscuro aproximado (`#10302a`) para el degradado.

| Caso | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|
| **CM-31** Portada sin sesión | Se ve la marca, el título, el texto de presentación y el pie con los tres integrantes; un solo `h1`, encabezado, navegación, contenido principal y pie; sin scripts ni solicitudes a `/api` ni a otro origen; sin errores ni violaciones de CSP | Título de pestaña «Inicio · Librería El Faro»; `h1` «Libros con historia, a un paso»; 0 elementos `script` y 0 manejadores; las solicitudes fueron `/`, una hoja de estilo `index-<huella>.css`, `vista-inmersiva-<huella>.css` y `estanteria-<huella>.webp` (todas del mismo origen, ninguna a `/api`); consola sin errores ni violaciones de la política de seguridad de contenido; sin respuestas 4xx ni 5xx; `localStorage` vacío tras abrirla | Aprobado |
| **CM-32** Portada a 320, 768 y 1280 px, con teclado | Sin desplazamiento horizontal; los dos accesos completos y usables; Tab recorre los enlaces con foco visible; texto legible | `scrollWidth` igual a `clientWidth` en los tres anchos (320, 768 y 1280); a 320 px los accesos se apilan (252 px de ancho, 48 px de alto) y a 768 y 1280 px van en fila; Tab: «Ingresar», «Crear cuenta», con contorno sólido de 3 px (`#efd5a3`) en ambos; contraste calculado: texto de botones 8,9:1 y 13,5:1, título 13,5:1, presentación 11,4:1, nota 9,7:1, contorno de foco 10:1 | Aprobado |
| **CM-33** Accesos sin sesión y regreso desde login y registro | «Ingresar» abre el login, «Crear cuenta» el registro; la marca de ambos lleva a la portada, con foco visible | «Ingresar» → `/src/pages/auth/login/login.html` con su formulario; «Crear cuenta» → `/src/pages/auth/registro/registro.html` con su formulario; la marca «Librería El Faro» de cada una (`href="../../../../index.html"`) vuelve a `/index.html` y se ve la portada; la marca sigue siendo un enlace tras correr la guarda y recibe foco visible por teclado (contorno de 3 px) | Aprobado |
| **CM-34** Portada con sesión | Se ve igual que sin sesión, no modifica `users` ni `userData`; los accesos terminan en el destino del rol | Con un `client` (cuenta `portada@prueba.test`, registrada e ingresada en la misma prueba): la portada se ve igual, sin `/api`, `users` y `userData` idénticos antes y después, «Crear cuenta» e «Ingresar» terminan en el Catálogo sin mostrar el registro. Con el `admin`: igual, y «Ingresar» termina en Libros | Aprobado |
| **CM-35** Protección de rutas sin cambios | Sin sesión, las cinco páginas protegidas llevan al login (también al escribir la dirección después de abrir la portada) y el Catálogo no pide `/api`; cada rol conserva sus páginas | Sin sesión: Catálogo, Libros, Clientes, Ventas e Historial → `login.html`, 0 solicitudes a `/api`. `client`: las cuatro páginas de `admin` → Catálogo. `admin`: las cinco se muestran y el login con sesión redirige a Libros. `src/main.ts` y `src/logica/sesion.ts` sin cambios (`git diff` contra `main`) y `tests/logica/sesion.test.ts` 95 de 95 | Aprobado |
| **CM-36** Contenedor: la raíz es la portada | `/` y `/index.html` responden 200 con la portada, sin `Location`, `no-cache` y las cabeceras de seguridad; ninguna otra ruta cambia respecto de `main` | `sh despliegue/comprobar.sh` en verde (60 de 60 casos) contra la imagen de un clon limpio de la rama; contra una imagen de `main` el mismo script falla solo los 8 casos de la entrada (estado 302, sin `no-cache`, con `Location`, sin enlace) y las cabeceras de `/healthz`, login, registro, `assets/`, 404, `/api`, `/apiclientes/` y `/src/pages/auth/login` son idénticas en ambas imágenes; contenedor `healthy`, `id -u` 101; `/` y `/index.html` entregan el mismo cuerpo | Aprobado |
| **CM-37** Portada bajo la subruta `/libreria/` | La portada, sus estilos e imagen y sus accesos funcionan dentro de la subruta, sin 404 | `dist/` copiada a `/libreria/` de un servidor estático: portada con su imagen de fondo, «Ingresar» → `/libreria/src/pages/auth/login/login.html`, «Crear cuenta» → `/libreria/src/pages/auth/registro/registro.html` y la marca de cada una → `/libreria/index.html`; 0 respuestas 404 | Aprobado |

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
index.html                  portada pública estática (sin script ni datos), con enlaces relativos al login y al registro
package.json, tsconfig.json, vite.config.ts, .env.example
Dockerfile, .dockerignore   imagen de producción (Node compila, nginx sirve en el puerto 8080)
despliegue/                 nginx/ (plantilla y cabeceras), comprobar.sh (solo lectura) y DESPLIEGUE.md (pasos de Easypanel)
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
├── styles/                 estilos: base, disposición, componentes y uno por función (portada.css es el de index.html)
└── assets/                 estanteria.webp y portadas/
tests/                      pruebas de Vitest (lógica, almacén, repositorios, fixtures de la API); van en la entrega
```

## Despliegue

La aplicación se publica como un contenedor: una imagen de varias etapas
(`Dockerfile` en la raíz) compila con Node 22 (`npm ci` y `npm run build`) y sirve
`dist/` con nginx sin privilegios (usuario `nginx`, puerto interno **8080**, sin
TLS: lo termina el proxy de la plataforma). La imagen se construye sin variables
de entorno ni secretos y no contiene el código fuente ni `node_modules/`.

**Publicada en** `https://libreria.ismaelsuarez.me` desde el 2026-11-09 (VPS con
Easypanel, App `web` del proyecto `libreria`, rama `main`, `/api` reenviado por la
red interna a `libreria_api:8000`, sin variables de entorno). Los pasos están en
[`despliegue/DESPLIEGUE.md`](despliegue/DESPLIEGUE.md). Resultado del despliegue:

| Comprobación | Resultado observado (2026-11-09) |
|---|---|
| DNS | `libreria.ismaelsuarez.me` ya resolvía a la IP del VPS (comodín); no hizo falta un registro nuevo |
| Estado de `web` | `healthy` después de Implementar |
| `sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me` | 44 de 44 casos correctos, con `/api/health/ready` respondido por la red interna |
| Sexto libro (PA-15) | Registrado desde la aplicación publicada, a la primera: #6 «La furia» (Silvina Ocampo, Sudamericana, Cuento, ISBN 978-950-00-0006-6); el listado de producción tiene 6 libros |
| Incidente | Durante la compilación de `web` el servicio `api` dejó de correr (sin error en sus registros; probablemente falta de memoria en el VPS de 2 GB). Se recuperó con **Reiniciar** (no Implementar), sin pérdida de datos. Después de implementar `web`, comprobar que `api` siga en verde |

Construir y probar en local (requiere Docker):

```bash
docker build -t tpi-libreria-web .
docker run -d --name tpi-libreria-web -p 127.0.0.1:8080:8080 tpi-libreria-web
sh despliegue/comprobar.sh http://127.0.0.1:8080   # una línea por caso; código distinto de 0 si alguno falla
docker rm -f tpi-libreria-web
```

`despliegue/comprobar.sh <base>` solo envía `GET` y `HEAD`, de modo que sirve igual
contra el contenedor local y contra el sitio publicado. Comprueba la salud
(`/healthz`, respondida por nginx sin consultar la API), la entrada (`/` y
`/index.html` responden `200` con la portada pública, sin redirigir, con
`no-cache`, las cabeceras de seguridad, el enlace al login y sin `<script`), las cabeceras
de seguridad (política de contenido estricta, `nosniff`, `Referrer-Policy`), la
caché (`no-cache` para el HTML, un año e `immutable` para `assets/`), gzip y el
404 de toda ruta que no sea un archivo (la aplicación es multipágina, sin
respaldo de SPA). Los casos de `/api` se explican abajo.

### Reenvío de `/api` y variable `API_UPSTREAM`

El navegador solo habla con su propio origen: la API de producción no envía
cabeceras CORS. Por eso nginx reenvía toda ruta que empieza con `/api/` al destino
de la variable `API_UPSTREAM`, que se lee **al iniciar el contenedor** (no hace
falta reconstruir la imagen) y nunca llega al código del navegador. Se quita el
prefijo (`/api/libros/?limit=1` llega como `/libros/?limit=1`), se conservan
método, cuerpo y parámetros, y las redirecciones del destino (el `307` por una
barra final) vuelven como `/api/…` del mismo origen. A diferencia de
`npm run dev`, el servidor de producción **sí reenvía las escrituras**.

| `API_UPSTREAM` | Cuándo |
|---|---|
| `http://libreria_api:8000` (valor por defecto) | En Easypanel: la API del proyecto `libreria` por la red interna, sin TLS ni salto por el proxy público |
| `https://api.ismaelsuarez.me` | Alternativa si el nombre interno no resuelve; nginx presenta el nombre por SNI y verifica el certificado |
| `http://<alias>:<puerto>` | Un backend local en una red de Docker (ver abajo) |

El nombre del destino se resuelve **en cada solicitud** (con el DNS de Docker): el
contenedor arranca y queda saludable aunque el destino todavía no exista, y mientras
no resuelve `/api/…` responde `502` enseguida. Solo se reenvían las rutas que
empiezan exactamente con `/api/` (`/api` y `/apiclientes/` son `404`); nginx no
reintenta una solicitud, espera al destino hasta 30 s (más que los 10 s del cliente)
y rechaza con `413` los cuerpos de más de 64 KiB.

**Lecturas contra producción** (solo `GET`; no hay que escribir nunca contra
`https://api.ismaelsuarez.me` desde una prueba):

```bash
docker run -d --name tpi-libreria-web-prod -e API_UPSTREAM=https://api.ismaelsuarez.me -p 127.0.0.1:8080:8080 tpi-libreria-web
sh despliegue/comprobar.sh http://127.0.0.1:8080   # incluye /api/health/ready y el 307 de /api/libros
docker rm -f tpi-libreria-web-prod
```

**Escrituras: solo contra el backend local.** Con el backend local de [Backend
local para verificar escrituras](#backend-local-para-verificar-escrituras) en marcha
(su contenedor lleva el alias de red `libreria_api`, que es el destino por defecto,
así se prueba la imagen sin cambiar su configuración):

```bash
docker run -d --name tpi-libreria-web-local --network tpi-libreria-red -p 127.0.0.1:8081:8080 tpi-libreria-web
curl -s http://127.0.0.1:8081/api/health/ready      # {"estado":"ok","base":"disponible"}
docker logs tpi-libreria-api | tail -n 3             # debe mostrar esa solicitud: es el backend local
curl -s -X POST http://127.0.0.1:8081/api/clientes/ -H 'Content-Type: application/json' \
  -d '{"nombre":"Cliente de prueba","email":"prueba@example.test"}'   # 201 del backend local
docker rm -f tpi-libreria-web-local
```

Antes de escribir se comprueba siempre el destino (la segunda y la tercera línea).

---

## Entrega

La entrega es un archivo `.zip` que genera un comando, a partir del **último
commit** (los cambios sin commit no entran):

```bash
npm run entrega     # deja utn-prog3-tpi-libreria-ts.zip en la raíz (requiere Git)
```

El `.zip` tiene una única carpeta raíz, `utn-prog3-tpi-libreria-ts/`, con la
estructura de carpetas del repositorio. Contiene: `index.html`, `src/`, `tests/`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`.env.example`, `README.md`, `Dockerfile`, `.dockerignore` y `despliegue/`. Con
`tests/` dentro, `npm test` funciona también desde el `.zip`; la compilación
(`npm run build`) genera `dist/`, que se sirve desde cualquier subruta.

Quedan fuera: `node_modules/`, `dist/`, `.git/`, `.engram/`, `.githooks/`,
`.claude/`, `.atl/`, `openspec/`, `knowledge-base/`, `discovery/`, `docs/`,
`CHANGES.md`, `AGENTS.md`, `CLAUDE.md`, `.gitignore` y todo archivo `.zip`.

Cómo se comprueba (en una carpeta vacía fuera del repositorio):

```bash
unzip -l utn-prog3-tpi-libreria-ts.zip      # una sola carpeta raíz y la lista de arriba
unzip -q utn-prog3-tpi-libreria-ts.zip -d "$(mktemp -d)"   # luego, dentro de esa carpeta:
npm ci && npm run build && npm test         # los tres terminan con código 0
```

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
     --network-alias libreria_api \
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
(CM-1 a CM-37).

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
