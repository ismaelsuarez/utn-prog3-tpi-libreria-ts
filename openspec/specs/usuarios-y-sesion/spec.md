# usuarios-y-sesion Specification

## Purpose
Permite registrar usuarios, iniciar y cerrar sesión y conocer el rol del usuario en curso, todo guardado en el navegador bajo las claves `users` y `userData`, porque la API de producción no ofrece autenticación. Es una protección solo del lado del cliente.

## Requirements

### Requirement: Formulario de registro
La página de registro SHALL publicarse en `src/pages/auth/registro/` y SHALL pedir solo email, contraseña y repetición de la contraseña, cada campo con su etiqueta y su lugar de error. No SHALL ofrecer ningún selector de rol.

#### Scenario: Campos del registro
- **WHEN** se abre la página de registro
- **THEN** muestra los campos Email, Contraseña y Repetir contraseña, un botón «Crear cuenta» y ningún control para elegir el rol

#### Scenario: Enlace al login
- **WHEN** el visitante está en la página de registro
- **THEN** encuentra un enlace a la página de login

### Requirement: Validación del registro
El registro SHALL rechazar el alta e indicar el error junto a cada campo cuando el email esté vacío, no tenga formato válido o ya esté registrado, cuando la contraseña tenga menos de 8 o más de 64 caracteres, o cuando la repetición no coincida con la contraseña.

#### Scenario: Email vacío
- **WHEN** el visitante envía el registro con el email vacío
- **THEN** no se crea la cuenta y junto al email se muestra «El email es obligatorio.»

#### Scenario: Email con formato inválido
- **WHEN** el visitante envía el registro con el email `ana@`
- **THEN** no se crea la cuenta y junto al email se muestra «El email no tiene un formato válido.»

#### Scenario: Contraseña corta
- **WHEN** el visitante envía una contraseña de 7 caracteres
- **THEN** no se crea la cuenta y junto a la contraseña se muestra «La contraseña debe tener entre 8 y 64 caracteres.»

#### Scenario: Repetición distinta
- **WHEN** la repetición no es idéntica a la contraseña
- **THEN** no se crea la cuenta y junto a la repetición se muestra «Las contraseñas no coinciden.»

#### Scenario: Foco y marca de error
- **WHEN** el registro se rechaza por errores de campo
- **THEN** cada campo con error queda marcado como inválido para las tecnologías de asistencia, se muestra un resumen «Revisá los campos marcados. No se creó la cuenta.» y el foco pasa al primer campo con error

### Requirement: Sin registros duplicados
El registro SHALL comparar el email recortado y en minúsculas con el de todos los usuarios guardados, incluido el administrador inicial, y SHALL rechazar el alta si ya existe.

#### Scenario: Email existente con otra capitalización
- **WHEN** existe el usuario `laura@correo.test` y el visitante se registra con `  LAURA@Correo.TEST `
- **THEN** no se crea la cuenta, junto al email se muestra «Ese email ya está registrado.» y el arreglo `users` no cambia

#### Scenario: Email del administrador
- **WHEN** el visitante se registra con el email del administrador inicial
- **THEN** el alta se rechaza como email ya registrado

### Requirement: Alta de usuario en la clave users
Un registro válido SHALL agregar un objeto al arreglo JSON guardado bajo la clave `users`, con el email normalizado, el rol `client`, la fecha de alta y la contraseña protegida, y SHALL conservar los usuarios anteriores.

#### Scenario: Registro correcto
- **WHEN** el visitante se registra con `nuevo@correo.test` y una contraseña válida repetida igual
- **THEN** el arreglo `users` tiene un elemento más con `email` `nuevo@correo.test` y `role` `client`, y los elementos anteriores siguen sin cambios

#### Scenario: Navegación después del registro
- **WHEN** el registro se completa
- **THEN** el navegador pasa a la página de login, que muestra «Cuenta creada. Ingresá con tu email y contraseña.», y todavía no hay sesión iniciada

### Requirement: Contraseña nunca guardada en texto plano
La contraseña SHALL guardarse en `users` solo como una huella derivada con una sal aleatoria propia de cada usuario, junto con el algoritmo y los parámetros necesarios para verificarla. Ningún dato guardado en `localStorage` SHALL contener la contraseña en texto plano.

#### Scenario: Inspección de lo guardado
- **WHEN** después de registrar un usuario con la contraseña `Faro-2026` se inspecciona `localStorage`
- **THEN** el texto `Faro-2026` no aparece en ninguna clave

#### Scenario: Misma contraseña, distinta huella
- **WHEN** dos usuarios se registran con la misma contraseña
- **THEN** sus huellas guardadas son distintas

### Requirement: Usuario administrador inicial
Cuando la clave `users` no existe, la aplicación SHALL crearla con un único usuario de rol `admin`, cuyas credenciales de demostración SHALL figurar en el README. Si la clave ya existe, SHALL respetarla sin agregar ni reemplazar usuarios.

#### Scenario: Primer inicio
- **WHEN** se abre cualquier página de la aplicación en un navegador sin la clave `users`
- **THEN** la clave `users` contiene un único usuario con `role` `admin` y el email documentado en el README

#### Scenario: Clave existente
- **WHEN** la clave `users` ya tiene usuarios guardados
- **THEN** al abrir la aplicación sigue con los mismos usuarios, sin duplicar al administrador

### Requirement: Formulario de inicio de sesión
La página de login SHALL publicarse en `src/pages/auth/login/` y SHALL pedir email y contraseña, cada campo con su etiqueta y su lugar de error, con un enlace a la página de registro.

#### Scenario: Campos del login
- **WHEN** se abre la página de login
- **THEN** muestra los campos Email y Contraseña, un botón «Ingresar» y un enlace a la página de registro

#### Scenario: Campos vacíos
- **WHEN** el visitante envía el login con el email o la contraseña vacíos
- **THEN** no se inicia sesión y junto a cada campo vacío se muestra «Ingresá tu email.» o «Ingresá tu contraseña.»

### Requirement: Inicio de sesión por coincidencia en users
El login SHALL buscar en `users` el usuario cuyo email normalizado coincida y cuya contraseña verifique contra su huella. Si coincide, SHALL guardar en `userData` un objeto con `email`, `loggedIn` en `true` y `role`, sin la contraseña ni su huella.

#### Scenario: Credenciales correctas
- **WHEN** el visitante ingresa con el email del administrador en mayúsculas y su contraseña correcta
- **THEN** la clave `userData` contiene exactamente `email` (normalizado), `loggedIn: true` y `role: "admin"`

#### Scenario: Credenciales incorrectas
- **WHEN** el visitante ingresa un email registrado con una contraseña equivocada, o un email no registrado
- **THEN** no se modifica `userData` y se muestra el mismo mensaje en ambos casos: «El email o la contraseña no son correctos.»

### Requirement: Destino según el rol
Después de iniciar sesión, el navegador SHALL pasar a la vista Libros si el rol es `admin` y a la vista Catálogo si el rol es `client`.

#### Scenario: Ingreso de un administrador
- **WHEN** inicia sesión un usuario con rol `admin`
- **THEN** el navegador muestra la vista Libros

#### Scenario: Ingreso de un cliente
- **WHEN** inicia sesión un usuario con rol `client`
- **THEN** el navegador muestra la vista Catálogo

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

### Requirement: Sesión existente en las páginas de acceso
Si al abrir la página de login o de registro ya hay una sesión válida, el navegador SHALL pasar al destino que corresponde a su rol.

#### Scenario: Login con sesión iniciada
- **WHEN** un usuario con sesión `client` abre la página de login
- **THEN** el navegador pasa a la vista Catálogo sin mostrar el formulario

### Requirement: Cierre de sesión
Las cinco vistas de la librería SHALL ofrecer en su encabezado un botón «Cerrar sesión» cuando hay una sesión válida; al usarlo, la aplicación SHALL quitar la clave `userData` y SHALL pasar a la página de login. La clave `users` no SHALL cambiar.

#### Scenario: Cerrar sesión
- **WHEN** un usuario con sesión iniciada usa «Cerrar sesión» desde la vista Ventas
- **THEN** la clave `userData` ya no existe, `users` sigue igual y el navegador muestra la página de login

#### Scenario: Usuario en curso
- **WHEN** hay una sesión válida y se abre cualquiera de las cinco vistas
- **THEN** el encabezado muestra el email del usuario en curso junto al botón «Cerrar sesión»

### Requirement: Almacenamiento no disponible
Si el almacenamiento del navegador no está disponible o rechaza la escritura, el registro y el login SHALL mostrar un mensaje de error en texto y SHALL no anunciar una cuenta creada ni una sesión iniciada.

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador bloquea `localStorage` y el visitante envía un registro válido
- **THEN** se muestra «No se pudo acceder al almacenamiento del navegador. Revisá que no esté bloqueado e intentá nuevamente.» y no se navega al login

### Requirement: Limitación de seguridad documentada
El README SHALL declarar que el registro, el login, la sesión, los roles y la protección de rutas existen solo en el navegador, que cualquiera con acceso al navegador puede editar `userData` y `users`, y que la API de producción no exige autenticación.

#### Scenario: Lectura del README
- **WHEN** el docente busca en el README cómo se protegen los datos
- **THEN** encuentra la limitación descrita y las credenciales de demostración del administrador, presentadas como datos de prueba y no como un secreto

#### Scenario: Alcance de la protección de rutas
- **WHEN** el docente busca en el README qué impide a un `client` abrir una vista de gestión
- **THEN** encuentra que la protección de rutas ordena el uso de la aplicación en el navegador y no es una medida de seguridad real
