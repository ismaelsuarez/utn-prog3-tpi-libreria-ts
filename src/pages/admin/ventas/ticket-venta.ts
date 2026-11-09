// Comprobante de la venta: presentación aislada, no registra ventas ni toca el
// almacenamiento. `mostrar` recibe exactamente la `Venta` que devolvió
// `RepositorioVentas.crear`.
import { codigoDeVenta } from "../../../logica/ventas";
import type { Renglon, Venta } from "../../../types/venta";
import { elementoPorId } from "../../../utils/dom";

const formatoImporte = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});
const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export interface Comprobante {
  mostrar(venta: Venta): void;
}

export function iniciarComprobante(): Comprobante {
  const dialogo = elementoPorId("modal-comprobante", HTMLDialogElement);
  const escena = elementoPorId("ticket-venta-escena", HTMLElement);
  const visor = elementoPorId("ticket-venta-visor", HTMLElement);
  const papel = elementoPorId("ticket-venta-papel-contenedor", HTMLElement);
  const indicador = elementoPorId("ticket-venta-indicador", HTMLElement);
  const estado = elementoPorId("ticket-venta-estado", HTMLElement);
  const detalle = elementoPorId("ticket-venta-detalle", HTMLElement);
  const anuncio = elementoPorId("ticket-venta-anuncio", HTMLElement);
  const repetir = elementoPorId("ticket-venta-repetir", HTMLButtonElement);
  const imprimir = elementoPorId("ticket-venta-imprimir", HTMLButtonElement);
  const cerrar = elementoPorId("ticket-venta-cerrar", HTMLElement);
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pendientes: number[] = [];
  let ventaActual: Venta | null = null;

  // El CSS mantiene la escena a su tamaño natural (440px); solo la
  // representación en pantalla se escala. El ticket de impresión es aparte.
  let ajustePendiente = 0;

  function ajustarVistaCompleta(): void {
    if (!dialogo.open) return;
    const anchoDisponible = visor.clientWidth - 18;
    const altoDisponible = visor.clientHeight - 14;
    if (anchoDisponible <= 0 || altoDisponible <= 0) return;

    // Medimos una copia con el papel TOTALMENTE DESPLEGADO, incluso mientras el
    // original está oculto o sale progresivamente. Es una medición síncrona,
    // invisible y sin modificar la animación.
    const medicion = escena.cloneNode(true) as HTMLElement;
    medicion.id = "ticket-venta-medicion-temporal";
    medicion.setAttribute("aria-hidden", "true");
    medicion.dataset["estado"] = "listo";
    medicion.style.left = "0";
    medicion.style.top = "0";
    medicion.style.transform = "none";
    medicion.style.transition = "none";
    medicion.style.visibility = "hidden";
    medicion.style.pointerEvents = "none";
    visor.appendChild(medicion);
    const anchoTotal = Math.max(medicion.scrollWidth, medicion.offsetWidth);
    const altoTotal = Math.max(medicion.scrollHeight, medicion.offsetHeight);
    medicion.remove();

    if (!anchoTotal || !altoTotal) return;
    const escala = Math.min(1, anchoDisponible / anchoTotal, altoDisponible / altoTotal);
    escena.style.setProperty("--escala-ticket", String(Math.max(0.01, escala)));
  }

  function solicitarAjuste(): void {
    if (ajustePendiente) window.cancelAnimationFrame(ajustePendiente);
    ajustePendiente = window.requestAnimationFrame(() => {
      ajustePendiente = 0;
      ajustarVistaCompleta();
    });
  }

  function limpiarTemporizadores(): void {
    pendientes.forEach((temporizador) => window.clearTimeout(temporizador));
    pendientes = [];
  }

  function despues(funcion: () => void, milisegundos: number): void {
    pendientes.push(window.setTimeout(funcion, milisegundos));
  }

  function etapa(nombre: string, titulo: string, subtitulo: string, etiqueta: string): void {
    escena.dataset["estado"] = nombre;
    estado.textContent = titulo;
    detalle.textContent = subtitulo;
    indicador.textContent = etiqueta;
  }

  function importe(valor: string): string {
    return formatoImporte.format(Number(valor));
  }

  function crearRenglon(renglon: Renglon): HTMLElement {
    const articulo = document.createElement("div");
    articulo.className = "ticket-venta__item";
    const nombre = document.createElement("strong");
    nombre.textContent = renglon.titulo;
    const linea = document.createElement("div");
    linea.className = "ticket-venta__item-detalle";
    const unidades = document.createElement("span");
    unidades.textContent = `${renglon.cantidad} × ${importe(renglon.precio_unitario)}`;
    const subtotal = document.createElement("span");
    subtotal.textContent = importe(renglon.subtotal);
    linea.append(unidades, subtotal);
    articulo.append(nombre, linea);
    return articulo;
  }

  function rellenar(venta: Venta): void {
    const codigo = codigoDeVenta(venta.id);
    elementoPorId("ticket-venta-id", HTMLElement).textContent = codigo;
    elementoPorId("ticket-venta-codigo", HTMLElement).textContent = codigo.toUpperCase();
    elementoPorId("ticket-venta-cliente", HTMLElement).textContent = venta.cliente.nombre;
    elementoPorId("ticket-venta-fecha", HTMLElement).textContent = formatoFecha.format(new Date(venta.fecha));
    const lista = elementoPorId("ticket-venta-renglones", HTMLElement);
    lista.replaceChildren();
    for (const renglon of venta.renglones) lista.appendChild(crearRenglon(renglon));
    elementoPorId("ticket-venta-total", HTMLElement).textContent = importe(venta.total);
    // Una copia separada permite imprimir solo el comprobante, incluso si el modal está abierto.
    const copia = elementoPorId("ticket-venta-papel", HTMLElement).cloneNode(true) as HTMLElement;
    copia.removeAttribute("id");
    copia.querySelectorAll("[id]").forEach((nodo) => nodo.removeAttribute("id"));
    elementoPorId("ticket-venta-impresion", HTMLElement).replaceChildren(copia);
  }

  function completar(): void {
    etapa("listo", "¡Comprobante listo!", "Podés imprimirlo o repetir la animación", "FINALIZADO");
    if (ventaActual) {
      anuncio.textContent = `Venta ${codigoDeVenta(ventaActual.id)} registrada correctamente. Tu comprobante está listo.`;
    }
    repetir.disabled = false;
    imprimir.disabled = false;
    solicitarAjuste();
  }

  function animar(): void {
    if (!ventaActual || !dialogo.open) return;
    limpiarTemporizadores();
    repetir.disabled = true;
    imprimir.disabled = true;
    papel.style.transition = "none";
    etapa("reposo", "Preparando tu ticket…", "Colocando el papel", "PREPARANDO");
    anuncio.textContent = `Preparando el comprobante de la venta ${codigoDeVenta(ventaActual.id)}…`;
    solicitarAjuste();
    // Restablecer el punto de partida para que Repetir funcione.
    void papel.offsetHeight;
    papel.style.removeProperty("transition");
    if (movimientoReducido.matches) {
      completar();
      return;
    }
    despues(() => {
      etapa("procesando", "Procesando comprobante…", "Verificando los datos de la compra", "PROCESANDO");
      despues(() => {
        etapa("imprimiendo", "Imprimiendo tu ticket…", "El papel está saliendo de la impresora", "IMPRIMIENDO");
        if (ventaActual) {
          anuncio.textContent = `Imprimiendo el comprobante de la venta ${codigoDeVenta(ventaActual.id)}…`;
        }
        despues(completar, 3000);
      }, 650);
    }, 80);
  }

  function mostrar(venta: Venta): void {
    rellenar(venta);
    ventaActual = venta;
    if (!dialogo.open) dialogo.showModal();
    solicitarAjuste();
    animar();
  }

  function cerrarModal(): void {
    if (dialogo.open) dialogo.close();
  }

  dialogo.addEventListener("close", () => {
    limpiarTemporizadores();
    if (ajustePendiente) window.cancelAnimationFrame(ajustePendiente);
    ajustePendiente = 0;
  });
  window.addEventListener("resize", solicitarAjuste);
  new ResizeObserver(solicitarAjuste).observe(visor);
  void document.fonts.ready.then(solicitarAjuste);
  cerrar.addEventListener("click", cerrarModal);
  repetir.addEventListener("click", () => {
    if (!repetir.disabled) animar();
  });
  imprimir.addEventListener("click", () => {
    if (!imprimir.disabled) window.print();
  });
  // Cerrar haciendo clic FUERA de la ventana, sin interceptar clics en el ticket.
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) cerrarModal();
  });

  return { mostrar };
}
