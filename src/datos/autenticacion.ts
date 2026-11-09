// Servicio de autenticación: registro, ingreso, lectura de la sesión y cierre.
// Compone la lógica pura (`usuarios`, `sesion`), el almacén de usuarios y la
// protección de contraseñas. Las páginas de acceso lo obtienen de
// `proveedor.ts` y no conocen el almacenamiento (regla dura 4).
import { buscarPorEmail, validarRegistro } from "../logica/usuarios";
import { aSesion, sesionVigente } from "../logica/sesion";
import { normalizarEmail } from "../logica/texto";
import type { ErrorDeCampo } from "../types/formulario";
import type { IUser } from "../types/IUser";
import type {
  BorradorRegistro,
  ContrasenaGuardada,
  CredencialesIngreso,
} from "../types/usuario";
import type { AlmacenUsuarios } from "./local/almacen-usuarios";
import { protegerContrasena, verificarContrasena } from "./local/contrasenas";

export interface ServicioAutenticacion {
  /**
   * Valida y agrega un usuario `client`. Devuelve los errores de campo (vacío si
   * se registró). Lanza `ErrorDeAlmacenamiento` o `ErrorDeCriptografia`.
   */
  registrar(borrador: BorradorRegistro): Promise<ErrorDeCampo[]>;
  /**
   * Si el email y la contraseña coinciden, guarda y devuelve la sesión; si no,
   * `null` sin tocar `userData` (no distingue cuál de los dos datos falló).
   */
  ingresar(credenciales: CredencialesIngreso): Promise<IUser | null>;
  /**
   * La sesión vigente, o `null` si no hay, `userData` es inválido o no coincide
   * con un usuario de `users` (mismo email y mismo rol).
   */
  obtenerSesion(): IUser | null;
  /** Quita `userData`; `users` no cambia. */
  cerrarSesion(): void;
}

export interface ServicioDeContrasenas {
  proteger(contrasena: string): Promise<ContrasenaGuardada>;
  verificar(contrasena: string, guardada: ContrasenaGuardada): Promise<boolean>;
}

export interface OpcionesDelServicio {
  /** Reloj inyectable para fechar el alta. */
  ahora?: () => Date;
}

const contrasenasPorDefecto: ServicioDeContrasenas = {
  proteger: (contrasena) => protegerContrasena(contrasena),
  verificar: (contrasena, guardada) => verificarContrasena(contrasena, guardada),
};

// Huella ficticia con el costo de la política: ante un email inexistente se
// verifica contra ella para que ambos fallos tarden lo mismo. No es una defensa
// real en el cliente; solo mantiene coherente el mensaje único.
const CONTRASENA_FICTICIA: ContrasenaGuardada = {
  algoritmo: "PBKDF2-SHA-256",
  iteraciones: 100000,
  sal: "00".repeat(16),
  huella: "00".repeat(32),
};

const ERROR_DE_EMAIL_DUPLICADO: ErrorDeCampo = {
  campo: "email",
  mensaje: "Ese email ya está registrado.",
};

export function crearServicioAutenticacion(
  almacen: AlmacenUsuarios,
  contrasenas: ServicioDeContrasenas = contrasenasPorDefecto,
  opciones: OpcionesDelServicio = {},
): ServicioAutenticacion {
  const ahora = opciones.ahora ?? (() => new Date());

  return {
    async registrar(borrador) {
      const errores = validarRegistro(borrador, almacen.obtenerUsuarios());
      if (errores.length > 0) return errores;

      const email = normalizarEmail(borrador.email);
      const contrasena = await contrasenas.proteger(borrador.contrasena);

      // La derivación es asíncrona: se vuelve a comprobar contra lo guardado
      // por si otra pestaña registró el mismo email mientras tanto.
      if (buscarPorEmail(almacen.obtenerUsuarios(), email) !== null) {
        return [ERROR_DE_EMAIL_DUPLICADO];
      }
      almacen.agregarUsuario({
        email,
        role: "client",
        contrasena,
        creadoEn: ahora().toISOString(),
      });
      return [];
    },

    async ingresar(credenciales) {
      const usuario = buscarPorEmail(almacen.obtenerUsuarios(), credenciales.email);
      if (usuario === null) {
        await contrasenas.verificar(credenciales.contrasena, CONTRASENA_FICTICIA);
        return null;
      }
      if (!(await contrasenas.verificar(credenciales.contrasena, usuario.contrasena))) {
        return null;
      }
      const sesion = aSesion(usuario);
      almacen.guardarSesion(sesion);
      return sesion;
    },

    obtenerSesion() {
      return sesionVigente(almacen.leerSesion(), almacen.obtenerUsuarios());
    },

    cerrarSesion() {
      almacen.eliminarSesion();
    },
  };
}
