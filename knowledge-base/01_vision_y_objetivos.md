# Visión y Objetivos

## Propósito del sistema

Frontend de una librería que presenta su catálogo y registra libros, clientes y
ventas, con datos y operaciones simulados en el navegador.

Es el Trabajo Práctico Integrador (TPI) de la unidad HTML, CSS y JavaScript de
Programación III (Tecnicatura Universitaria en Programación a Distancia, UTN),
planteado como repaso para el Parcial 1. Toma como contexto el TP backend de la
misma materia, pero desarrolla exclusivamente el frontend: no hay API, base de
datos, servidor ni inicio de sesión real.

**Fuente**: `docs/Repaso Primer Parcial.pdf` (consigna) y `discovery/discovery.md`.

**Integrantes**: Avalos Pablo, Blangetti Sofia, Suarez Ismael.

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| Operador de la librería | Registrar libros, clientes y ventas y consultar el catálogo y el historial | Encontrar libros por título; ver importes correctos; recibir mensajes claros ante errores |
| Docente evaluador | Comprobar el funcionamiento observado contra la consigna | Reproducir los casos manuales; leer un README que refleje el estado real |
| Equipo de desarrollo | Aprobar el TPI aplicando HTML semántico, CSS propio y JavaScript nativo | Practicar la metodología SDD con OpenSpec; mantener código legible y separado por responsabilidad |

## Objetivos de aprendizaje (consigna)

- Construir interfaces con HTML semántico y CSS propio para un sistema de librería.
- Relacionar formularios, listados y navegación con las entidades del proyecto.
- Aplicar JavaScript nativo para representar datos locales, modificar el DOM y
  responder a eventos.
- Validar entradas y comprobar el comportamiento mediante casos manuales
  reproducibles.

## Alcance v1.0 (TPI completo)

| # | Ejercicio | Puntos |
|---|---|---|
| 1 | Estructura y pantallas HTML | 20 |
| 2 | Presentación con CSS y uso adaptable | 20 |
| 3 | Datos locales, catálogo y filtro | 15 |
| 4 | Alta de libros y clientes | 15 |
| 5 | Venta simulada e historial | 20 |
| 6 | Persistencia, verificación y documentación | 10 |
| | **Total** | **100** |

- Cinco vistas navegables: Catálogo, Libros, Clientes, Ventas e Historial.
- Catálogo generado por JavaScript con filtro por título.
- Alta de libros y de clientes con validación.
- Venta simulada con renglones, subtotales y total.
- Historial de ventas con detalle e importes históricos.
- Persistencia de libros, clientes y ventas en la API de producción (desde `operaciones-contra-api`; antes, en `localStorage`).
- README con instrucciones, límites y resultados de los casos manuales.

### Etapas de trabajo

- **Etapa 1 (semana de repaso)**: pantallas del ejercicio 1 con la presentación
  del ejercicio 2, usando datos estáticos de ejemplo y una interacción básica
  (filtro por título o una validación). Los controles pendientes se identifican
  como maqueta; no se presentan como operaciones completas.
- **Etapa 2 (TPI completo)**: se conectan las pantallas con datos locales y se
  completan los ejercicios 3 a 6.

## Fuera de alcance

- Editar o eliminar libros, clientes o ventas.
- Altas, bajas y modificaciones de editoriales, géneros o autores.
- Gestión de stock, cobros y facturación fiscal.
- API, base de datos, servidor, conexión con el backend y uso de `fetch`.
- Inicio de sesión real y cualquier noción de seguridad o integridad
  garantizada por servidor.
- Pantalla para editar precios.
- Validación del dígito de control del ISBN.
- Librerías, frameworks y CDNs de CSS o JavaScript.

## Métricas de éxito

- Los 100 puntos de la rúbrica están cubiertos por funcionalidad observable.
- Los ocho casos manuales de la consigna se ejecutaron y su resultado real
  está registrado en el README.
- El proyecto se abre desde `index.html` sin npm ni servidor.
- La interfaz es usable a 320 px y a 1280 px, sin desplazamiento horizontal de
  la página, con foco visible y recorrido por teclado.
- No hay dependencias externas en la entrega.
