# Flujos Principales

Cada flujo se documenta extremo a extremo. Los componentes son: **Página**
(HTML y script de página), **Lógica** (funciones puras), **Almacén** (acceso a
datos) y **localStorage**.

## Flujo 1: Carga inicial de datos

**Disparador**: se abre cualquier página.
**Actor**: operador.

**Pasos**:
1. El Almacén consulta si existen datos guardados.
2. Si no existen (primer inicio), guarda los ejemplos de libros y clientes y
   un historial de ventas vacío.
3. Si existen, los recupera tal como están, sin volver a agregar los ejemplos.
4. La Página genera sus listados y selectores a partir de los datos obtenidos.

```
Página → Almacén → localStorage
                 ← ¿hay datos?
          no: guardar ejemplos
          sí: recuperar
Página ← datos
```

**Casos de error**:
- Datos guardados ausentes en una clave y presentes en otra → ver PA-04 en
  `10_preguntas_abiertas.md`.
- Contenido guardado ilegible → ver PA-05.

## Flujo 2: Búsqueda en el catálogo

**Disparador**: el operador escribe en el buscador.
**Actor**: operador.

**Pasos**:
1. La Página toma el texto ingresado.
2. La Lógica recorta espacios de los extremos y compara sin distinguir
   mayúsculas, buscando coincidencias parciales en el título.
3. La Página vuelve a generar el listado con los libros resultantes.

**Casos de error**:
- Búsqueda vacía → se muestra el catálogo completo.
- Sin coincidencias → se muestra un mensaje claro en lugar del listado.

## Flujo 3: Alta de libro

**Disparador**: envío del formulario de libros.
**Actor**: operador.

**Pasos**:
1. La Página intercepta el envío con `preventDefault`.
2. La Página reúne título, ISBN, precio, editorial, género y autores.
3. La Lógica valida todos los campos contra los datos locales.
4. Si hay errores, la Página los muestra cerca del formulario y no agrega nada.
5. Si no hay errores, el Almacén agrega el libro con un identificador nuevo.
6. La Página actualiza el listado de libros sin recargar, limpia el formulario
   y muestra un mensaje de operación correcta.
7. El libro queda disponible para el catálogo y para la selección de ventas.

**Casos de error**:
- Título o ISBN vacío → rechazo con mensaje.
- ISBN existente (comparado sin espacios ni guiones) → rechazo con mensaje.
- Precio no numérico, cero o negativo → rechazo con mensaje.
- Editorial inexistente, ningún autor, autor o género inexistente → rechazo
  con mensaje.

## Flujo 4: Alta de cliente

**Disparador**: envío del formulario de clientes.
**Actor**: operador.

**Pasos**:
1. La Página intercepta el envío con `preventDefault`.
2. La Lógica valida nombre completo y email.
3. Si hay errores, la Página los muestra cerca del formulario.
4. Si no hay errores, el Almacén agrega el cliente.
5. La Página actualiza el listado sin recargar y muestra un mensaje de
   operación correcta.
6. El cliente queda disponible para la selección de ventas.

**Casos de error**:
- Nombre completo o email vacío → rechazo.
- Email con formato inválido → rechazo.
- Email existente, aunque difiera en mayúsculas o espacios exteriores → rechazo.

## Flujo 5: Composición y confirmación de una venta

**Disparador**: el operador abre la vista de Ventas.
**Actor**: operador.

**Pasos**:
1. La Página genera los selectores de cliente y de libro desde los datos.
2. El operador elige un cliente.
3. El operador elige un libro y una cantidad y agrega el renglón.
4. La Lógica valida la cantidad (entera y mayor que cero) y verifica si el
   libro ya está en la venta.
5. La Página muestra el renglón con libro, cantidad, precio unitario y
   subtotal, y recalcula el total.
6. El operador puede cambiar cantidades o quitar renglones; en cada cambio se
   recalculan subtotales y total.
7. El operador confirma.
8. La Lógica comprueba que haya cliente, al menos un renglón y cantidades válidas.
9. La Página envía a la API solo el cliente y, por renglón, el libro y la
   cantidad (`POST /ventas/`). El servidor copia el precio vigente, calcula
   subtotales y total y asigna identificador y fecha.
10. La Página limpia el formulario y muestra el comprobante con la venta que
    devolvió la API. Ante un rechazo conserva el borrador; si no hay respuesta,
    informa que no sabe si la venta se registró y pide revisar el Historial.

```
Operador → Página → Lógica (validar, calcular importe estimado)
                  → Repositorio → API (POST /ventas/)
         ← comprobante con los importes del servidor, formulario limpio
```

**Casos de error**:
- Sin cliente → no se confirma; mensaje.
- Sin renglones → no se confirma; mensaje.
- Cantidad cero, negativa o decimal → no se agrega ni se confirma; mensaje.
- Libro repetido → no se crea otro renglón; se actualiza la cantidad
  existente o se informa el duplicado.

## Flujo 6: Consulta del historial

**Disparador**: el operador abre la vista de Historial.
**Actor**: operador.

**Pasos**:
1. El repositorio lee todas las páginas de ventas de la API.
2. La Página lista identificador, fecha, cliente y total de cada venta.
3. El operador pide el detalle de una venta.
4. La Página muestra los renglones con libro, cantidad, precio unitario y
   subtotal, leídos de la propia venta. El precio unitario, los subtotales y el
   total son los registrados al confirmar; el título del libro y el cliente son
   los actuales; la API no entrega el ISBN.

**Casos de error**:
- Sin ventas → mensaje de lista vacía.

## Flujo 7: Comprobación del precio histórico (CM-6)

**Disparador**: comprobación guiada por el docente.
**Actor**: docente evaluador, sobre el backend local de Docker (nunca contra
producción, que no se puede restaurar).

**Pasos**:
1. Se confirma una venta y se anotan sus importes.
2. Se cambia únicamente el precio del libro con `PATCH /libros/{id}` en el
   backend local, sin tocar las ventas.
3. Se recarga el Historial.
4. Se consulta el detalle de la venta anterior.
5. El precio unitario, los subtotales y el total conservan los valores
   confirmados.

**Requisito derivado**: el README documenta cómo levantar el backend local para
poder reproducir el paso 2.

## Flujo 8: Navegación entre vistas

**Disparador**: el operador elige un enlace de la navegación.
**Actor**: operador.

**Pasos**:
1. El navegador carga la página de destino.
2. Se ejecuta el Flujo 1 en la nueva página.
3. La página lee los datos vigentes de la API.

**Consecuencia**: un registro creado en una página es visible en otra solo si
se guardó en la API (ver DD-01 y DD-26).
