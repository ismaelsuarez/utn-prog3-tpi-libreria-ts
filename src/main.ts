// Entrada común de todas las vistas. Cada módulo de vista la importa en primer
// lugar, así que la intercepción de la carga corre antes que el código de la
// vista: decide por la zona de la dirección y la sesión vigente si la página se
// muestra o se redirige. Es una protección solo del cliente (DD-19, DD-25).
import {
  decidirAcceso,
  mismaSesion,
  rutaDe,
  zonaDeRuta,
} from "./logica/sesion";
import { cerrarSesion, obtenerSesion } from "./utils/auth";
import {
  ajustarNavegacion,
  conectarCierreDeSesion,
  mostrarPagina,
  ocultarPagina,
} from "./utils/dom";
import { navegar, recargar } from "./utils/navigate";

/**
 * Intercepta la carga de la página. Devuelve `false` si redirige (la página
 * sigue oculta y no debe ejecutarse la vista); si la permite, ajusta la
 * navegación según el rol, conecta el cierre de sesión, muestra el cuerpo y deja
 * armada la decisión para cuando el navegador restaure la página desde su caché
 * de ida y vuelta.
 */
export function interceptarCargaDePagina(): boolean {
  const zona = zonaDeRuta(window.location.pathname);
  const sesion = obtenerSesion();
  const decision = decidirAcceso(zona, sesion);
  if (decision.tipo === "redirigir") {
    navegar(rutaDe(decision.destino));
    return false;
  }

  ajustarNavegacion(
    (ruta) => decidirAcceso(zonaDeRuta(ruta), sesion).tipo === "permitir",
  );
  conectarCierreDeSesion(sesion, cerrarSesion);
  mostrarPagina();

  window.addEventListener("pagehide", (evento) => {
    // Una copia guardada en la caché no debe mostrar nada al restaurarse hasta decidir de nuevo.
    if (evento.persisted) ocultarPagina();
  });
  window.addEventListener("pageshow", (evento) => {
    if (!evento.persisted) return;
    const actual = obtenerSesion();
    const nueva = decidirAcceso(zona, actual);
    if (nueva.tipo === "redirigir") navegar(rutaDe(nueva.destino));
    else if (mismaSesion(sesion, actual)) mostrarPagina();
    else recargar();
  });
  return true;
}

// Sin permiso, el módulo no termina: las vistas lo importan primero, así que su
// código no llega a evaluarse (no lee datos, no pide `/api` ni conecta controles)
// mientras el navegador cambia de página.
if (!interceptarCargaDePagina()) {
  await new Promise<never>(() => {});
}
