# Despliegue del frontend en Easypanel

Pasos para publicar la aplicación en **https://libreria.ismaelsuarez.me**, en el mismo
VPS (Hostinger + Easypanel) donde corre la API. **Los ejecuta una persona, a mano, en
Easypanel y en el DNS**: ni este repositorio ni ningún agente accede al VPS. No hay
secretos que cargar: la imagen no los lleva y el entorno queda vacío.

Qué se publica: una imagen (`Dockerfile` de la raíz) que compila la aplicación y la
sirve con nginx en el puerto interno **8080**, y que reenvía `/api/…` a la API por la
red interna de Easypanel (`http://libreria_api:8000`). Detalle y verificación local:
sección «Despliegue» del `README.md`.

## Antes de empezar

1. Integrar los PR #1 a #6 **en orden** en la rama **`main`** del repositorio
   `https://github.com/ismaelsuarez/utn-prog3-tpi-libreria-ts`. Easypanel despliega
   desde `main`.
2. Tener a mano el proyecto **`libreria`** de Easypanel (el de la API). El frontend
   **debe crearse en ese mismo proyecto**: es lo que hace que `libreria_api` sea
   alcanzable por la red interna.

## 1. DNS

Crear un registro `A` `libreria` en `ismaelsuarez.me` que apunte a **la misma IP
pública que `api.ismaelsuarez.me`** (no hace falta si ya existe un comodín). Esperar a
que responda antes de seguir: Let's Encrypt valida el dominio al activar HTTPS.

```sh
dig +short api.ismaelsuarez.me        # la IP del VPS
dig +short libreria.ismaelsuarez.me   # debe devolver esa misma IP
```

## 2. Crear la App `web`

En el proyecto **`libreria`**, **Servicio → App**, nombre **`web`**.

1. **Fuente → Git**: repositorio `https://github.com/ismaelsuarez/utn-prog3-tpi-libreria-ts.git`,
   rama **`main`**, ruta de compilación `/`.
2. **Compilación → Dockerfile** (archivo `Dockerfile`). **Auto Deploy apagado**.
3. **Entorno**: vacío. El destino de `/api` es `http://libreria_api:8000` por defecto.
4. **Dominios**: `libreria.ismaelsuarez.me`, ruta `/`, destino **HTTP**, puerto
   **8080**. Activar **HTTPS con Let's Encrypt**.
5. Pulsar **Implementar**. Esperar el estado **`healthy`** (la imagen declara una
   comprobación sobre `/healthz`) y revisar en **Registros** que nginx arrancó sin
   errores.

## 3. Comprobar el nombre interno de la API

El nombre `libreria_api` está **inferido** del patrón `<proyecto>_<servicio>` (la base
de datos es `libreria_db:5432`; el servicio de la API es `libreria_api.1.<id>` en
Swarm). Comprobarlo desde el propio frontend: en Easypanel, App `web`, **Consola → Sh**:

```sh
wget -qO- http://libreria_api:8000/health/ready
```

Debe imprimir `{"estado":"ok","base":"disponible"}`.

- Si **no resuelve** (`bad address`): el nombre es otro. En Easypanel, abrir la App de
  la API y ver el nombre de su servicio (proyecto + `_` + nombre de la App); ponerlo
  en **Entorno** de `web` como `API_UPSTREAM=http://<nombre>:8000` e **Implementar**.
  Mientras tanto la aplicación se ve, pero toda pantalla que lee la API muestra un
  error y `/api/health/ready` del sitio responde `502`.
- Si **resuelve** pero no responde: revisar que la API esté `healthy` y que el puerto
  sea 8000.

### Cambiar al destino alternativo (API pública) y volver

Si la red interna no funciona, usar el dominio público de la API (un salto por el
proxy del propio VPS; funciona en cualquier red). **No hay que reconstruir nada.**

1. **Entorno** de `web`: `API_UPSTREAM=https://api.ismaelsuarez.me` → **Implementar**.
2. Repetir la prueba de humo (paso 4).

Para volver a la red interna: quitar esa variable de **Entorno** → **Implementar**.

## 4. Prueba de humo (solo lectura)

Desde cualquier máquina con `curl` y este repositorio (solo envía `GET` y `HEAD`):

```sh
sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me
```

Debe terminar con `N de N casos correctos`. Si fallan los casos de `/api`, ver el paso 3.

Y en el navegador, en `https://libreria.ismaelsuarez.me`:

1. La raíz lleva al formulario de ingreso (`/src/pages/auth/login/login.html`).
2. Ingresar con el administrador de demostración del `README.md` (sección «Usuarios de
   demostración y seguridad»).
3. Libros y Catálogo muestran los libros de producción.
4. La consola del navegador no informa violaciones de la política de seguridad de
   contenido.

## 5. Escritura real: registrar el sexto libro

Es la **única escritura contra producción** de esta prueba, y queda **permanente**: la
API no permite editar ni borrar. Producción tiene 5 libros y la consigna pide al menos 6
(pregunta abierta PA-15); el bibliotecario registra el sexto desde la aplicación
publicada.

1. Ingresar como administrador y abrir **Libros**. Anotar los títulos y los ISBN del
   listado (hay 5).
2. Completar el formulario con un libro **real y propio**: título, **ISBN que no esté
   en el listado**, precio mayor que 0, stock (entero, 0 o más), editorial, género y
   **al menos un autor** (con su rol).
3. Pulsar «Registrar libro» **una sola vez** y esperar la respuesta.
4. Comprobar:
   - Aparece «Libro registrado correctamente.» y el listado de Libros tiene 6 libros,
     con el nuevo (recargar la página para confirmar).
   - **Catálogo** muestra el libro nuevo.
   - Si aparece un mensaje de resultado incierto o de error de red: **no reintentar**.
     Recargar **Libros** y mirar si el libro figura; solo si no figura, volver a
     intentarlo.
5. Registrar el resultado (fecha, si apareció a la primera y el estado del listado) en
   el `README.md`.

## Redesplegar y volver atrás

- **Redesplegar**: llevar los cambios a `main` y pulsar **Implementar** en la App `web`.
- **Volver atrás**: `git revert` del commit problemático en `main` y **Implementar**
  (camino seguro y documentado). Si Easypanel ofrece volver a una implementación
  anterior en su historial sirve también, pero no está comprobado aquí.
- **Quitar el frontend**: detener o eliminar la App `web`. La API no se toca, así que
  no afecta a ningún otro servicio.
- Las etiquetas de las imágenes base (`node`, `nginx-unprivileged`) están fijadas en el
  `Dockerfile`: no reciben parches solas; actualizarlas es un cambio explícito.
