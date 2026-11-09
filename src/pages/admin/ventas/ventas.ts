// Vista Ventas: borrador de la venta con la lógica pura, confirmación por el
// repositorio de ventas y comprobante con la venta devuelta por la API (con los
// importes que calculó el servidor). Clientes y libros se leen una sola vez al
// abrir; componer el borrador no hace solicitudes. El borrador se conserva ante
// cualquier error.
import "../../../main";
import { repositorioClientes, repositorioLibros, repositorioVentas } from "../../../datos/proveedor";
import { formatearImporte } from "../../../logica/dinero";
import { crearEnvioUnico } from "../../../logica/envio-unico";
import {
  CAMPOS_DE_VENTA,
  describirFallo,
  type FalloDeOperacion,
} from "../../../logica/errores-de-formulario";
import {
  agregarRenglon,
  cambiarCantidad,
  calcularVenta,
  codigoDeVenta,
  mensajeDeVentaFallida,
  quitarRenglon,
  validarVenta,
  ventaNuevaDesdeBorrador,
  type LibroVendible,
  type RenglonBorrador,
  type RenglonCalculado,
  type ResultadoCalculo,
} from "../../../logica/ventas";
import type { ErrorDeCampo } from "../../../types/formulario";
import type { Cliente } from "../../../types/cliente";
import type { Id } from "../../../types/primitivos";
import type { Venta } from "../../../types/venta";
import {
  arrancar,
  buscar,
  elementoPorId,
  idDeValor,
  llenarSelect,
  mostrarMensaje,
  ocultarMensaje,
} from "../../../utils/dom";
import { iniciarComprobante } from "./ticket-venta";

type CalculoCorrecto = Extract<ResultadoCalculo, { ok: true }>;

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-venta", HTMLFormElement);
  const cliente = elementoPorId("venta-cliente", HTMLSelectElement);
  const libro = elementoPorId("venta-libro", HTMLSelectElement);
  const cantidad = elementoPorId("venta-cantidad", HTMLInputElement);
  const agregar = elementoPorId("boton-agregar-renglon", HTMLButtonElement);
  const confirmar = elementoPorId("boton-confirmar-venta", HTMLButtonElement);
  const filas = elementoPorId("filas-renglones", HTMLElement);
  const plantilla = elementoPorId("plantilla-fila-renglon", HTMLTemplateElement);
  const vacio = elementoPorId("renglones-vacio", HTMLElement);
  const total = elementoPorId("venta-total", HTMLElement);
  const estado = elementoPorId("mensaje-estado", HTMLElement);
  const errorGeneral = elementoPorId("mensaje-error", HTMLElement);
  const controles: Readonly<Record<string, HTMLElement>> = { cliente, libro, cantidad };
  const comprobante = iniciarComprobante();
  let renglones: RenglonCalculado[] = [];
  let numeroFila = 0;
  let ultimaVentaConfirmada: Venta | null = null;
  // Lo que leyó la API al abrir; no se vuelve a pedir mientras se compone la venta.
  let clientes: Cliente[] = [];
  let libros: LibroVendible[] = [];
  const confirmarUnaVez = crearEnvioUnico((enCurso) => {
    confirmar.disabled = enCurso;
  });

  function limpiarMensajes(): void {
    ocultarMensaje(estado);
    ocultarMensaje(errorGeneral);
    for (const [campo, control] of Object.entries(controles)) {
      control.removeAttribute("aria-invalid");
      const region = document.getElementById(`error-venta-${campo}`);
      if (region) ocultarMensaje(region);
    }
  }

  function mostrarErrores(errores: readonly ErrorDeCampo[]): void {
    for (const error of errores) {
      const control = controles[error.campo];
      const region = document.getElementById(`error-venta-${error.campo}`);
      if (control && region) {
        control.setAttribute("aria-invalid", "true");
        mostrarMensaje(region, error.mensaje);
      }
    }
    mostrarMensaje(errorGeneral, errores.map((error) => error.mensaje).join(" "));
    const primero = errores[0];
    (controles[primero?.campo ?? ""] ?? agregar).focus();
  }

  function informarFallo(): void {
    ocultarMensaje(estado);
    mostrarMensaje(errorGeneral, "No se pudo completar la acción. El borrador se conserva. Intentá nuevamente.");
  }

  /** Rechazo o falta de respuesta de la API: no se anuncia éxito y el borrador permanece. */
  function mostrarFalloDeVenta(fallo: FalloDeOperacion): void {
    ocultarMensaje(estado);
    if (fallo.porCampo.length > 0) mostrarErrores(fallo.porCampo);
    mostrarMensaje(errorGeneral, mensajeDeVentaFallida(fallo));
  }

  function filaDe(libroId: Id): HTMLElement | undefined {
    return Array.from(filas.children)
      .filter((fila): fila is HTMLElement => fila instanceof HTMLElement)
      .find((fila) => fila.dataset["libroId"] === String(libroId));
  }

  function renderizar(resultado: CalculoCorrecto): void {
    renglones = resultado.renglones;
    for (const fila of Array.from(filas.children)) {
      if (
        fila instanceof HTMLElement &&
        !renglones.some((renglon) => String(renglon.libro_id) === fila.dataset["libroId"])
      ) {
        fila.remove();
      }
    }
    for (const renglon of renglones) {
      let fila = filaDe(renglon.libro_id);
      if (!fila) {
        const fragmento = plantilla.content.cloneNode(true) as DocumentFragment;
        fila = buscar(fragmento, "tr", HTMLElement);
        fila.dataset["libroId"] = String(renglon.libro_id);
        numeroFila += 1;
        const error = buscar(fila, '[data-campo="error-cantidad"]', HTMLElement);
        error.id = `error-renglon-${numeroFila}`;
        buscar(fila, '[data-campo="cantidad"]', HTMLInputElement).setAttribute("aria-describedby", error.id);
        filas.appendChild(fila);
      }
      fila.querySelectorAll('[data-campo="libro"]').forEach((nodo) => {
        nodo.textContent = renglon.titulo;
      });
      const control = buscar(fila, '[data-campo="cantidad"]', HTMLInputElement);
      // No reemplazar controles ni borrar una edición inválida al actualizar otra fila.
      if (!control.hasAttribute("aria-invalid") && document.activeElement !== control) {
        control.value = String(renglon.cantidad);
      }
      buscar(fila, '[data-campo="precio-unitario"]', HTMLElement).textContent = formatearImporte(renglon.precio_unitario);
      buscar(fila, '[data-campo="subtotal"]', HTMLElement).textContent = formatearImporte(renglon.subtotal);
    }
    total.textContent = formatearImporte(resultado.total);
    vacio.hidden = renglones.length !== 0;
  }

  function hayEdicionInvalida(): boolean {
    const invalido = filas.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!invalido) return false;
    mostrarMensaje(errorGeneral, "Corrija la cantidad marcada o quite ese renglón antes de continuar.");
    invalido.focus();
    return true;
  }

  function agregarAlBorrador(): void {
    limpiarMensajes();
    if (hayEdicionInvalida()) return;
    const resultado = agregarRenglon(renglones, idDeValor(libro.value) ?? 0, cantidad.value, libros);
    if (!resultado.ok) {
      mostrarErrores(resultado.errores);
      return;
    }
    renderizar(resultado);
    ultimaVentaConfirmada = null; // Inició o modificó una nueva operación.
    cantidad.value = "1";
    mostrarMensaje(estado, "Renglón actualizado correctamente.");
  }

  agregar.addEventListener("click", () => {
    try {
      agregarAlBorrador();
    } catch {
      informarFallo();
    }
  });

  function cambiarCantidadDeFila(control: HTMLInputElement, fila: HTMLElement): void {
    const aviso = buscar(fila, '[data-campo="error-cantidad"]', HTMLElement);
    try {
      const resultado = cambiarCantidad(renglones, Number(fila.dataset["libroId"]), control.value, libros);
      if (!resultado.ok) {
        control.setAttribute("aria-invalid", "true");
        mostrarMensaje(aviso, resultado.errores.map((error) => error.mensaje).join(" "));
        mostrarMensaje(
          errorGeneral,
          "Hay una cantidad inválida. Corríjala o quite el renglón; los importes conservan el último cálculo válido.",
        );
        return;
      }
      control.removeAttribute("aria-invalid");
      ocultarMensaje(aviso);
      renderizar(resultado);
    } catch {
      control.setAttribute("aria-invalid", "true");
      mostrarMensaje(aviso, "No se pudo comprobar esta cantidad. Intente nuevamente.");
      informarFallo();
    }
  }

  filas.addEventListener("input", (evento) => {
    const control = evento.target;
    if (!(control instanceof HTMLInputElement) || control.dataset["campo"] !== "cantidad") return;
    limpiarMensajes();
    const fila = control.closest("tr");
    if (!fila) return;
    cambiarCantidadDeFila(control, fila);
  });

  function quitarDeFila(fila: HTMLElement): void {
    const siguiente = fila.nextElementSibling ?? fila.previousElementSibling;
    const resultado = quitarRenglon(renglones, Number(fila.dataset["libroId"]), libros);
    if (!resultado.ok) {
      mostrarErrores(resultado.errores);
      return;
    }
    renderizar(resultado);
    const destino = siguiente?.querySelector<HTMLElement>('[data-campo="cantidad"]') ?? libro;
    destino.focus();
    mostrarMensaje(estado, "Renglón quitado de la venta.");
  }

  filas.addEventListener("click", (evento) => {
    const destino = evento.target instanceof Element ? evento.target : null;
    const boton = destino?.closest<HTMLElement>('[data-accion="quitar-renglon"]');
    if (!boton) return;
    limpiarMensajes();
    const fila = boton.closest("tr");
    if (!fila) return;
    try {
      quitarDeFila(fila);
    } catch {
      informarFallo();
    }
  });

  async function confirmarVenta(): Promise<void> {
    // Al finalizar una venta se limpia el borrador. Un segundo envío (doble clic
    // o Enter) NO puede convertir el éxito anterior en «cliente inexistente».
    if (ultimaVentaConfirmada && renglones.length === 0 && cliente.value === "") {
      ocultarMensaje(errorGeneral);
      mostrarMensaje(
        estado,
        `Venta ${codigoDeVenta(ultimaVentaConfirmada.id)} ya registrada correctamente. ` +
          "Podés consultarla en Historial. Para otra venta, elegí un cliente y agregá libros.",
      );
      return;
    }

    limpiarMensajes();
    if (hayEdicionInvalida()) return;

    const clienteId = idDeValor(cliente.value);
    const entradas: RenglonBorrador[] = renglones.map((renglon) => {
      const fila = filaDe(renglon.libro_id);
      if (!fila) throw new Error(`Falta la fila del libro ${renglon.libro_id}.`);
      return {
        libro_id: renglon.libro_id,
        cantidad: buscar(fila, '[data-campo="cantidad"]', HTMLInputElement).value,
      };
    });
    const errores = validarVenta(clienteId, entradas, clientes, libros);
    if (errores.length > 0) {
      mostrarErrores(errores);
      return;
    }
    const calculada = calcularVenta(entradas, libros);
    if (!calculada.ok || clienteId === null) {
      mostrarErrores(calculada.errores);
      return;
    }
    renderizar(calculada);

    let guardada: Venta;
    try {
      guardada = await repositorioVentas.crear(ventaNuevaDesdeBorrador(clienteId, renglones));
    } catch (error) {
      // Rechazo o falta de respuesta: el borrador queda y no se reenvía solo.
      mostrarFalloDeVenta(describirFallo(error, CAMPOS_DE_VENTA));
      return;
    }

    // Desde este punto la venta YA está guardada. Nada visual puede anularla.
    ultimaVentaConfirmada = guardada;
    const codigo = codigoDeVenta(guardada.id);
    try {
      formulario.reset();
      renderizar({ ok: true, errores: [], renglones: [], total: "0.00" });
    } catch {
      mostrarMensaje(estado, `Venta ${codigo} registrada correctamente en Historial.`);
      return;
    }
    mostrarMensaje(estado, `Venta ${codigo} registrada correctamente. El comprobante está disponible.`);
    try {
      comprobante.mostrar(guardada);
    } catch {
      mostrarMensaje(
        estado,
        `Venta ${codigo} registrada correctamente. No se pudo mostrar el ticket, pero la venta sigue disponible en Historial.`,
      );
    }
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    confirmarUnaVez(confirmarVenta).catch(informarFallo);
  });

  // Una sola lectura al abrir. Si falla, el error lo muestra `arrancar` y los
  // botones quedan deshabilitados: sin las listas no se puede confirmar una venta.
  agregar.disabled = true;
  confirmar.disabled = true;
  [clientes, libros] = await Promise.all([repositorioClientes.listar(), repositorioLibros.listar()]);
  llenarSelect(cliente, "Elegir un cliente", clientes);
  llenarSelect(
    libro,
    "Elegir un libro",
    libros.map((registro) => ({ id: registro.id, nombre: registro.titulo })),
  );
  agregar.disabled = false;
  confirmar.disabled = false;
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
