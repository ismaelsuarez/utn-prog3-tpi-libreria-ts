// Utilidades de DOM comunes a las vistas. Los datos de usuario se insertan
// siempre como texto (`textContent`), nunca como HTML.
import type { ErrorDeCampo } from "../types/formulario";
import type { IUser } from "../types/IUser";

export function mostrarMensaje(nodo: HTMLElement, texto: string): void {
  nodo.textContent = texto;
  nodo.hidden = false;
}

export function ocultarMensaje(nodo: HTMLElement): void {
  nodo.hidden = true;
}

export function vaciarNodo(nodo: Node): void {
  while (nodo.firstChild) {
    nodo.removeChild(nodo.firstChild);
  }
}

/** Busca un elemento por `id`; si falta, lanza un error (la página está mal armada). */
export function elementoPorId<T extends HTMLElement>(
  id: string,
  tipo: new () => T,
): T {
  const elemento = document.getElementById(id);
  if (!(elemento instanceof tipo)) {
    throw new Error(`Falta el elemento #${id} (${tipo.name}) en la página.`);
  }
  return elemento;
}

/** Busca dentro de `raiz` el elemento que coincide con el selector. */
export function buscar<T extends Element>(
  raiz: ParentNode,
  selector: string,
  tipo: new () => T,
): T {
  const elemento = raiz.querySelector(selector);
  if (!(elemento instanceof tipo)) {
    throw new Error(`Falta el elemento ${selector} (${tipo.name}).`);
  }
  return elemento;
}

/** Texto de un error, para mostrarlo al operador. */
export function textoDeError(error: unknown): string {
  return error instanceof Error && error.message !== ""
    ? error.message
    : "Ocurrió un error inesperado.";
}

/**
 * Ejecuta el arranque asíncrono de una vista. Si falla, muestra un mensaje de
 * error en texto en la región indicada y no deja un rechazo sin controlar.
 */
export function arrancar(
  iniciar: () => Promise<void>,
  regionDeError: () => HTMLElement | null,
): void {
  iniciar().catch((error: unknown) => {
    const region = regionDeError();
    const texto = `No se pudieron cargar los datos. ${textoDeError(error)}`;
    if (region) mostrarMensaje(region, texto);
    else console.error(texto);
  });
}

/** Reemplaza las opciones de un `select`: una primera opción vacía y una por registro. */
export function llenarSelect(
  select: HTMLSelectElement,
  textoDeLaPrimera: string,
  registros: readonly { id: number; nombre: string }[],
): void {
  vaciarNodo(select);
  const primera = document.createElement("option");
  primera.value = "";
  primera.textContent = textoDeLaPrimera;
  select.appendChild(primera);
  for (const registro of registros) {
    const opcion = document.createElement("option");
    opcion.value = String(registro.id);
    opcion.textContent = registro.nombre;
    select.appendChild(opcion);
  }
}

/** Convierte el valor de un control en un identificador, o `null` si está vacío. */
export function idDeValor(valor: string): number | null {
  return valor.trim() === "" ? null : Number(valor);
}

/**
 * Quita los errores de campo: vacía cada región `error-<prefijo>-<campo>`,
 * retira `aria-invalid` de `<prefijo>-<campo>` y oculta el resumen.
 */
export function limpiarErroresDeCampos(
  prefijo: string,
  campos: readonly string[],
  resumen: HTMLElement,
): void {
  for (const campo of campos) {
    const region = document.getElementById(`error-${prefijo}-${campo}`);
    if (region) region.textContent = "";
    document.getElementById(`${prefijo}-${campo}`)?.removeAttribute("aria-invalid");
  }
  ocultarMensaje(resumen);
}

/**
 * Muestra cada error junto a su campo (con `aria-invalid`), el resumen en la
 * región de alerta y lleva el foco al primer campo con error.
 */
export function mostrarErroresDeCampos(
  prefijo: string,
  errores: readonly ErrorDeCampo[],
  resumen: HTMLElement,
  textoDelResumen: string,
): void {
  for (const error of errores) {
    const region = document.getElementById(`error-${prefijo}-${error.campo}`);
    if (region) mostrarMensaje(region, error.mensaje);
    document.getElementById(`${prefijo}-${error.campo}`)?.setAttribute("aria-invalid", "true");
  }
  mostrarMensaje(resumen, textoDelResumen);
  const primero = errores[0];
  if (primero) document.getElementById(`${prefijo}-${primero.campo}`)?.focus();
}

/**
 * Si hay una sesión, muestra en el encabezado el email del usuario en curso
 * junto al botón «Cerrar sesión» y lo conecta con `alCerrar`. Sin sesión (o en
 * una página sin ese bloque) no hace nada y el bloque queda oculto.
 */
export function conectarCierreDeSesion(sesion: IUser | null, alCerrar: () => void): void {
  const bloque = document.querySelector(".encabezado__sesion");
  if (sesion === null || !(bloque instanceof HTMLElement)) return;
  buscar(bloque, '[data-sesion="email"]', HTMLElement).textContent = sesion.email;
  buscar(bloque, '[data-accion="cerrar-sesion"]', HTMLButtonElement).addEventListener(
    "click",
    () => {
      try {
        alCerrar();
      } catch (error) {
        console.error(`No se pudo cerrar la sesión. ${textoDeError(error)}`);
      }
    },
  );
  bloque.hidden = false;
}
