# Proposal

## Why

El TPI de TypeScript pide que los datos de negocio provengan de la API de producción `https://api.ismaelsuarez.me`, que no se puede modificar ni redesplegar. El change `migracion-vite-typescript` dejó lista la frontera (repositorios asíncronos con la forma de la API, raíz de composición `proveedor.ts`, base `/api` con reenvío), pero hoy todos los repositorios siguen siendo locales. Este change hace la primera conexión real, solo de lectura: un cliente HTTP tipado sobre `/api` y el Catálogo leyendo los libros de la API, sin escribir nada en producción.

## What Changes

- Cliente HTTP de **solo lectura** (`GET`) sobre la base del mismo origen (`obtenerBaseApi(import.meta.env.VITE_API_BASE)`): arma la URL con parámetros de consulta, espera JSON, aplica un tiempo límite por solicitud y convierte toda falla en un `ErrorDeApi` con mensaje en texto (cuerpo `{"detail": "…"}`, cuerpo 422 `{"detail": [{type, loc, msg, …}]}`, respuesta que no es JSON, falla de red y tiempo agotado). No ofrece `POST`, `PUT`, `PATCH` ni `DELETE`.
- Paginación completa de listados: `limit=100` y `offset` creciente hasta recibir una página corta (la API no informa el total). Los importes quedan como texto (`Dinero`), sin conversión a número.
- Adaptadores HTTP de lectura: libros (listado con autores y detalle), editoriales y géneros. Como `GET /libros/` no trae autores, el listado completa cada libro con `GET /libros/{id}` con concurrencia acotada, de modo que la tarjeta conserva sus autores y el contrato `listar(): Promise<LibroDetalle[]>` no cambia.
- **Cambio visible**: el Catálogo pasa a mostrar los libros de la API de producción (hoy 5 libros: «Rayuela», «Ficciones»…), con estado de carga en texto mientras llegan los datos y mensaje de error en texto si la API no responde. El filtro por título sigue siendo local sobre la lista cargada.
- **Transición declarada (BREAKING de comportamiento entre vistas)**: las vistas de gestión (Libros, Clientes, Ventas, Historial) siguen sobre el almacén local hasta `operaciones-contra-api`, porque escriben y sus identificadores no coinciden con los de la API. Mientras tanto, un libro dado de alta en Libros no aparece en el Catálogo, y los datos del Catálogo (producción) difieren de los ejemplos locales. Los adaptadores HTTP de editoriales y géneros quedan construidos y probados, pero se conectan a las vistas en `operaciones-contra-api`, junto con el alta de libros.
- Interfaz de lectura de libros separada (`RepositorioLecturaLibros`, con `listar` y `obtener`), que `RepositorioLibros` extiende con `crear`; el Catálogo depende solo de la lectura.
- Documentación: README (casos manuales afectados, estado de la transición), `CLAUDE.md`/`AGENTS.md` (fila de datos del stack), `knowledge-base/08` y `09` (decisión nueva sobre la transición de orígenes) y estado de T-02 en `CHANGES.md`.

## Capabilities

### New Capabilities

Ninguna: el cliente HTTP se suma a `acceso-a-datos`, que ya fija la base `/api` y la frontera de repositorios.

### Modified Capabilities

- `acceso-a-datos`: se agregan el cliente HTTP de solo lectura, el formato de errores de la API como mensajes en texto, el tiempo límite, la paginación completa, el listado de libros con autores y los orígenes de datos durante la transición (Catálogo desde la API; gestión desde el almacén local).
- `catalogo`: «Listado generado desde los datos» pasa a referirse a los libros que entrega la API (relaciones anidadas, sin resolución por identificador); «Catálogo vacío» se reemplaza por «Catálogo sin libros» (mismo mensaje, origen API); se agregan el estado de carga y el error de carga.
- `datos-locales`: «Lectura centralizada en el Almacén» se reemplaza por «Almacén local para las vistas de gestión»: el Catálogo deja de leer el almacén local.
- `libros`: «Efecto del alta de libro» reemplaza el escenario «Libro nuevo en el Catálogo» por la visibilidad en las vistas de gestión durante la transición.
- `compilacion-y-pruebas`: la suite automatizada cubre también el cliente HTTP y los adaptadores con un `fetch` simulado, sin acceso a la red.

## Impact

- Código nuevo: `src/datos/api/cliente-http.ts`, `src/datos/api/errores-api.ts`, `src/datos/api/paginacion.ts`, `src/datos/api/repositorios-api.ts` (y su ayuda de concurrencia acotada) con sus pruebas en `tests/datos/api/`.
- Código modificado: `src/datos/repositorios.ts` (interfaz de lectura de libros), `src/datos/proveedor.ts` (exporta `repositorioCatalogo` sobre la API; el resto sigue local), `src/pages/client/catalogo/catalogo.ts` y `catalogo.html` (importa el repositorio de lectura y muestra el estado de carga). Ninguna vista de gestión cambia.
- Red: solo solicitudes `GET` a `/api/libros/`, `/api/libros/{id}` (y, en pruebas de humo manuales, `/api/editoriales/` y `/api/generos/`). Ninguna escritura en la API de producción.
- Dependencias: ninguna nueva.
- Casos manuales: CM-1 se reexpresa con los títulos de producción; la parte «aparece en el Catálogo» de CM-2 y la parte «el Catálogo muestra $ 9999,00» de CM-6 quedan registradas como pendientes hasta `operaciones-contra-api`.
- Fuera de alcance: escrituras contra la API, vistas de gestión sobre la API y listados sin endpoint (`operaciones-contra-api`), login y sesión (`registro-login-y-sesion`), guarda de rutas (`proteccion-de-rutas-y-roles`), contenedor con proxy (`despliegue-frontend`), filtro por género y búsqueda en el servidor.

## Preguntas abiertas

1. **Transición de orígenes (decisión del usuario)**: ¿se acepta que, entre este change y `operaciones-contra-api`, el Catálogo muestre los libros de producción mientras Libros, Ventas, Clientes e Historial siguen con los datos locales (un alta local no aparece en el Catálogo)? Recomendación: sí; la alternativa (construir y probar todo, pero dejar `proveedor.ts` local hasta `operaciones-contra-api`) evita la divergencia a costa de que el Catálogo no lea la API en esta entrega.
2. **Autores de la tarjeta (decisión del usuario solo si se elige otra opción)**: se propone completar cada libro con su detalle (una solicitud por libro, concurrencia 4), que conserva el comportamiento visible. Alternativas: cargar los autores solo al abrir la ficha, o quitar los autores de la tarjeta; ambas cambian la spec `catalogo`.
3. **Aviso visible de datos locales**: ¿hace falta un aviso en las vistas de gestión que diga que todavía trabajan con datos locales? Recomendación: no agregar interfaz nueva; documentarlo en el README y en los casos manuales.
