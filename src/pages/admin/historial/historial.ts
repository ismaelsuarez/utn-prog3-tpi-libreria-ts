// Vista Historial: ventas confirmadas y detalle de cada una. La única fuente son
// las instantáneas que entrega el repositorio de ventas: no se consulta el
// catálogo ni los clientes, de modo que un cambio posterior de precio no altera
// lo ya confirmado.
import "../../../main";
import { repositorioVentas } from "../../../datos/proveedor";
import { formatearImporte } from "../../../logica/dinero";
import { formatearFecha } from "../../../logica/fecha";
import { codigoDeVenta } from "../../../logica/ventas";
import type { Venta } from "../../../types/venta";
import {
  arrancar,
  buscar,
  elementoPorId,
  mostrarMensaje,
  ocultarMensaje,
  vaciarNodo,
} from "../../../utils/dom";

async function iniciar(): Promise<void> {
  const filasVentas = elementoPorId("filas-ventas", HTMLElement);
  const filasDetalle = elementoPorId("filas-detalle", HTMLElement);
  const tablaVentas = elementoPorId("tabla-ventas", HTMLElement);
  const contenedorVentas = tablaVentas.parentElement;
  const mensajeVacio = elementoPorId("ventas-vacio", HTMLElement);
  const mensajeError = elementoPorId("mensaje-error", HTMLElement);
  const detalle = elementoPorId("detalle-venta", HTMLElement);
  const tituloDetalle = elementoPorId("detalle-venta-titulo", HTMLElement);
  const totalDetalle = elementoPorId("detalle-total", HTMLElement);
  const plantillaVenta = elementoPorId("plantilla-fila-venta", HTMLTemplateElement);
  const plantillaDetalle = elementoPorId("plantilla-fila-detalle", HTMLTemplateElement);
  if (!contenedorVentas) throw new Error("Falta el contenedor de la tabla de ventas.");

  function mostrarDetalle(venta: Venta): void {
    vaciarNodo(filasDetalle);
    for (const renglon of venta.renglones) {
      const fragmento = plantillaDetalle.content.cloneNode(true) as DocumentFragment;
      const libro =
        renglon.isbn === undefined ? renglon.titulo : `${renglon.titulo} · ISBN ${renglon.isbn}`;
      buscar(fragmento, '[data-campo="libro"]', HTMLElement).textContent = libro;
      buscar(fragmento, '[data-campo="cantidad"]', HTMLElement).textContent = String(renglon.cantidad);
      buscar(fragmento, '[data-campo="precio-unitario"]', HTMLElement).textContent = formatearImporte(renglon.precio_unitario);
      buscar(fragmento, '[data-campo="subtotal"]', HTMLElement).textContent = formatearImporte(renglon.subtotal);
      filasDetalle.appendChild(fragmento);
    }
    tituloDetalle.textContent = `Detalle de la venta ${codigoDeVenta(venta.id)}`;
    totalDetalle.textContent = formatearImporte(venta.total);
    detalle.hidden = false;
    tituloDetalle.focus();
  }

  function pintarVenta(venta: Venta): void {
    const fragmento = plantillaVenta.content.cloneNode(true) as DocumentFragment;
    const codigo = codigoDeVenta(venta.id);
    buscar(fragmento, '[data-campo="identificador"]', HTMLElement).textContent = codigo;
    buscar(fragmento, '[data-campo="fecha"]', HTMLElement).textContent = formatearFecha(venta.fecha);
    buscar(fragmento, '[data-campo="cliente"]', HTMLElement).textContent = venta.cliente.nombre;
    buscar(fragmento, '[data-campo="total"]', HTMLElement).textContent = formatearImporte(venta.total);
    const boton = buscar(fragmento, '[data-accion="ver-detalle"]', HTMLButtonElement);
    boton.textContent = `Ver detalle de ${codigo}`;
    boton.setAttribute("aria-controls", "detalle-venta");
    boton.addEventListener("click", () => mostrarDetalle(venta));
    filasVentas.appendChild(fragmento);
  }

  vaciarNodo(filasVentas);
  vaciarNodo(filasDetalle);
  ocultarMensaje(mensajeError);
  ocultarMensaje(mensajeVacio);
  detalle.hidden = true;
  tablaVentas.hidden = true;
  contenedorVentas.hidden = true;
  try {
    // Única fuente: instantáneas guardadas.
    const ventas = await repositorioVentas.listar();
    ventas.forEach(pintarVenta);
    if (ventas.length === 0) {
      mostrarMensaje(mensajeVacio, "No hay ventas confirmadas.");
    } else {
      tablaVentas.hidden = false;
      contenedorVentas.hidden = false;
    }
  } catch {
    vaciarNodo(filasVentas);
    mostrarMensaje(
      mensajeError,
      "No se pudo consultar el historial. Los datos guardados no se modificaron. Revisa el acceso al almacenamiento e inténtalo nuevamente al recargar.",
    );
  }
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
