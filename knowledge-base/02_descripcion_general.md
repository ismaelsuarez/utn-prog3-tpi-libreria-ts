# Descripción General

## Stack tecnológico

| Capa | Tecnologías | Observaciones |
|---|---|---|
| Estructura | HTML5 semántico | Varias páginas, una por vista; `index.html` es la entrada |
| Presentación | CSS propio en archivos externos | Flexbox o Grid; sin frameworks ni CDNs; tipografías e imágenes locales |
| Comportamiento | JavaScript nativo (scripts clásicos) | Sin librerías; sin `type="module"` (ver DD-03 en `09`) |
| Persistencia | API de producción por `/api`; `localStorage` solo para usuarios y sesión | Libros, editoriales, géneros, autores, clientes y ventas viven en la API |
| Verificación de desarrollo | `node --test` (runner integrado de Node) | Solo durante el desarrollo; se excluye de la entrega |
| Verificación de entrega | Casos manuales en el navegador | Ocho casos registrados en el README |

No se utiliza npm, empaquetador, transpilador ni herramienta de compilación.

## Arquitectura general

Aplicación estática de varias páginas que se abre directamente desde el
sistema de archivos (`file://`). Cada página carga los mismos scripts de datos
y de lógica, y su propio script de página.

```
┌───────────────────────── Navegador (file://) ─────────────────────────┐
│                                                                       │
│  index.html   libros.html   clientes.html   ventas.html   historial.html
│      │             │              │              │              │     │
│      └─────────────┴──────┬───────┴──────────────┴──────────────┘     │
│                           ▼                                           │
│                 Scripts de página (DOM y eventos)                     │
│                           │                                           │
│                           ▼                                           │
│                 Lógica pura (validaciones, filtro, cálculos)          │
│                           │                                           │
│                           ▼                                           │
│                 Repositorios ──► API (/api)                           │
│                           ▲                                           │
│                 (sin datos iniciales en el código)                    │
└───────────────────────────────────────────────────────────────────────┘
```

Decisiones de alto nivel:

- **Sin memoria compartida entre páginas.** Cada navegación recarga el
  documento. El único estado que sobrevive entre vistas es el que guarda la API
  (y, para usuarios y sesión, `localStorage`).
- **Lógica pura separada del DOM.** Las validaciones, el filtro y los cálculos
  de venta son funciones sin efectos sobre el documento, de modo que se pueden
  probar con `node --test` y reutilizar entre páginas.
- **Datos como fuente única.** El catálogo, los listados y las opciones de los
  selectores se generan desde los datos locales, nunca se escriben a mano en el
  HTML final.

## Integraciones externas

Solo la API de producción `https://api.ismaelsuarez.me`, por la base `/api` del mismo origen. No hay servicios de terceros, CDNs ni recursos remotos.

| Servicio | Propósito | Tipo |
|---|---|---|
| API de producción | Libros, editoriales, géneros, autores, clientes y ventas | HTTP, solo `GET` y `POST` |
| `localStorage` | Usuarios y sesión | API del navegador |

## API REST

No aplica. El proyecto no expone ni consume endpoints.

## Vistas

| Vista | Contenido |
|---|---|
| Catálogo | Título de la librería, buscador por título y listado de libros (título, ISBN, editorial, género, autores, precio) |
| Libros | Formulario de alta y listado de libros registrados |
| Clientes | Formulario de alta y listado de clientes registrados |
| Ventas | Selección de cliente, composición de renglones y resumen de la venta |
| Historial | Listado de ventas y acceso a sus detalles |

## Límites declarados

- Los datos son ficticios.
- Las validaciones del cliente y el registro de usuarios y sesión en el navegador
  sirven para la práctica; no representan seguridad (la API de producción no
  exige autenticación).
- Usuarios y sesión dependen del navegador y del perfil y no se comparten entre
  usuarios; los datos de negocio no se guardan en el navegador.
- La venta calcula un total simulado: no gestiona stock, cobros ni
  facturación fiscal.
