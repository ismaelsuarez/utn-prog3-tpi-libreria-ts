# compilacion-y-pruebas Specification

## Purpose
Define cómo se instala, ejecuta, compila y prueba el frontend TypeScript de la librería, y las garantías de tipado y de salida de compilación que el TPI evalúa.

## Requirements

### Requirement: Comandos del proyecto

El proyecto SHALL instalarse con `npm install` y SHALL ofrecer los comandos `npm run dev` (servidor de desarrollo), `npm run build` (comprobación de tipos y compilación de producción), `npm run preview` (servir la compilación) y `npm test` (pruebas automatizadas), sin pasos manuales adicionales.

#### Scenario: Instalación y desarrollo desde un clon limpio

- **WHEN** se clona el repositorio, se ejecuta `npm install` y luego `npm run dev`
- **THEN** el servidor de desarrollo arranca y la dirección que informa muestra la aplicación

#### Scenario: Pruebas desde la línea de comandos

- **WHEN** se ejecuta `npm test`
- **THEN** corre toda la suite automatizada una sola vez y termina con código de salida 0 si todas las pruebas pasan, o distinto de 0 si alguna falla

### Requirement: Comprobación de tipos estricta en la compilación

`npm run build` SHALL comprobar los tipos de todo el código fuente y de las pruebas en modo estricto, sin variables ni parámetros sin usar, y SHALL fallar sin producir la compilación si hay cualquier error de tipos.

#### Scenario: Código con error de tipos

- **WHEN** un archivo de `src/` asigna un valor incompatible con su tipo declarado
- **THEN** `npm run build` termina con código distinto de 0 y no genera la carpeta de salida

#### Scenario: Código correcto

- **WHEN** el código no tiene errores de tipos
- **THEN** `npm run build` termina con código 0 y genera la compilación de producción

### Requirement: Tipos específicos sin `any`

Las formas de datos del dominio, de la API y de la sesión SHALL declararse como interfaces o tipos con nombre en `src/types/`, y ningún archivo de `src/` ni de las pruebas SHALL usar el tipo `any` de forma explícita.

#### Scenario: Búsqueda de `any` explícito

- **WHEN** se buscan anotaciones `: any`, aserciones `as any` y argumentos de tipo `<any>` en `src/` y en las pruebas
- **THEN** no se encuentra ninguna

#### Scenario: Datos tipados en las vistas

- **WHEN** una vista recibe libros, clientes, ventas, editoriales, géneros o autores
- **THEN** los recibe con un tipo con nombre declarado en `src/types/`

### Requirement: Compilación multipágina servible desde cualquier subruta

La compilación de producción SHALL incluir la página de entrada y cada vista como página propia, y SHALL referenciar sus recursos con rutas relativas, de modo que funcione servida desde la raíz o desde una subruta de un servidor.

#### Scenario: Páginas incluidas en la compilación

- **WHEN** se ejecuta `npm run build`
- **THEN** la salida contiene el `index.html` de entrada y una página HTML por cada vista, cada una con sus scripts y estilos

#### Scenario: Servida desde una subruta

- **WHEN** la salida compilada se sirve bajo una subruta (por ejemplo `/libreria/`) y se abre cualquier vista
- **THEN** la vista carga sus scripts, estilos e imágenes sin respuestas 404 ni errores en la consola

### Requirement: Suite automatizada de lógica y almacén

La suite automatizada SHALL cubrir la lógica pura (normalización, filtro, validaciones, cálculos de venta) y los almacenes locales de usuarios y sesión, conservando cada caso aplicable de la suite anterior con el mismo resultado esperado, y SHALL ejecutarse sin navegador.

#### Scenario: Casos heredados conservados

- **WHEN** se compara la suite nueva con la anterior
- **THEN** cada caso anterior aplicable tiene un caso equivalente con el mismo resultado esperado, y los casos que dejan de aplicar (los del almacén local de negocio retirado) están identificados con su motivo

#### Scenario: Sin dependencia del almacenamiento del entorno

- **WHEN** la suite se ejecuta en una máquina cuyo entorno ofrece o no un `localStorage` global
- **THEN** las pruebas de los almacenes locales usan un almacenamiento simulado propio y producen el mismo resultado

### Requirement: Pruebas del acceso a la API sin red

La suite automatizada SHALL cubrir el cliente HTTP, los repositorios sobre la API (lecturas, altas y sondeos) y la regla del reenvío de desarrollo con una función de solicitud simulada e inyectada, y SHALL ejecutarse sin realizar ninguna solicitud de red real.

#### Scenario: Suite sin conexión

- **WHEN** se ejecuta `npm test` en una máquina sin conexión a Internet
- **THEN** las pruebas del cliente HTTP y de los repositorios sobre la API pasan con el mismo resultado que con conexión

#### Scenario: Casos de error cubiertos

- **WHEN** se revisan las pruebas del cliente HTTP
- **THEN** cubren respuesta correcta, error con `detail` de texto, error 422 con lista de detalles, respuesta que no es JSON, falla de red y tiempo agotado, tanto en lecturas como en altas

#### Scenario: Altas sin reintentos

- **WHEN** se revisan las pruebas de las altas
- **THEN** comprueban el método, la dirección y el cuerpo JSON de cada alta, el rechazo 409 y que una falta de respuesta produce una sola solicitud

#### Scenario: Red real no disponible para las pruebas

- **WHEN** una prueba invoca el `fetch` global sin inyectar una función de solicitud
- **THEN** la prueba falla en lugar de llegar a la red
