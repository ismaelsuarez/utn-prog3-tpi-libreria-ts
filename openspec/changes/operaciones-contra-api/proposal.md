# Proposal

## Why

El TPI de TypeScript pide que los datos de negocio provengan de la API de producción `https://api.ismaelsuarez.me`, que no se puede modificar ni restaurar. Desde `cliente-http-y-catalogo` el Catálogo ya la lee, pero Libros, Clientes, Ventas e Historial siguen sobre `localStorage`: un alta no aparece en el Catálogo y la venta no usa los precios ni los totales del servidor. Este change completa la conexión con las primeras escrituras reales, y por eso también fija cómo se evita escribir en producción mientras se desarrolla y se verifica.

## What Changes

- **Escrituras contra la API**: el cliente HTTP, hoy solo `GET` por diseño, suma un envío JSON para `POST` (y `PATCH` solo si se aprueba conservar la edición de clientes, ver Preguntas abiertas). Altas: `POST /libros/` (con `stock` y autores con rol y orden), `POST /clientes/` seguido de `POST /clientes/{id}/perfil` (teléfono y dirección) y `POST /ventas/` (el servidor copia el precio vigente y calcula subtotales y total). Sin reintentos automáticos de escrituras.
- **Lecturas de gestión desde la API**: Libros, Clientes, Ventas e Historial leen libros, editoriales, géneros, autores, clientes y ventas de la API mediante los repositorios. Como la API no ofrece `GET /clientes/` ni `GET /autores/`, esos listados se arman sondeando `GET /clientes/{id}` y `GET /autores/{id}` por identificador, completados con los identificadores conocidos por las ventas y por el detalle de los libros.
- **Formularios**: Libros agrega `stock` y un rol de autoría por autor elegido; Clientes agrega la dirección al perfil (el teléfono ya existe). El perfil se crea una sola vez: si el cliente ya lo tiene, teléfono y dirección se muestran sin edición; si no lo tiene, se ofrece completarlo una única vez.
- **Errores y envío único**: los rechazos 409 y 422 se muestran como texto (junto al campo cuando la API lo identifica); un tiempo agotado o una falla de red en una escritura se informan como resultado desconocido; cada formulario impide un segundo envío mientras el primero está en curso.
- **Protección de producción en desarrollo (BREAKING para quien desarrolla)**: `npm run dev` y `npm run preview` siguen reenviando `/api`, pero rechazan en el propio servidor de desarrollo toda escritura cuyo destino sea la API de producción. Las escrituras se prueban con un backend local construido desde el código desplegado (`despliegue/` del repositorio del backend) sobre PostgreSQL en Docker, apuntado con `API_PROXY_TARGET`. La suite automatizada sigue sin red.
- **Retiro de los datos de negocio de `localStorage` (BREAKING)**: se dejan de leer y escribir `libreria.libros`, `libreria.clientes` y `libreria.ventas` (las claves existentes no se borran ni se migran); se eliminan el adaptador local de negocio y sus datos iniciales. Usuarios y sesión (`users`, `userData`) siguen en el navegador.
- **Historial**: lee `GET /ventas/` con paginación completa. El precio unitario, los subtotales y el total son los históricos que guarda el servidor; el título del libro y el nombre del cliente son los que la API devuelve al consultar, y el ISBN deja de mostrarse porque la API no lo entrega.
- **Stock**: se captura en el alta (la API lo exige); la venta no lo valida ni lo descuenta (regla dura 9, RN-VE-16).
- Documentación: README (origen de datos, backend local, casos manuales nuevos), `knowledge-base/` (04, 05, 08, 09, 10), `CHANGES.md`, y `CLAUDE.md`/`AGENTS.md` (fila de datos del stack, reglas 4 y 7).

## Capabilities

### New Capabilities

Ninguna: las escrituras y los listados por sondeo se suman a `acceso-a-datos`.

### Modified Capabilities

- `acceso-a-datos`: métodos permitidos (`GET` y `POST`), escrituras con resultado del servidor, resultado desconocido sin reintentos, listados de clientes y autores por sondeo, reenvío de desarrollo que bloquea escrituras a producción, y todas las vistas de gestión sobre la API (se retira la transición de orígenes).
- `libros`: campo `stock`, rol de autoría por autor, validación contra los datos de la API (incluidos los límites que la API no valida y harían fallar el servidor), errores del servidor y alta visible en el Catálogo.
- `clientes`: teléfono y dirección del perfil, listado desde la API, alta en dos escrituras con perfil de una sola vez y su falla parcial, y el destino de la edición existente.
- `ventas`: clientes y libros desde la API, borrador con importe estimado, confirmación con importes del servidor, resultado desconocido y venta sin control de stock.
- `historial`: ventas desde la API y qué datos del detalle son históricos.
- `datos-locales`: se retiran los requisitos de persistencia de negocio en `localStorage`, identificadores locales y datos iniciales; se conserva la normalización compartida y se declara que las claves anteriores quedan sin uso.
- `formularios-y-mensajes`: envío único mientras una operación está en curso.
- `compilacion-y-pruebas`: la suite cubre las escrituras y la guarda de desarrollo sin red, y deja de cubrir el almacén local de negocio.

## Impact

- Código: `src/datos/api/**` (envío JSON, adaptadores de escritura, sondeo), `src/datos/repositorios.ts` (se retiran las operaciones «sin endpoint» que no se implementan), `src/datos/proveedor.ts` (todos los repositorios sobre la API), `src/logica/{libros,clientes,ventas}.ts`, `src/pages/admin/**`, `src/types/**`, `vite.config.ts`; se eliminan `src/datos/local/{repositorios-locales,datos-iniciales,tipos-locales}.ts` y la parte de negocio de `almacen-local.ts`, con sus pruebas.
- Red: `GET` y `POST` (y `PATCH` si se aprueba) a `/api`; el servidor de desarrollo nunca reenvía escrituras a producción. La aplicación desplegada (T-06) sí escribirá en producción cuando la opere el bibliotecario.
- Dependencias de ejecución: ninguna. Para verificar a mano: Docker (backend local y PostgreSQL), fuera de la entrega.
- Casos manuales: CM-2 a CM-6 se reescriben contra el backend local; el precio histórico (CM-6) se comprueba cambiando el precio con `PATCH` en el backend local, ya no editando `localStorage`.
- Gobernanza ALTO: no se escribe código hasta aprobar este plan.
- Fuera de alcance: modificar o redesplegar el backend, alta o edición de autores, editoriales y géneros, edición o borrado de libros y ventas, gestión de stock, contenedor y proxy de producción (`despliegue-frontend`), completar en producción los mínimos de la consigna.

## Preguntas abiertas

Requieren aprobación explícita (el diseño adopta la recomendación y se ajusta si se elige otra):

1. **Protección de producción** (D9): guarda en el reenvío de desarrollo + backend local en Docker para toda verificación con escrituras. Alternativa: cambiar el destino por defecto a un backend local (el Catálogo dejaría de funcionar en desarrollo sin Docker).
2. **Listado de clientes y autores por sondeo** (D5): heurística acotada; puede omitir registros si hay más de 10 identificadores seguidos sin registro. Alternativas: solo clientes con ventas (pierde clientes nuevos) o un índice local de identificadores creados (vuelve a guardar datos de negocio en el navegador).
3. **Edición de clientes existente** (D7): la vista Clientes tiene hoy un diálogo de edición fuera de las specs, que contradice la regla dura 9 y RN-CL-05. Recomendación: retirarlo (con la API, `PATCH` modificaría registros de producción que usa la evidencia del backend). Alternativa: conservarlo con `PATCH` para nombre y email, y teléfono y dirección de solo lectura.
4. **Perfil de una sola vez y su recuperación** (D6): ofrecer «Completar perfil» solo a clientes sin perfil. Supuesto: la dirección es opcional (la API la admite vacía); el teléfono sigue obligatorio como hoy.
5. **Retiro de `localStorage`** (D11): no borrar ni migrar las claves `libreria.*`; eliminar el adaptador local de negocio.
6. **Mínimos de la consigna** (D12): producción tiene 5 libros (la consigna pide 6). Queda como decisión del equipo; este change no escribe en producción para completarlo.
