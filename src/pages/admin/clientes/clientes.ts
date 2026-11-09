// Vista Clientes: alta y listado, siempre a través del repositorio. No hay
// edición ni borrado: la API no permite modificar el perfil y la regla dura 9
// excluye editar registros.
import "../../../main";
import { repositorioClientes } from "../../../datos/proveedor";
import { validarCliente, type BorradorCliente } from "../../../logica/clientes";
import { normalizarEmail } from "../../../logica/texto";
import type { ErrorDeCampo } from "../../../types/formulario";
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

  function controlDe(campo: string): HTMLInputElement {
    return elementoPorId(`cliente-${campo}`, HTMLInputElement);
  }

  function regionDe(campo: string): HTMLElement | null {
    return document.getElementById(`error-cliente-${campo}`);
  }

  async function renderizarListado(): Promise<void> {
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
      cuerpoFilas.appendChild(fragmento);
    }
    const vacio = clientes.length === 0;
    tabla.hidden = vacio;
    mensajeVacio.hidden = !vacio;
  }

  function leerDatos(): BorradorCliente {
    return {
      nombre: controlDe("nombre").value,
      email: controlDe("email").value,
      telefono: controlDe("telefono").value,
    };
  }

  function normalizarDatos(datos: BorradorCliente): Required<Pick<BorradorCliente, "nombre" | "email" | "telefono">> {
    return {
      nombre: datos.nombre.trim(),
      email: normalizarEmail(datos.email),
      telefono: (datos.telefono ?? "").trim().replace(/\s+/g, " "),
    };
  }

  function limpiarErrores(): void {
    for (const campo of CAMPOS) {
      const region = regionDe(campo);
      if (region) region.textContent = "";
      controlDe(campo).removeAttribute("aria-invalid");
    }
    ocultarMensaje(mensajeError);
    ocultarMensaje(mensajeEstado);
  }

  function mostrarErrores(errores: readonly ErrorDeCampo[]): void {
    for (const error of errores) {
      const region = regionDe(error.campo);
      if (region) mostrarMensaje(region, error.mensaje);
      document.getElementById(`cliente-${error.campo}`)?.setAttribute("aria-invalid", "true");
    }
    mostrarMensaje(mensajeError, "Revisá los campos marcados. No se registró el cliente.");
    const primero = errores[0];
    if (primero) document.getElementById(`cliente-${primero.campo}`)?.focus();
  }

  async function registrar(): Promise<void> {
    limpiarErrores();
    const datos = leerDatos();
    const errores = validarCliente(datos, await repositorioClientes.listar());
    if (errores.length > 0) {
      mostrarErrores(errores);
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

  await renderizarListado();
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
