// Entrada común de todas las vistas. Cada módulo de vista la importa en primer
// lugar. Hoy conecta el cierre de sesión del encabezado; el change
// `proteccion-de-rutas-y-roles` agrega aquí, antes, la intercepción de la carga
// de página.
import { cerrarSesion, obtenerSesion } from "./utils/auth";
import { conectarCierreDeSesion } from "./utils/dom";

conectarCierreDeSesion(obtenerSesion(), cerrarSesion);
