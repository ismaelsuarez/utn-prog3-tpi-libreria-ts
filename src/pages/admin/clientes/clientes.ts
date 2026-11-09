// Vista Clientes: alta, listado y edición de los datos de contacto, siempre a
// través del repositorio. La edición conserva el identificador y, con él, el
// vínculo de las ventas anteriores.
import "../../../main";
import { repositorioClientes } from "../../../datos/proveedor";
import { validarCliente, type BorradorCliente } from "../../../logica/clientes";
import { normalizarEmail } from "../../../logica/texto";
import type { ErrorDeCampo } from "../../../types/formulario";
import type { Id } from "../../../types/primitivos";
import {
  arrancar,
  buscar,
  elementoPorId,
  mostrarMensaje,
  ocultarMensaje,
  vaciarNodo,
} from "../../../utils/dom";

const CAMPOS = ["nombre", "email", "telefono"] as const;

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-cliente", HTMLFormElement);
  const mensajeError = elementoPorId("mensaje-error", HTMLElement);
  const mensajeEstado = elementoPorId("mensaje-estado", HTMLElement);
  const cuerpoFilas = elementoPorId("filas-clientes", HTMLElement);
  const mensajeVacio = elementoPorId("clientes-vacio", HTMLElement);
  const tabla = elementoPorId("tabla-clientes", HTMLElement);
  const plantillaFila = elementoPorId("plantilla-fila-cliente", HTMLTemplateElement);

  const dialogo = elementoPorId("dialogo-editar-cliente", HTMLDialogElement);
  const formularioEdicion = elementoPorId("form-editar-cliente", HTMLFormElement);
  const errorEdicion = elementoPorId("mensaje-error-edicion", HTMLElement);
  let clienteEnEdicion: Id | null = null;

  // Evita duplicar validaciones entre el formulario de alta y el modal.
  function controlDe(campo: string, edicion: boolean): HTMLInputElement {
    return elementoPorId(`${edicion ? "editar-cliente-" : "cliente-"}${campo}`, HTMLInputElement);
  }

  function regionDe(campo: string, edicion: boolean): HTMLElement | null {
    return document.getElementById(`${edicion ? "error-editar-cliente-" : "error-cliente-"}${campo}`);
  }

  async function renderizarListado(): Promise<void> {
    // SIN ENDPOINT en la API: el listado de clientes lo resuelve `operaciones-contra-api`.
    const clientes = await repositorioClientes.listar();
    vaciarNodo(cuerpoFilas);
    for (const cliente of clientes) {
      const fragmento = plantillaFila.content.cloneNode(true) as DocumentFragment;
      const fila = buscar(fragmento, "tr", HTMLElement);
      fila.dataset.clienteId = String(cliente.id);
      buscar(fila, '[data-campo="nombre"]', HTMLElement).textContent = cliente.nombre;
      buscar(fila, '[data-campo="email"]', HTMLElement).textContent = cliente.email;
      buscar(fila, '[data-campo="telefono"]', HTMLElement).textContent =
        cliente.perfil?.telefono || "—";
      const boton = buscar(fila, '[data-accion="editar-cliente"]', HTMLButtonElement);
      boton.dataset.clienteId = String(cliente.id);
      boton.setAttribute("aria-label", `Editar datos de ${cliente.nombre}`);
      cuerpoFilas.appendChild(fragmento);
    }
    const vacio = clientes.length === 0;
    tabla.hidden = vacio;
    mensajeVacio.hidden = !vacio;
  }

  function leerDatos(edicion: boolean): BorradorCliente {
    return {
      nombre: controlDe("nombre", edicion).value,
      email: controlDe("email", edicion).value,
      telefono: controlDe("telefono", edicion).value,
    };
  }

  function normalizarDatos(datos: BorradorCliente): Required<Pick<BorradorCliente, "nombre" | "email" | "telefono">> {
    return {
      nombre: datos.nombre.trim(),
      email: normalizarEmail(datos.email),
      telefono: (datos.telefono ?? "").trim().replace(/\s+/g, " "),
    };
  }

  function limpiarErrores(edicion: boolean): void {
    for (const campo of CAMPOS) {
      const region = regionDe(campo, edicion);
      if (region) region.textContent = "";
      controlDe(campo, edicion).removeAttribute("aria-invalid");
    }
    ocultarMensaje(edicion ? errorEdicion : mensajeError);
    if (!edicion) ocultarMensaje(mensajeEstado);
  }

  function mostrarErrores(errores: readonly ErrorDeCampo[], edicion: boolean): void {
    for (const error of errores) {
      const region = regionDe(error.campo, edicion);
      if (region) mostrarMensaje(region, error.mensaje);
      document
        .getElementById(`${edicion ? "editar-cliente-" : "cliente-"}${error.campo}`)
        ?.setAttribute("aria-invalid", "true");
    }
    mostrarMensaje(
      edicion ? errorEdicion : mensajeError,
      `Revisá los campos marcados. No se ${edicion ? "guardaron los cambios." : "registró el cliente."}`,
    );
    const primero = errores[0];
    if (primero) document.getElementById(`${edicion ? "editar-cliente-" : "cliente-"}${primero.campo}`)?.focus();
  }

  // Alta: se mantiene independiente de la edición.
  async function registrar(): Promise<void> {
    limpiarErrores(false);
    const datos = leerDatos(false);
    const errores = validarCliente(datos, await repositorioClientes.listar());
    if (errores.length > 0) {
      mostrarErrores(errores, false);
      return;
    }
    const limpio = normalizarDatos(datos);
    const cliente = await repositorioClientes.crear({ nombre: limpio.nombre, email: limpio.email });
    await repositorioClientes.crearPerfil(cliente.id, { telefono: limpio.telefono });
    await renderizarListado();
    formulario.reset();
    mostrarMensaje(mensajeEstado, "Cliente registrado correctamente.");
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    registrar().catch(() => {
      mostrarMensaje(
        mensajeError,
        "No se pudo guardar el cliente. Comprobá el almacenamiento e intentá nuevamente.",
      );
    });
  });

  async function abrirEdicion(id: Id): Promise<void> {
    const cliente = (await repositorioClientes.listar()).find((registro) => registro.id === id);
    if (!cliente) {
      mostrarMensaje(mensajeError, "No se encontró ese cliente. Actualizá la página e intentá nuevamente.");
      return;
    }
    clienteEnEdicion = id;
    limpiarErrores(true);
    controlDe("nombre", true).value = cliente.nombre;
    controlDe("email", true).value = cliente.email;
    controlDe("telefono", true).value = cliente.perfil?.telefono ?? "";
    if (!dialogo.open) dialogo.showModal();
    controlDe("nombre", true).focus();
  }

  cuerpoFilas.addEventListener("click", (evento) => {
    const destino = evento.target instanceof Element ? evento.target : null;
    const boton = destino?.closest<HTMLElement>('[data-accion="editar-cliente"]');
    if (!boton) return;
    ocultarMensaje(mensajeError);
    ocultarMensaje(mensajeEstado);
    abrirEdicion(Number(boton.dataset["clienteId"])).catch(() => {
      clienteEnEdicion = null;
      mostrarMensaje(mensajeError, "No se pudo abrir la edición. Intentá nuevamente.");
    });
  });

  function cerrarEdicion(): void {
    if (dialogo.open) dialogo.close();
  }

  elementoPorId("cancelar-edicion-cliente", HTMLElement).addEventListener("click", cerrarEdicion);
  elementoPorId("cerrar-edicion-cliente", HTMLElement).addEventListener("click", cerrarEdicion);
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) cerrarEdicion();
  });
  dialogo.addEventListener("close", () => {
    clienteEnEdicion = null;
    limpiarErrores(true);
  });

  async function guardarEdicion(id: Id): Promise<void> {
    const datos = leerDatos(true);
    // Al editar, el correo actual no se considera un duplicado propio.
    const errores = validarCliente(datos, await repositorioClientes.listar(), id);
    if (errores.length > 0) {
      mostrarErrores(errores, true);
      return;
    }
    const limpio = normalizarDatos(datos);
    await repositorioClientes.actualizar(id, { nombre: limpio.nombre, email: limpio.email });
    // SIN ENDPOINT en la API: la edición del teléfono la resuelve `operaciones-contra-api`.
    await repositorioClientes.actualizarTelefono(id, limpio.telefono);
    await renderizarListado();
    cerrarEdicion();
    mostrarMensaje(mensajeEstado, "Los datos del cliente se actualizaron correctamente.");
    const botonActualizado = Array.from(
      cuerpoFilas.querySelectorAll<HTMLElement>('[data-accion="editar-cliente"]'),
    ).find((boton) => boton.dataset["clienteId"] === String(id));
    botonActualizado?.focus();
  }

  formularioEdicion.addEventListener("submit", (evento) => {
    evento.preventDefault();
    limpiarErrores(true);
    if (clienteEnEdicion === null) return;
    guardarEdicion(clienteEnEdicion).catch(() => {
      mostrarMensaje(
        errorEdicion,
        "No se pudieron guardar los cambios. Verificá el almacenamiento e intentá nuevamente.",
      );
    });
  });

  await renderizarListado();
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
