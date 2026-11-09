# datos-locales Specification

## Purpose
Fija lo que queda del almacén local después de que los datos de negocio pasaron a la API: las reglas compartidas de normalización (búsqueda, ISBN y email) y el trato de las claves `libreria.*` que dejó la versión anterior, que no se leen, no se escriben ni se borran. El navegador guarda solo usuarios y sesión (`users` y `userData`, ver `usuarios-y-sesion`).

## Requirements

### Requirement: Normalización compartida

El proyecto SHALL proveer reglas compartidas de normalización: el texto de búsqueda se recorta y se compara sin distinguir mayúsculas de minúsculas, el ISBN se compara sin espacios ni guiones, y el email se recorta y se pasa a minúsculas.

#### Scenario: Texto de búsqueda normalizado

- **WHEN** se normaliza un texto con espacios en los extremos y mezcla de mayúsculas
- **THEN** se obtiene el texto sin esos espacios y en minúsculas

#### Scenario: ISBN normalizado

- **WHEN** se normaliza un ISBN con espacios y guiones
- **THEN** se obtiene el mismo ISBN sin espacios ni guiones

#### Scenario: Email normalizado

- **WHEN** se normaliza un email con espacios exteriores y mayúsculas
- **THEN** se obtiene el email sin esos espacios y en minúsculas

### Requirement: Claves de negocio anteriores sin uso

La aplicación no SHALL leer, escribir, migrar ni borrar las claves `libreria.libros`, `libreria.clientes` y `libreria.ventas` que haya dejado en el navegador una versión anterior. Las únicas claves del navegador que usa SHALL ser `users` y `userData`.

#### Scenario: Navegador con datos de la versión anterior

- **WHEN** un navegador tiene guardadas `libreria.libros`, `libreria.clientes` y `libreria.ventas` y el operador usa todas las vistas
- **THEN** esas claves conservan su contenido sin cambios y ninguna vista muestra sus registros

#### Scenario: Navegador sin datos anteriores

- **WHEN** el operador usa la aplicación en un navegador sin claves `libreria.*`
- **THEN** la aplicación no crea ninguna clave `libreria.*`
