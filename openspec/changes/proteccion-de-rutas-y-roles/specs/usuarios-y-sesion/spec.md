# Spec Delta

## MODIFIED Requirements

### Requirement: Lectura validada de la sesión
La aplicación SHALL considerar iniciada la sesión solo si `userData` contiene un objeto con `email` de texto no vacío, `loggedIn` en `true` y `role` igual a `client` o `admin`, y si en `users` existe un usuario con ese email normalizado y ese mismo rol; cualquier otro contenido, incluido un JSON ilegible, SHALL tratarse como sesión ausente sin interrumpir la página.

#### Scenario: Sesión ilegible
- **WHEN** `userData` contiene texto que no es JSON o un objeto con `role` `"superusuario"`
- **THEN** la aplicación se comporta como si no hubiera sesión y la página termina de cargar

#### Scenario: Rol editado a mano
- **WHEN** `users` registra a `laura@correo.test` con rol `client` y `userData` se edita a `{"email":"laura@correo.test","loggedIn":true,"role":"admin"}`
- **THEN** la aplicación se comporta como si no hubiera sesión

#### Scenario: Email que no está registrado
- **WHEN** `userData` tiene la forma válida pero su email no corresponde a ningún usuario de `users`
- **THEN** la aplicación se comporta como si no hubiera sesión

#### Scenario: Sesión que coincide con users
- **WHEN** `users` registra a `laura@correo.test` con rol `client` y `userData` es `{"email":"laura@correo.test","loggedIn":true,"role":"client"}`
- **THEN** la sesión se considera iniciada con rol `client`

### Requirement: Limitación de seguridad documentada
El README SHALL declarar que el registro, el login, la sesión, los roles y la protección de rutas existen solo en el navegador, que cualquiera con acceso al navegador puede editar `userData` y `users`, y que la API de producción no exige autenticación.

#### Scenario: Lectura del README
- **WHEN** el docente busca en el README cómo se protegen los datos
- **THEN** encuentra la limitación descrita y las credenciales de demostración del administrador, presentadas como datos de prueba y no como un secreto

#### Scenario: Alcance de la protección de rutas
- **WHEN** el docente busca en el README qué impide a un `client` abrir una vista de gestión
- **THEN** encuentra que la protección de rutas ordena el uso de la aplicación en el navegador y no es una medida de seguridad real
