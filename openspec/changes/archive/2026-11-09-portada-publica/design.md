# Design

## Context

Ver `proposal.md` (Why). Estado actual que condiciona el enfoque:

- `index.html` de la raíz es solo una redirección al login: un script clásico en línea (`window.location.replace(...)`) más un `<noscript>` con `meta refresh`. Vite lo compila como entrada `index` (`vite.config.ts`, `rollupOptions.input`).
- En producción (T-06) nginx nunca entrega ese archivo: `location = /` y `location = /index.html` responden `302` a `/src/pages/auth/login/login.html`, porque la CSP (`default-src 'self'`, sin `'unsafe-inline'`) bloquearía el script en línea. La CSP también bloquea `<style>` y atributos `style=` en línea.
- La protección de rutas vive en `src/main.ts` (`interceptarCargaDePagina`), que cada vista importa primero. `zonaDeRuta` toma la zona de `src/pages/<zona>/<vista>/<archivo>`; `/` e `/index.html` dan `null` y `decidirAcceso(null, …)` falla cerrado (login sin sesión, destino del rol con sesión). La matriz completa de 12 celdas (`auth`/`client`/`admin`/`null` × sin sesión/`client`/`admin`) ya está fijada en `tests/logica/sesion.test.ts`.
- Importar `src/main.ts` arrastra `utils/auth.ts` → `datos/proveedor.ts`, que crea los repositorios de la API (sin hacer solicitudes) y el servicio de autenticación (que lee `localStorage` y siembra `users`).
- El login y el registro ya traen la identidad visual a reutilizar: encabezado `.encabezado` con `.encabezado__marca`, presentación `.contenido__introduccion` con la imagen `src/assets/estanteria.webp` (en `vista-inmersiva.css`), pie `.pie` con los integrantes, botones `.boton--primario` y `.boton--secundario`.
- `despliegue-frontend` (T-06) está desplegado pero sin archivar: la capacidad `despliegue` todavía no existe en `openspec/specs/`.

## Goals / Non-Goals

**Goals:**

- Una portada que no pueda, ni por accidente, cargar datos: sin JavaScript, por lo tanto sin `/api`, sin repositorios y sin lecturas de `localStorage`.
- Cero cambios en la protección de rutas y en las páginas protegidas.
- La misma entrada en `npm run dev`, `npm run preview`, el contenedor y bajo una subruta.

**Non-Goals:**

- Mostrar libros, portadas, novedades o cualquier dato de negocio en la portada (lo prohíbe la consigna).
- Adaptar la portada a la sesión (ver D3).
- Cambiar la navegación de las cinco vistas o el encabezado de las páginas protegidas.

## Decisions

### D1 — La portada es el propio `index.html` de la raíz

Se reescribe `index.html` como la portada (sin script). `/` la muestra sin redirección en los tres entornos: Vite ya entrega `index.html` en `/` y ya la tiene como entrada de la compilación, así que `vite.config.ts` no cambia; los enlaces son relativos (`src/pages/auth/login/login.html`, `src/pages/auth/registro/registro.html`) y las hojas de estilo usan rutas relativas que Vite resuelve con `base: "./"`, de modo que funciona bajo una subruta.

Alternativas descartadas:
- *`src/pages/publica/portada/portada.html` y la raíz redirige allí*: suma un salto (script en línea en `index.html`, que la CSP bloquea, más otro `302` en nginx), una zona nueva que `zonaDeRuta` y `decidirAcceso` tendrían que conocer (cambio en la guarda, alto riesgo) y una dirección menos limpia.
- *Dejar `index.html` redirigiendo y crear la portada aparte*: mismo costo sin ventaja.

Desvío asumido de la convención «una página por vista en `src/pages/<zona>/<vista>/`»: la portada no es una vista de la librería sino la entrada, que ya vivía en la raíz. No requiere aprobación del usuario (no cambia lo que se ve; solo dónde vive el archivo).

### D2 — Sin JavaScript y sin cambios en la guarda

La portada no tiene ningún `<script>` ni manejadores en línea, no importa `src/main.ts` y no lleva `hidden` en el `body` (las demás páginas nacen ocultas y las muestra el código; aquí no hay código que la muestre). Consecuencias:

- No existe grafo de módulos de la portada: no puede importar `datos/proveedor.ts` ni repositorios, ni hacer `fetch`, ni leer `localStorage`. Es la prueba más fuerte de cumplimiento y la más fácil de comprobar (un `grep` en el HTML fuente y en `dist/index.html`).
- `src/main.ts`, `src/logica/sesion.ts`, `src/types/acceso.ts`, `src/utils/**` y `src/datos/**` no cambian. Como no se toca la guarda, no hay commit de guarda: la matriz de 12 celdas de `decidirAcceso` y los casos `zonaDeRuta("/")` y `zonaDeRuta("/index.html")` → `null` ya existentes son la red de seguridad, y la verificación final comprueba con `git diff` que esos archivos quedaron intactos.
- Si en el futuro alguien agregara a la portada el punto de entrada común, la raíz sería zona desconocida y la guarda la mandaría al login (falla cerrado); la prueba estructural lo impide antes.

Alternativa descartada: *zona `publica` siempre permitida en `decidirAcceso`*: solo hace falta si la portada ejecuta código; abre una celda nueva en la decisión de acceso (alto riesgo, ítem 2) sin beneficio para una página estática.

### D3 — Con sesión, la portada se ve igual (requiere confirmación del usuario)

La portada no sabe si hay sesión. Con sesión, «Ingresar» y «Crear cuenta» llevan al login o al registro, y la protección existente («Sesión existente en las páginas de acceso») redirige de inmediato al destino del rol (Libros para `admin`, Catálogo para `client`), sin mostrar el formulario. El efecto práctico de «Ingresar» con sesión es entonces «ir a la librería».

Alternativas:
- *Mostrar «Ir a la librería» en lugar de los dos botones cuando hay sesión*: exige un módulo que lea la sesión (importa `datos/proveedor.ts`, es decir, repositorios y siembra de `users`) y una zona nueva permitida en la guarda (D2). Más código y más riesgo para un texto distinto en un botón. Si el usuario la prefiere, se suma como change aparte.
- *Redirigir al destino del rol desde la portada*: misma necesidad de leer la sesión, y oculta la portada a quien ya ingresó.

Por defecto se implementa la portada igual con o sin sesión; **se pide confirmación al usuario** porque el pedido no lo decide.

### D4 — Contenido y maquetado

Estructura (todas las clases existentes salvo las de `portada.css`):

```text
body (sin hidden)
├── header.encabezado        marca «✦ Librería El Faro» (sin navegación en el encabezado)
├── main.contenido
│   └── section.contenido__introduccion.portada__presentacion   (imagen de la estantería)
│       ├── p.contenido__ruta        «Bienvenida»
│       ├── h1                       «Libros con historia, a un paso»          (borrador)
│       ├── p.contenido__descripcion  texto de presentación                     (borrador)
│       ├── nav[aria-label="Acceso"] > ul
│       │   ├── a.boton.boton--primario    «Ingresar»      → src/pages/auth/login/login.html
│       │   └── a.boton.boton--secundario  «Crear cuenta»  → src/pages/auth/registro/registro.html
│       └── p (nota)  «Para ver el catálogo necesitás ingresar con tu cuenta.»
└── footer.pie               los mismos dos párrafos que el login
```

- La navegación (landmark obligatorio por «Regiones semánticas») es el par de accesos dentro del contenido principal; así no se repiten los dos enlaces en el encabezado.
- Texto de presentación (borrador, voseo como el resto de la interfaz): «Librería El Faro es una librería de barrio con libros de editoriales y autores seleccionados. Desde esta aplicación, quienes tienen cuenta consultan el catálogo, y el equipo de la librería registra libros y clientes, realiza ventas y revisa el historial.» Título de la pestaña: «Inicio · Librería El Faro». **El texto es un borrador que el usuario puede corregir** sin cambiar el diseño.
- Hojas: `base.css`, `disposicion.css`, `componentes.css`, `vista-inmersiva.css` (mismo orden que el login) y una nueva `src/styles/portada.css`, como las hojas propias de otras vistas (`ficha-libros.css`, `ticket-venta.css`). `portada.css` solo agrega: altura mayor de la presentación, grupo de accesos en `flex` con `flex-wrap` y separación, `a.boton` como `inline-flex` sin subrayado (si `componentes.css` no lo cubre para enlaces) y la lista sin viñetas. Sin estilos en línea (CSP).
- Accesibilidad: un solo `h1`; foco visible heredado de `base.css` (comprobar sobre el fondo oscuro; si no contrasta, ajustar el color del contorno solo en `.portada__presentacion`); texto claro sobre el degradado oscuro ya usado en el login; objetivos táctiles de al menos 44 px (`.boton` tiene `min-height: 3rem`); a 320 px los dos accesos se apilan a ancho completo.
- La marca del encabezado de la portada no es enlace (sería un enlace a la misma página).

### D5 — La marca del login y del registro enlaza a la portada (supuesto)

En `login.html` y `registro.html`, el texto «Librería El Faro» de `.encabezado__nombre` pasa a ser un enlace `href="../../../../index.html"` con una clase propia (por ejemplo `encabezado__enlace-marca`), heredando color y tipografía de la marca y con foco visible. Se usa `index.html` explícito y no `../../../../` para no depender de que el servidor resuelva el índice de una carpeta bajo una subruta.

**No debe usar la clase `navegacion__enlace`**: `ajustarNavegacion` (que corre en el login y el registro) quita todo enlace con esa clase cuya ruta la guarda rechaza, y para `/index.html` (zona `null`, sin sesión) la decisión es redirigir, así que el enlace desaparecería. La prueba estructural lo fija.

Es un supuesto razonable (sin él, quien sale de la portada no puede volver sin editar la dirección); el usuario puede descartarlo sin afectar el resto.

### D6 — Entrada del contenedor

En `despliegue/nginx/default.conf.template`:

- `location = /` deja de responder `302` y entrega la portada: `add_header Cache-Control "no-cache"`, `include /etc/nginx/cabeceras-seguridad.conf` (obligatorio: un `add_header` en un `location` anula los heredados del `server`) y `try_files /index.html =404`.
- Se elimina `location = /index.html`: cae en `location /`, que ya responde `200` con `no-cache` y las cabeceras de seguridad.
- Se actualiza el comentario del bloque (ya no es «entrada al login»). El resto de la configuración no cambia.

Alternativa descartada: *`try_files $uri $uri/ =404` en `location /` con `index index.html`*: cambia el comportamiento de todas las rutas de carpeta (hoy `/src/pages/auth/login` sin barra responde 404, comprobado en CM-25), más superficie para el mismo resultado.

`despliegue/comprobar.sh`: para `/` y `/index.html`, en lugar de `302` + `Location`, espera `200`, `text/html`, `Cache-Control: no-cache`, sin cabecera `Location`, cabeceras de seguridad, y que el cuerpo enlace a `src/pages/auth/login/login.html` y no contenga `<script`. Las comprobaciones del login y de `assets/` no cambian (siguen tomando el `main-<huella>.js` del HTML del login).

### D7 — Pruebas

- **Prueba estructural (Vitest, nueva, `tests/paginas/portada.test.ts`)**: lee `index.html`, `src/pages/auth/login/login.html` y `src/pages/auth/registro/registro.html` con `node:fs` (ruta resuelta desde `import.meta.url`) y comprueba con expresiones regulares (no hay DOM en el entorno `node` y no se agregan dependencias): sin `<script`, sin atributos `on…=`, sin `<style` ni `style=`, sin `/api`, sin `http://` ni `https://`; `body` sin `hidden`; exactamente un `<h1`; presencia de `<header`, `<nav`, `<main`, `<footer`; título con «Librería El Faro»; enlace «Ingresar» a `src/pages/auth/login/login.html` y «Crear cuenta» a `src/pages/auth/registro/registro.html`; en login y registro, un enlace a `../../../../index.html` que no lleva la clase `navegacion__enlace`. Se escribe primero y falla (RED) contra el `index.html` actual (tiene script, no tiene accesos).
- **Guarda**: no hay prueba nueva porque no hay código nuevo; la red es la suite existente de `tests/logica/sesion.test.ts` (antes y después) y `git diff --quiet main -- src/main.ts src/logica src/types src/utils src/datos` al final.
- **Compilación**: tras `npm run build`, `dist/index.html` no contiene `<script` ni `/api`, y sus hojas e imagen existen en `dist/assets/`.
- **Contenedor**: `docker build` y `sh despliegue/comprobar.sh` contra la imagen local con un backend local o con `API_UPSTREAM=https://api.ismaelsuarez.me` (solo `GET`).
- **Navegador (Chrome sin cabeza, contra el contenedor local)**: portada sin sesión y con sesión `admin` y `client` (registro de red: ninguna solicitud a `/api`; consola sin violaciones de CSP); «Ingresar» y «Crear cuenta» sin sesión y con sesión; marca del login y del registro → portada; 320 px y 1280 px sin desplazamiento horizontal; recorrido con Tab y foco visible; Catálogo por dirección sin sesión sigue yendo al login sin pedir `/api`. Los resultados se registran como casos manuales nuevos (CM-31 en adelante) con lo observado.

### D8 — Documentación y redespliegue

- README: tabla de navegación (la raíz es la portada), «Estructura de carpetas» (`index.html` = portada, `portada.css`), sección de despliegue (la raíz responde 200), casos manuales nuevos y nota en los casos que dicen «la raíz lleva al login» (CM-12, CM-13, CM-A6, CM-25, CM-28, CM-29) indicando que desde T-07 la raíz muestra la portada, sin reescribir lo observado entonces (regla dura 10).
- `CLAUDE.md` y `AGENTS.md` (copias idénticas): fila «Estructura» del stack, cantidad de casos manuales y fila T-07 del roadmap. `CHANGES.md`: entrada T-07 (`portada-publica`, depende de T-06). `knowledge-base/02` y `08` (entrada y nginx) y una decisión nueva en `09` (portada estática sin datos ni scripts).
- `despliegue/DESPLIEGUE.md`: prueba de humo con la raíz mostrando la portada y una nota de redespliegue: en el VPS de 2 GB, implementar `web` ya detuvo una vez el servicio `api` (probablemente por memoria durante la compilación); después de implementar `web`, comprobar que `api` está en verde y, si se detuvo, **reiniciarlo** (no Implementar).

## Risks / Trade-offs

- [El docente interpreta la portada pública como «una URL accesible sin sesión»] → la portada no tiene datos ni código y solo presenta y enlaza al acceso, igual que el login y el registro (también públicos); el README lo explica junto a la limitación de seguridad ya documentada.
- [Un `add_header` en `location = /` sin el `include` de seguridad dejaría la portada sin CSP] → el `include` es parte de D6 y `comprobar.sh` verifica las cabeceras de seguridad en `/` y en `/index.html`.
- [Los navegadores que guardaron el `302` anterior] → era `302` (no se fija en caché) y el HTML va con `no-cache`; no hace falta acción.
- [`a.boton` con estilos pensados para `button`] → `portada.css` ajusta solo lo necesario; se verifica a 320 px y 1280 px.
- [El enlace de la marca desaparece por `ajustarNavegacion`] → clase propia, fijada por la prueba estructural (D5).
- [Implementar `web` detiene `api` en el VPS] → paso explícito del humano para comprobar y reiniciar `api` (D8).
- [La delta de `despliegue` no se puede archivar mientras T-06 siga activo] → T-06 se archiva antes que este change; `openspec validate --strict` pasa igual y solo informa que el archivo lo rechazaría hoy.

## Migration Plan

1. Implementar y verificar en la rama `feat/portada-publica` (commits por unidad: portada; entrada del contenedor; documentación).
2. El humano integra el PR en `main` y, en Easypanel, pulsa **Implementar** en la App `web`; luego comprueba que `api` sigue en verde (si no, la reinicia) y corre `sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me`.
3. Vuelta atrás: `git revert` del commit en `main` e **Implementar**; vuelve la redirección de la raíz al login.
4. Antes de archivar este change, archivar `despliegue-frontend` (T-06).

## Open Questions

- ~~Texto definitivo del título y de la presentación (D4)~~ Resuelta el 2026-11-09: el usuario aprobó la propuesta tal como está.
  - La portada es el `index.html` de la raíz, sin ningún script (D1, D2).
  - El texto es el borrador de D4 sin cambios: título «Libros con historia, a un paso», el párrafo de presentación, los botones «Ingresar» y «Crear cuenta» y la nota «Para ver el catálogo necesitás ingresar con tu cuenta.».
  - Con sesión la portada se ve igual que sin ella, sin «Ir a la librería» (D3).
  - La marca del login y del registro enlaza a la portada (D5).
  - No se modifican `src/main.ts` ni `src/logica/sesion.ts`.
