# Spec Delta

## ADDED Requirements

### Requirement: Claves de negocio anteriores sin uso

La aplicación no SHALL leer, escribir, migrar ni borrar las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` que haya dejado en el navegador una versión anterior. Las únicas claves del navegador que usa SHALL ser `users` y `userData`.

#### Scenario: Navegador con datos de la versión anterior

- **WHEN** un navegador tiene guardadas `libreria.libros`, `libreria.clientes` y `libreria.ventas` y el operador usa todas las vistas
- **THEN** esas claves conservan su contenido sin cambios y ninguna vista muestra sus registros

#### Scenario: Navegador sin datos anteriores

- **WHEN** el operador usa la aplicación en un navegador sin claves `libreria.*`
- **THEN** la aplicación no crea ninguna clave `libreria.*`

## REMOVED Requirements

### Requirement: Identificadores estables

**Reason**: Los identificadores los asigna la API (enteros); ya no hay registros de negocio con identificador local.
**Migration**: Ninguna en el navegador. Los identificadores de la API se usan tal como llegan (`acceso-a-datos`).

### Requirement: Datos iniciales de ejemplo

**Reason**: Los datos de negocio son los de la API de producción; la aplicación ya no siembra libros ni clientes.
**Migration**: Los mínimos de la consigna (6 libros, 3 clientes…) quedan como pregunta abierta del equipo sobre los datos de producción (`knowledge-base/10_preguntas_abiertas.md`). Para pruebas manuales se usa la siembra del backend local.

### Requirement: Persistencia de libros y clientes en el navegador

**Reason**: Libros y clientes se registran en la API.
**Migration**: Ver «Claves de negocio anteriores sin uso»: las claves existentes no se leen ni se borran.

### Requirement: Lectura que prioriza lo guardado con carga provisoria de ejemplos

**Reason**: No hay lectura ni siembra de datos de negocio en el navegador.
**Migration**: Las vistas leen de la API (`acceso-a-datos`, «Datos de negocio desde la API»).

### Requirement: Registro con identificador nuevo en el Almacén

**Reason**: Las altas se registran en la API, que asigna el identificador.
**Migration**: `acceso-a-datos`, «Escrituras con el resultado del servidor».

### Requirement: Lectura y persistencia de ventas

**Reason**: Las ventas se registran y se leen en la API.
**Migration**: `ventas` («Confirmación validada con instantánea») e `historial` («Historial desde ventas guardadas»).

### Requirement: Identificador asignado al registrar la venta

**Reason**: La API asigna el identificador de la venta.
**Migration**: `acceso-a-datos`, «Escrituras con el resultado del servidor».

### Requirement: Copias independientes de ventas

**Reason**: La venta la guarda el servidor; el navegador no conserva copias.
**Migration**: El precio histórico lo garantiza la API (`historial`, «Detalle histórico independiente del catálogo»).

### Requirement: Compatibilidad y errores del almacenamiento de ventas

**Reason**: No hay almacenamiento de ventas en el navegador.
**Migration**: Los errores de escritura de la venta son los de la API (`ventas`, «Resultado accesible y conservación ante fallo»).

### Requirement: Almacén local para las vistas de gestión

**Reason**: Las vistas de gestión pasan a la API.
**Migration**: `acceso-a-datos`, «Datos de negocio desde la API».
