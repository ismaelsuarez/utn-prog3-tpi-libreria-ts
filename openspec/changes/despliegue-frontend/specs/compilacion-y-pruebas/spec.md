# Spec Delta

## ADDED Requirements

### Requirement: Paquete de entrega

El proyecto SHALL ofrecer `npm run entrega`, que genera en la raíz un archivo `.zip` con el contenido del último commit (no el de la copia de trabajo), dentro de una única carpeta raíz, con la estructura de carpetas del repositorio. El paquete SHALL contener lo necesario para instalar, ejecutar, compilar y desplegar la aplicación, y SHALL excluir las dependencias, la compilación y los archivos de desarrollo.

#### Scenario: Generación del paquete

- **WHEN** se ejecuta `npm run entrega` en un clon con Git
- **THEN** termina con código 0 y deja en la raíz un `.zip` legible cuyo contenido está bajo una única carpeta

#### Scenario: Contenido incluido

- **WHEN** se lista el contenido del `.zip`
- **THEN** contiene `index.html`, `src/`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`, `README.md`, `Dockerfile`, `.dockerignore` y `despliegue/`

#### Scenario: Contenido excluido

- **WHEN** se lista el contenido del `.zip`
- **THEN** no contiene `node_modules/`, `dist/`, `.git/`, `.engram/`, `.githooks/`, `.claude/`, `.atl/`, `openspec/`, `knowledge-base/`, `discovery/`, `docs/`, `CHANGES.md`, `AGENTS.md`, `CLAUDE.md` ni ningún `.zip`

#### Scenario: Proyecto que ejecuta desde el paquete

- **WHEN** se descomprime el `.zip` en una carpeta vacía y se ejecutan `npm ci` y `npm run build`
- **THEN** ambos terminan con código 0 y `dist/` contiene la página de entrada y las vistas

#### Scenario: Cambios sin commit

- **WHEN** la copia de trabajo tiene cambios sin commit y se ejecuta `npm run entrega`
- **THEN** el `.zip` refleja el último commit, sin esos cambios
