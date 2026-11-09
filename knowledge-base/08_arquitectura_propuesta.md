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
| Raíz de composición | `src/datos/proveedor.ts` | Único lugar donde se eligen las implementaciones; siembra el almacén local una sola vez |
| Adaptador | `src/datos/local/` | Implementa los repositorios sobre `localStorage` traduciendo entre la forma local y la de la API |
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
│   │   ├── api/cliente-http.ts # crearClienteHttp: solo `obtener` (GET), tiempo límite de 10 s, fetch inyectable
│   │   ├── api/errores-api.ts  # ErrorDeApi (http, red, tiempo, formato) e interpretarCuerpoDeError
│   │   ├── api/paginacion.ts   # recorrerPaginas (limit 100) y mapearConLimite (concurrencia acotada)
│   │   ├── api/repositorios-api.ts # crearRepositoriosApi: libros (con autores), editoriales y géneros, solo lectura
│   │   └── local/              # Adaptador local: almacen-local.ts (único que nombra localStorage),
│   │                           # datos-iniciales.ts, repositorios-locales.ts, tipos-locales.ts;
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
  Es el punto donde el change `proteccion-de-rutas-y-roles` intercepta la carga
  de cada página, también al recargar.
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
- Operaciones **sin endpoint** en la API (listado de clientes y de autores,
  edición del teléfono) están marcadas en las interfaces; las resuelve el change
  `operaciones-contra-api`.
- Durante la transición conviven dos orígenes (`cliente-http-y-catalogo`): el
  Catálogo usa `repositorioCatalogo` (`RepositorioLecturaLibros`, solo lectura),
  que `proveedor.ts` crea sobre la API por la base `/api`; Libros, Clientes,
  Ventas e Historial siguen en el adaptador local sobre `localStorage` (claves
  `libreria.libros`, `libreria.clientes`, `libreria.ventas`, mismo formato que
  antes) hasta `operaciones-contra-api`. Un alta local no aparece en el Catálogo.
- **Cliente HTTP** (`src/datos/api/`): solo `GET` con `Accept: application/json`
  y rutas con barra final (`/libros/`) para evitar la redirección 307 a otro
  origen. Toda falla se rechaza como `ErrorDeApi` (subclase de
  `ErrorDeRepositorio`, con `tipo` `http`, `red`, `tiempo` o `formato` y `estado`)
  con mensaje en texto: el `detail` de la API, la lista de validación del 422
  unida con «; » y un `ErrorDeCampo` por elemento, o un texto fijo. Los listados
  completos recorren páginas de 100 hasta una página corta (tope de 100 páginas);
  el listado de libros se completa con `GET /libros/{id}` para traer los autores,
  con a lo sumo 4 consultas a la vez. Los importes quedan como texto.
- **Usuarios y sesión** (`registro-login-y-sesion`): nunca van a la API. Los
  atiende `src/datos/local/almacen-usuarios.ts`, separado del almacén local
  porque es permanente, con el mismo almacenamiento inyectado y las claves
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

## Estrategia de verificación

| Nivel | Qué cubre | Herramienta |
|---|---|---|
| Tipos | Todo `src/` y `tests/` en modo estricto, sin `any`; los fixtures de la API se declaran con `satisfies` | `npx tsc` (parte de `npm run build`) |
| Pruebas automatizadas | Funciones puras, almacén local con almacenamiento simulado inyectado y adaptador de repositorios | Vitest (`npm test`) |
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
  seguridad real (DD-19).
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

Se documentan en `.env.example`.

## Adaptación y accesibilidad

- Diseño fluido con Flexbox o Grid, comprobado a 320 px y a 1280 px.
- Las tablas se envuelven en un contenedor con desplazamiento horizontal propio.
- Foco visible en todos los controles; orden de tabulación coherente con el
  orden visual.
- Mensajes de estado con texto, ubicados cerca del formulario que los origina.
