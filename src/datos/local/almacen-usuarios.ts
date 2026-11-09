// Almacén de usuarios y sesión sobre el almacenamiento inyectado. Es permanente
// (la API de producción no tiene usuarios), por eso vive aparte del almacén
// local, que es transitorio. No accede al almacenamiento global: recibe el almacenamiento
// que entrega `obtenerAlmacenamientoDelNavegador()`.
//
// Claves (las fija la consigna, sin el prefijo `libreria.`):
//   users     - arreglo de `UsuarioRegistrado`.
//   userData  - el `IUser` de la sesión en curso (nunca la contraseña).
//
// A diferencia de libros y clientes no hay reserva en memoria: en una aplicación
// multipágina la sesión en memoria se pierde al navegar y fingirla engañaría. Sin
// almacenamiento, `agregarUsuario` y `guardarSesion` lanzan
// `ErrorDeAlmacenamiento`; `inicializar()` y las lecturas nunca lanzan.
import { esUsuarioRegistrado } from "../../logica/sesion";
import type { IUser } from "../../types/IUser";
import type { UsuarioRegistrado } from "../../types/usuario";
import { ErrorDeAlmacenamiento } from "../errores";
import type { AlmacenamientoInyectable } from "./almacen-local";
import { usuariosIniciales } from "./usuarios-iniciales";

export const CLAVE_USUARIOS = "users";
export const CLAVE_SESION = "userData";

export interface AlmacenUsuarios {
  /** Siembra `users` con el administrador solo si la clave no existe. No lanza. */
  inicializar(): void;
  /** Los usuarios válidos guardados; la semilla si la clave falta o es ilegible. */
  obtenerUsuarios(): UsuarioRegistrado[];
  /** Agrega al final conservando los anteriores. Lanza `ErrorDeAlmacenamiento`. */
  agregarUsuario(usuario: UsuarioRegistrado): void;
  /** Lo guardado en `userData` sin validar; `null` si falta o es ilegible. */
  leerSesion(): unknown;
  /** Guarda exactamente `email`, `loggedIn` y `role`. Lanza `ErrorDeAlmacenamiento`. */
  guardarSesion(sesion: IUser): void;
  /** Quita `userData` y deja `users`. Lanza `ErrorDeAlmacenamiento` si no puede quitarla. */
  eliminarSesion(): void;
}

type Almacenamiento = Pick<Storage, "getItem" | "setItem"> &
  Partial<Pick<Storage, "removeItem">>;

function esUtilizable(storage: AlmacenamientoInyectable | null): storage is Almacenamiento {
  return (
    storage !== null &&
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function"
  );
}

function copiarUsuario(usuario: UsuarioRegistrado): UsuarioRegistrado {
  return { ...usuario, contrasena: { ...usuario.contrasena } };
}

export function crearAlmacenUsuarios(
  almacenamiento: AlmacenamientoInyectable | null,
): AlmacenUsuarios {
  const storage = esUtilizable(almacenamiento) ? almacenamiento : null;

  function obtenerStorage(): Almacenamiento {
    if (storage === null) throw new ErrorDeAlmacenamiento();
    return storage;
  }

  /** Texto crudo de la clave, o `null` si falta, no hay almacenamiento o la lectura falla. */
  function leerCrudo(clave: string): string | null {
    if (storage === null) return null;
    try {
      return storage.getItem(clave) ?? null;
    } catch {
      return null;
    }
  }

  function leerUsuarios(): UsuarioRegistrado[] {
    const crudo = leerCrudo(CLAVE_USUARIOS);
    if (crudo !== null) {
      try {
        const lista: unknown = JSON.parse(crudo);
        if (Array.isArray(lista)) {
          return lista.filter(esUsuarioRegistrado).map(copiarUsuario);
        }
      } catch {
        // Contenido ilegible: se usa la semilla sin sobrescribirlo.
      }
    }
    return usuariosIniciales.map(copiarUsuario);
  }

  function clavePresente(clave: string): boolean {
    if (storage === null) return false;
    try {
      const crudo = storage.getItem(clave);
      return crudo !== null && crudo !== undefined;
    } catch {
      return true; // Lectura rechazada: se conserva todo tal como está.
    }
  }

  function escribir(clave: string, valor: string): void {
    const almacen = obtenerStorage();
    try {
      almacen.setItem(clave, valor);
    } catch {
      throw new ErrorDeAlmacenamiento();
    }
  }

  return {
    inicializar() {
      if (storage === null || clavePresente(CLAVE_USUARIOS)) return;
      try {
        storage.setItem(CLAVE_USUARIOS, JSON.stringify(usuariosIniciales));
      } catch {
        // La página debe cargar aunque no se pueda sembrar.
      }
    },
    obtenerUsuarios: leerUsuarios,
    agregarUsuario(usuario) {
      obtenerStorage();
      escribir(CLAVE_USUARIOS, JSON.stringify([...leerUsuarios(), copiarUsuario(usuario)]));
    },
    leerSesion() {
      const crudo = leerCrudo(CLAVE_SESION);
      if (crudo === null) return null;
      try {
        return JSON.parse(crudo) as unknown;
      } catch {
        return null;
      }
    },
    guardarSesion(sesion) {
      const { email, loggedIn, role } = sesion;
      escribir(CLAVE_SESION, JSON.stringify({ email, loggedIn, role }));
    },
    eliminarSesion() {
      if (storage === null) return;
      try {
        if (typeof storage.removeItem !== "function") throw new ErrorDeAlmacenamiento();
        storage.removeItem(CLAVE_SESION);
      } catch {
        throw new ErrorDeAlmacenamiento();
      }
    },
  };
}
