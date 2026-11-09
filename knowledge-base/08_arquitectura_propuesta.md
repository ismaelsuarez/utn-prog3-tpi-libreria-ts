# Arquitectura Propuesta

> Esta arquitectura corresponde a la serie TypeScript (change
> `migracion-vite-typescript`, decisiones DD-16 a DD-20 de
> `09_decisiones_y_supuestos.md`). Reemplaza a la de la serie JavaScript
> (scripts clásicos, `js/`, `node --test`), que se conserva como historial en
> `CHANGES.md`. Los nombres de archivos y carpetas pueden ajustarse en cada
> change de OpenSpec, siempre que se respeten las restricciones.

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| Separación estructura / estilos / comportamiento | HTML en `src/pages/`, CSS en `src/styles/`, TypeScript | Lo valora expresamente la consigna |
| Lógica pura separada del DOM | `src/logica/` | Permite probar validaciones, filtro y cálculos con Vitest y reutilizarlos entre páginas |
| Repositorio (frontera de datos) | `src/datos/repositorios.ts` | Las vistas dependen solo de interfaces asíncronas con la forma de la API de producción; el origen de los datos se cambia sin tocar las vistas |
| Raíz de composición | `src/datos/proveedor.ts` | Único lugar donde se eligen las implementaciones: un cliente HTTP y todos los repositorios sobre la API; crearlos no hace solicitudes |
| Adaptador | `src/datos/api/` | Implementa los repositorios sobre la API (`GET` y `POST`), con sondeo por identificador para los listados que la API no ofrece |
| Módulo por vista | `src/pages/<zona>/<vista>/<vista>.ts` | Cada vista conecta su DOM y sus eventos sin mezclar responsabilidades |
| Generación de interfaz desde datos | Módulos de vista | Catálogo, listados y selectores salen de los repositorios, no del HTML escrito a mano |
| Instantánea histórica (snapshot) | Construcción de la venta | Los renglones copian precio y datos descriptivos en lugar de referenciar el catálogo |
| Tipos de dominio | `src/types/` | Una forma con nombre por agregado, igual a los DTO de la API, comprobada por `tsc` con fixtures reales |

## Estructura de directorios

```
proyecto/
├── index.html                  # Entrada: redirige al login (ruta relativa)
├── package.json, tsconfig.json, vite.config.ts, .env.example
├── src/
│   ├── main.ts                 # Entrada común: todas las vistas la importan primero
│   ├── vite-env.d.ts           # Tipos de Vite y variables de entorno (VITE_API_BASE)
│   ├── pages/
│   │   ├── auth/               # login/ y registro/ (login.html + login.ts, registro.html + registro.ts)
│   │   ├── client/catalogo/    # catalogo.html, catalogo.ts, ficha-libro.ts, portadas.ts
│   │   └── admin/
│   │       ├── libros/         # libros.html, libros.ts
│   │       ├── clientes/       # clientes.html, clientes.ts
│   │       ├── ventas/         # ventas.html, ventas.ts, ticket-venta.ts
│   │       └── historial/      # historial.html, historial.ts
│   ├── logica/                 # Funciones puras, sin DOM
│   │   ├── texto.ts, dinero.ts, fecha.ts
│   │   ├── catalogo.ts, libros.ts, clientes.ts, ventas.ts
│   │   ├── usuarios.ts         # validarRegistro, validarIngreso, buscarPorEmail
│   │   └── sesion.ts           # esSesion, esUsuarioRegistrado, aSesion, destinoPorRol, rutaDe
│   ├── datos/
│   │   ├── repositorios.ts     # Interfaces de repositorio (marcan las operaciones sin endpoint)
│   │   ├── proveedor.ts        # Raíz de composición (repositorios y `autenticacion`)
│   │   ├── autenticacion.ts    # ServicioAutenticacion: registrar, ingresar, obtenerSesion, cerrarSesion
│   │   ├── errores.ts          # ErrorDeRepositorio, ErrorDeAlmacenamiento, ErrorDeCriptografia
│   │   ├── api/base.ts         # obtenerBaseApi: base `/api` del mismo origen
│   │   ├── api/cliente-http.ts # crearClienteHttp: `obtener` (GET) y `enviar` (POST JSON), tiempo límite de 10 s, sin reintentos, fetch inyectable
│   │   ├── api/errores-api.ts  # ErrorDeApi (http, red, tiempo, formato) e interpretarCuerpoDeError
│   │   ├── api/paginacion.ts   # recorrerPaginas (limit 100), mapearConLimite y sondearPorIdentificador
│   │   ├── api/repositorios-api.ts # crearRepositoriosApi: libros, editoriales, géneros, autores, clientes y ventas
│   │   ├── api/reenvio.ts      # guarda de desarrollo: solo la importan vite.config.ts y las pruebas
│   │   └── local/              # almacen-local.ts (único que nombra localStorage),
│   │                           # almacen-usuarios.ts (claves `users` y `userData`, almacenamiento
│   │                           # inyectado), contrasenas.ts (PBKDF2-SHA-256), usuarios-iniciales.ts
│   ├── types/                  # Id, Dinero, Libro, LibroDetalle, Cliente, Venta, ErrorApi, IUser, Rol…
│   ├── utils/                  # dom.ts (mensajes, búsqueda tipada, errores de campo, cierre de sesión),
│   │                           # auth.ts (sesión y destino por rol) y navigate.ts (navegación)
│   ├── styles/                 # base, disposición, componentes y una hoja por función
│   └── assets/                 # estanteria.webp, portadas/, LEEME.txt
├── README.md
│
│   # Fuera de la entrega (solo desarrollo)
├── tests/                      # Pruebas con Vitest (tests/**/*.test.ts) y fixtures de la API
├── node_modules/, dist/
├── docs/, discovery/, knowledge-base/, openspec/
```

## Carga de módulos

- Cada HTML carga un único `<script type="module" src="./<vista>.ts">`; Vite
  lo compila y sirve. La aplicación ya no se abre desde `file://`.
- Cada módulo de vista importa **primero** `../../../main` (entrada común) y
  luego sus dependencias con `import`/`export` (los tipos con `import type`).
  Ahí `interceptarCargaDePagina()` decide el acceso (`proteccion-de-rutas-y-roles`,
  DD-25): lee la zona de la dirección con `zonaDeRuta` y la sesión con
  `obtenerSesion()`, y aplica `decidirAcceso`. Los siete HTML nacen con
  `<body hidden>` y la intercepción lo quita solo si permite la página; si
  redirige, `main.ts` espera en el nivel superior una promesa que no se cumple
  (`await new Promise<never>(() => {})`), de modo que el módulo de la vista no
  llega a evaluarse (no lee datos, no pide `/api`, no conecta controles). La
  decisión se repite al recargar y en `pageshow` con `persisted` (caché de ida y
  vuelta; en `pagehide` el cuerpo se oculta). Las redirecciones usan `rutaDe`
  (rutas relativas), así que funcionan bajo una subruta.
- Cada módulo de vista define `async function iniciar()` que espera los
  repositorios, pinta y conecta eventos; si falla, `arrancar` muestra un
  mensaje de error en texto en la región de mensajes de la vista.
- Los módulos de apoyo de interfaz (`ficha-libro.ts`, `ticket-venta.ts`) no
  llaman a los repositorios: reciben los datos ya cargados.
- Los recursos (hojas e imágenes) se enlazan con rutas relativas o por
  importación, de modo que la compilación funcione servida desde cualquier
  subruta (`base: "./"`).

## Datos: repositorios y API

- Las vistas importan solo `src/datos/proveedor.ts` y los tipos. Los
  repositorios (`libros`, `editoriales`, `generos`, `autores`, `clientes`,
  `ventas`) son asíncronos y devuelven la forma de la API de producción:
  identificadores enteros, importes como texto decimal (`"1500.00"`), fechas
  ISO en UTC y relaciones anidadas.
- La API no ofrece `GET /clientes/` ni `GET /autores/`: esos listados los arma
  el adaptador sondeando `GET /clientes/{id}` y `GET /autores/{id}`
  (`sondearPorIdentificador`: desde el 1, 4 a la vez, hasta 10 ausentes seguidos
  posteriores al mayor identificador que mencionan las ventas o los libros).
  No hay edición ni borrado de ningún registro (regla dura 9); la única
  escritura tras el alta de un cliente es el alta de su perfil, una sola vez.
- Todos los repositorios de negocio salen de la API (`operaciones-contra-api`);
  el Catálogo usa `repositorioCatalogo` (`RepositorioLecturaLibros`, solo
  lectura) sobre el mismo cliente HTTP. El almacén local de negocio y sus claves
  `libreria.*` se retiraron.
- **Cliente HTTP** (`src/datos/api/`): `GET` con `Accept: application/json` y
  `POST` con cuerpo JSON (`enviar`); nunca `PUT`, `PATCH` ni `DELETE`. Rutas con
  barra final (`/libros/`) para evitar la redirección 307 a otro origen. Ningún
  método se reintenta; una escritura sin respuesta (red o tiempo), con un 502 o
  504 del intermediario o con un 2xx ilegible rechaza con
  `resultadoIncierto` y el mensaje «No se pudo confirmar si el servidor registró
  la operación…». Toda falla se rechaza como `ErrorDeApi` (subclase de
  `ErrorDeRepositorio`, con `tipo` `http`, `red`, `tiempo` o `formato` y `estado`)
  con mensaje en texto: el `detail` de la API, la lista de validación del 422
  unida con «; » y un `ErrorDeCampo` por elemento, o un texto fijo. Los listados
  completos recorren páginas de 100 hasta una página corta (tope de 100 páginas);
  el listado de libros se completa con `GET /libros/{id}` para traer los autores,
  con a lo sumo 4 consultas a la vez. Los importes quedan como texto.
- **Usuarios y sesión** (`registro-login-y-sesion`): nunca van a la API. Los
  atiende `src/datos/local/almacen-usuarios.ts`, con el almacenamiento
  inyectado por `almacen-local.ts` y las claves
  `users` (arreglo de `UsuarioRegistrado`: `email` normalizado, `role`,
  `contrasena` como huella PBKDF2-SHA-256 con sal, `creadoEn`) y `userData`
  (un `IUser`: `email`, `loggedIn`, `role`; nunca la contraseña). La clave
  `users` se siembra con un administrador de demostración solo si falta. Sin
  almacenamiento no hay reserva en memoria: el alta y el ingreso lanzan
  `ErrorDeAlmacenamiento`. Las vistas usan `autenticacion` de `proveedor.ts`.
- **Base `/api`**: el navegador solo llama a la base relativa `/api`
  (`VITE_API_BASE`). `npm run dev` y `npm run preview` la reenvían a
  `API_PROXY_TARGET` (por defecto `https://api.ismaelsuarez.me`) quitando el
  prefijo; en producción lo hace el contenedor del frontend (change
  `despliegue-frontend`). La API no envía cabeceras CORS, por eso nunca se la
  llama desde otro origen.
- **Guarda de escrituras en desarrollo**: `vite.config.ts` registra, antes del
  reenvío, un intermediario (`crearIntermediarioDeGuarda`, `src/datos/api/reenvio.ts`)
  que responde `403` a toda solicitud que no sea `GET`, `HEAD` ni `OPTIONS` bajo
  la base cuando el destino es `api.ismaelsuarez.me`; no hay variable para
  desactivarla. Las escrituras se prueban con un backend local en Docker
  (`API_PROXY_TARGET=http://127.0.0.1:8000`, receta en el README). La suite
  reemplaza el `fetch` global por uno que rechaza. La aplicación desplegada
  (`despliegue-frontend`) no usa Vite y sí escribe en producción cuando la opera
  el bibliotecario.

## Producción (contenedor nginx)

`despliegue-frontend` publica la compilación en un contenedor (`Dockerfile`,
`despliegue/nginx/`), no con `npm run preview`.

- **Imagen**: etapa Node 22 Alpine (`npm ci`, `npm run build`) y etapa
  `nginxinc/nginx-unprivileged` Alpine, ambas con etiqueta exacta; usuario `nginx`
  (uid 101), puerto 8080, sin TLS ni secretos; solo `dist/` en
  `/usr/share/nginx/html`. `HEALTHCHECK` sobre `/healthz`.
- **Servicio estático**: páginas múltiples sin respaldo de SPA
  (`try_files $uri =404`); `/` y `/index.html` redirigen con `302` a
  `/src/pages/auth/login/login.html` porque el script en línea de `index.html` no
  se ejecuta bajo `script-src 'self'`; `absolute_redirect off` mantiene las
  redirecciones como rutas relativas detrás del proxy HTTPS.
- **Caché y compresión**: `assets/` (nombres con huella) un año e `immutable`; el
  HTML `no-cache`; gzip para texto.
- **Cabeceras** (`despliegue/nginx/cabeceras-seguridad.conf`, con `always` e
  incluidas en cada `location`): política de contenido
  `default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  `X-Content-Type-Options: nosniff` y `Referrer-Policy: no-referrer`; sin versión
  de nginx y sin HSTS.
- **Reenvío de `/api`**: `location /api/` con `rewrite ^/api/(.*)$ /$1 break` y
  `proxy_pass` sobre una variable (`$api_destino`, tomada de `API_UPSTREAM`,
  tolerando una barra final): quita el prefijo, conserva método, cuerpo y
  parámetros, presenta al destino su propio `Host` (`$proxy_host`), usa SNI y
  verifica el certificado cuando el destino es `https://`, no reintenta
  (`proxy_next_upstream off`), espera 5 s para conectar y 30 s para leer (más que
  los 10 s del cliente) y rechaza con `413` los cuerpos de más de 64 KiB. Solo
  `/api/` reenvía: `/api` y `/apiclientes/` son `404`. `proxy_redirect` reescribe
  toda `Location` del destino a `/api/…` del mismo origen. Reenvía las escrituras:
  la guarda es del servidor de Vite y no existe en el contenedor.
- **Resolución en tiempo de ejecución**: el `resolver` toma los servidores de
  `/etc/resolv.conf` (en Easypanel, el DNS embebido de Docker, `127.0.0.11`) y
  guarda el resultado 30 s; el contenedor arranca y queda `healthy` aunque el
  destino no exista todavía, `/api/…` responde `502` mientras no resuelve y lo
  alcanza apenas aparece, sin reiniciar.
- **Comprobación**: `despliegue/comprobar.sh <base>` (solo `GET` y `HEAD`).

## Estrategia de verificación

| Nivel | Qué cubre | Herramienta |
|---|---|---|
| Tipos | Todo `src/` y `tests/` en modo estricto, sin `any`; los fixtures de la API se declaran con `satisfies` | `npx tsc` (parte de `npm run build`) |
| Pruebas automatizadas | Funciones puras, almacenes de usuarios y sesión con almacenamiento simulado inyectado, cliente HTTP, repositorios sobre la API y guarda de desarrollo, con solicitudes simuladas (sin red) | Vitest (`npm test`) |
| Casos manuales | Comportamiento observable en el navegador, incluidos DOM, teclado y anchos | Navegador, registrados en el README (CM-1 a CM-8) |

- Las pruebas automatizadas no reemplazan los casos manuales.
- El DOM no se prueba con un runner automático; se cubre con los casos
  manuales.
- `tests/`, `node_modules/` y `dist/` no forman parte de la entrega.

## Seguridad

- **Autenticación y autorización**: la API de producción no ofrece ninguna;
  se resolverán solo en el cliente (`registro-login-y-sesion` y
  `proteccion-de-rutas-y-roles`). **Limitación conocida**: la API queda
  abierta; la protección de rutas por rol es una guía de uso, no una medida de
  seguridad real (DD-19, DD-25). La sesión se coteja con `users` (mismo email y
  rol), lo que cierra solo la falsificación de un campo de `userData`.
- **Validación de entrada**: en el cliente, mediante funciones puras, antes de
  agregar cualquier registro. No representa integridad garantizada por un
  servidor.
- **Inserción en el DOM**: los datos escritos por usuarios se insertan como
  texto (`textContent`, creación de nodos). No se construye HTML con datos de
  usuario.
- **Origen de las solicitudes**: solo el mismo origen (`/api`); ninguna
  dirección de la API de producción llega al código del navegador.
- **Secretos**: no existen en el código; `API_PROXY_TARGET` es una variable de
  servidor y no se incluye en la compilación.
- **Datos**: todos ficticios.

## Variables de entorno

| Variable | Quién la lee | Valor por defecto | Uso |
|---|---|---|---|
| `VITE_API_BASE` | El código del navegador (`obtenerBaseApi`) | `/api` | Base relativa de la API |
| `API_PROXY_TARGET` | Solo el servidor de Vite (`vite.config.ts`) | `https://api.ismaelsuarez.me` | Destino del reenvío de `/api` en `npm run dev` y `npm run preview` |
| `API_UPSTREAM` | Solo nginx, al iniciar el contenedor (`despliegue/nginx/default.conf.template`) | `http://libreria_api:8000` | Destino del reenvío de `/api` en producción; alternativa pública `https://api.ismaelsuarez.me`. No llega al navegador |

Las dos primeras se documentan en `.env.example`; `API_UPSTREAM` es del contenedor y se fija con `ENV` en el `Dockerfile` o en la configuración de la App.

## Adaptación y accesibilidad

- Diseño fluido con Flexbox o Grid, comprobado a 320 px y a 1280 px.
- Las tablas se envuelven en un contenedor con desplazamiento horizontal propio.
- Foco visible en todos los controles; orden de tabulación coherente con el
  orden visual.
- Mensajes de estado con texto, ubicados cerca del formulario que los origina.
