// Utilidades de DOM comunes a las vistas. Los datos de usuario se insertan
// siempre como texto (`textContent`), nunca como HTML.

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
