# Spec Delta

## MODIFIED Requirements

### Requirement: Repositorios como única vía de acceso a datos

Las vistas SHALL obtener y registrar libros, editoriales, géneros, autores, clientes, ventas, usuarios y la sesión solo mediante repositorios o servicios con operaciones asíncronas que entrega la raíz de composición. Ninguna vista SHALL acceder a `localStorage`, a los datos iniciales ni a la red de forma directa.

#### Scenario: Vista que lista libros

- **WHEN** la vista Catálogo necesita los libros
- **THEN** los pide a un repositorio y espera su respuesta, sin leer `localStorage` ni datos iniciales

#### Scenario: Vista que inicia sesión

- **WHEN** la página de login comprueba las credenciales y guarda la sesión
- **THEN** lo hace mediante el servicio de autenticación de la raíz de composición, sin leer ni escribir `localStorage` en forma directa

#### Scenario: Revisión del código de las vistas

- **WHEN** se revisan los módulos de `src/pages/`
- **THEN** no contienen accesos a `localStorage`, importaciones de los datos iniciales ni llamadas de red
