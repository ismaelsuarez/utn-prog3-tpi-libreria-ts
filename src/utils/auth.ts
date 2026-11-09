// Envoltorios de navegador sobre el servicio de autenticación y la lógica de
// sesión. Es la API que consume `src/main.ts` (y, en `proteccion-de-rutas-y-roles`,
// la intercepción de la carga de página). Sin lógica propia.
import { autenticacion } from "../datos/proveedor";
import { destinoPorRol, rutaDe } from "../logica/sesion";
import type { IUser } from "../types/IUser";
import { navegar } from "./navigate";

/** La sesión vigente validada, o `null` si no hay. */
export function obtenerSesion(): IUser | null {
  return autenticacion.obtenerSesion();
}

/** Quita `userData`, conserva `users` y pasa al login (ruta relativa: funciona bajo subruta). */
export function cerrarSesion(): void {
  autenticacion.cerrarSesion();
  navegar(rutaDe("login"));
}

/** Pasa al destino que corresponde al rol: Libros para `admin`, Catálogo para `client`. */
export function irAlDestinoDelRol(sesion: IUser): void {
  navegar(rutaDe(destinoPorRol(sesion.role)));
}
