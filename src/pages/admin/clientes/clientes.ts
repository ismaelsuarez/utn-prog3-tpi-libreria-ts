// Vista Clientes: alta con perfil, «Completar perfil» y listado, siempre a
// través del repositorio. No hay edición ni borrado: la API no permite
// modificar el perfil y la regla dura 9 excluye editar registros. El listado se
// lee al abrir y después de cada escritura.
import "../../../main";
import { repositorioClientes } from "../../../datos/proveedor";
import {
  mensajeDePerfilFallido,
  perfilNuevoDesdeBorrador,
  registrarClienteConPerfil,
  validarCliente,
  validarPerfil,
  type BorradorCliente,
  type BorradorPerfil,
} from "../../../logica/clientes";
import { crearEnvioUnico } from "../../../logica/envio-unico";
import { describirFallo, type FalloDeOperacion } from "../../../logica/errores-de-formulario";
import { conPuntoFinal } from "../../../logica/texto";
import type { Cliente } from "../../../types/cliente";
import {
  arrancar,
  buscar,
  elementoPorId,
  limpiarErroresDeCampos,
  mostrarErroresDeCampos,
  mostrarMensaje,
  ocultarMensaje,
  textoDeError,
  vaciarNodo,
} from "../../../utils/dom";

const CAMPOS_ALTA = ["nombre", "email", "telefono", "direccion"] as const;
const CAMPOS_PERFIL = ["telefono", "direccion"] as const;
const SIN_DATO = "—";

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-cliente", HTMLFormElement);
  const botonRegistrar = elementoPorId("boton-registrar-cliente", HTMLButtonElement);
  const mensajeError = elementoPorId("mensaje-error", HTMLElement);
  const mensajeEstado = elementoPorId("mensaje-estado", HTMLElement);
  const cuerpoFilas = elementoPorId("filas-clientes", HTMLElement);
  const mensajeVacio = elementoPorId("clientes-vacio", HTMLElement);
  const tabla = elementoPorId("tabla-clientes", HTMLElement);
  const tituloListado = elementoPorId("titulo-listado-clientes", HTMLElement);
  const plantillaFila = elementoPorId("plantilla-fila-cliente", HTMLTemplateElement);
  const dialogo = elementoPorId("dialogo-perfil-cliente", HTMLDialogElement);
  const formularioPerfil = elementoPorId("form-perfil-cliente", HTMLFormElement);
  const descripcionPerfil = elementoPorId("descripcion-perfil-cliente", HTMLElement);
  const mensajeErrorPerfil = elementoPorId("mensaje-error-perfil", HTMLElement);
  const botonGuardarPerfil = elementoPorId("boton-guardar-perfil", HTMLButtonElement);

  let clientes: Cliente[] = [];
  let clienteEnPerfil: Cliente | null = null;

  const registrarUnaVez = crearEnvioUnico((enCurso) => {
    botonRegistrar.disabled = enCurso;
  });
  const guardarPerfilUnaVez = crearEnvioUnico((enCurso) => {
    botonGuardarPerfil.disabled = enCurso;
  });

  function pintarListado(): void {
    vaciarNodo(cuerpoFilas);
    for (const cliente of clientes) {
      const fragmento = plantillaFila.content.cloneNode(true) as DocumentFragment;
      const fila = buscar(fragmento, "tr", HTMLElement);
      fila.dataset["clienteId"] = String(cliente.id);
      buscar(fila, '[data-campo="nombre"]', HTMLElement).textContent = cliente.nombre;
      buscar(fila, '[data-campo="email"]', HTMLElement).textContent = cliente.email;
      buscar(fila, '[data-campo="telefono"]', HTMLElement).textContent = cliente.perfil?.telefono || SIN_DATO;
      buscar(fila, '[data-campo="direccion"]', HTMLElement).textContent = cliente.perfil?.direccion || SIN_DATO;
      if (cliente.perfil === null) {
        // Sin perfil: se puede completar una única vez. Con perfil, ningún control.
        const boton = buscar(fila, '[data-accion="completar-perfil"]', HTMLButtonElement);
        boton.textContent = `Completar perfil de ${cliente.nombre}`;
        boton.hidden = false;
      }
      cuerpoFilas.appendChild(fragmento);
    }
    const vacio = clientes.length === 0;
    tabla.hidden = vacio;
    mensajeVacio.hidden = !vacio;
  }

  /** Vuelve a leer el listado; `false` si la lectura falla (queda el anterior). */
  async function releerListado(): Promise<boolean> {
    try {
      clientes = await repositorioClientes.listar();
    } catch {
      return false;
    }
    pintarListado();
    return true;
  }

  function leerDatos(): BorradorCliente {
    const valor = (id: string): string => elementoPorId(id, HTMLInputElement).value;
    return {
      nombre: valor("cliente-nombre"),
      email: valor("cliente-email"),
      telefono: valor("cliente-telefono"),
      direccion: valor("cliente-direccion"),
    };
  }

  function limpiarMensajes(): void {
    limpiarErroresDeCampos("cliente", CAMPOS_ALTA, mensajeError);
    ocultarMensaje(mensajeEstado);
  }

  function mostrarRechazo(fallo: FalloDeOperacion): void {
    if (fallo.porCampo.length > 0) {
      mostrarErroresDeCampos(
        "cliente",
        fallo.porCampo,
        mensajeError,
        "Revisá los campos marcados. No se registró el cliente.",
      );
    }
    if (fallo.deLaOperacion !== null) {
      const resumen = fallo.porCampo.length > 0 ? `${mensajeError.textContent ?? ""} ` : "";
      mostrarMensaje(mensajeError, `${resumen}No se registró el cliente. ${conPuntoFinal(fallo.deLaOperacion)}`.trim());
    }
  }

  async function registrar(): Promise<void> {
    limpiarMensajes();
    const datos = leerDatos();
    const errores = validarCliente(datos, clientes);
    if (errores.length > 0) {
      mostrarErroresDeCampos(
        "cliente",
        errores,
        mensajeError,
        "Revisá los campos marcados. No se registró el cliente.",
      );
      return;
    }

    const resultado = await registrarClienteConPerfil(repositorioClientes, datos);
    switch (resultado.tipo) {
      case "completo": {
        const releido = await releerListado();
        formulario.reset();
        mostrarMensaje(
          mensajeEstado,
          releido
            ? "Cliente registrado correctamente."
            : "Cliente registrado correctamente. No se pudo actualizar el listado; recargá la página.",
        );
        return;
      }
      case "sin-perfil": {
        // El cliente ya existe: no se repite ningún alta y se ofrece «Completar perfil».
        await releerListado();
        formulario.reset();
        mostrarMensaje(mensajeError, mensajeDePerfilFallido(resultado.error));
        return;
      }
      case "rechazado": {
        const fallo = describirFallo(resultado.error, {}, "email");
        if (fallo.resultadoIncierto) {
          // No se anuncia éxito ni se reintenta: se muestra lo que quedó en la API.
          const releido = await releerListado();
          mostrarMensaje(
            mensajeError,
            `${conPuntoFinal(fallo.deLaOperacion ?? "")} ` +
              (releido
                ? "Se volvió a leer el listado: comprobá si el cliente figura antes de reintentar."
                : "Tampoco se pudo volver a leer el listado."),
          );
          return;
        }
        mostrarRechazo(fallo);
        return;
      }
    }
  }

  function abrirPerfil(cliente: Cliente): void {
    clienteEnPerfil = cliente;
    formularioPerfil.reset();
    limpiarErroresDeCampos("perfil", CAMPOS_PERFIL, mensajeErrorPerfil);
    descripcionPerfil.textContent =
      `Cliente: ${cliente.nombre} (${cliente.email}). ` +
      "El teléfono y la dirección se guardan una sola vez: después no se pueden modificar.";
    dialogo.showModal();
    elementoPorId("perfil-telefono", HTMLInputElement).focus();
  }

  function cerrarPerfil(): void {
    if (dialogo.open) dialogo.close();
    clienteEnPerfil = null;
  }

  async function guardarPerfil(): Promise<void> {
    const cliente = clienteEnPerfil;
    if (cliente === null) return;
    limpiarErroresDeCampos("perfil", CAMPOS_PERFIL, mensajeErrorPerfil);
    const datos: BorradorPerfil = {
      telefono: elementoPorId("perfil-telefono", HTMLInputElement).value,
      direccion: elementoPorId("perfil-direccion", HTMLInputElement).value,
    };
    const errores = validarPerfil(datos);
    if (errores.length > 0) {
      mostrarErroresDeCampos("perfil", errores, mensajeErrorPerfil, "Revisá los campos marcados. No se guardó el perfil.");
      return;
    }

    try {
      await repositorioClientes.crearPerfil(cliente.id, perfilNuevoDesdeBorrador(datos));
    } catch (error) {
      const fallo = describirFallo(error, {});
      if (fallo.resultadoIncierto || fallo.estado === 409) {
        // El perfil puede existir ya: se cierra, se muestra el motivo y se lee lo que quedó.
        cerrarPerfil();
        const releido = await releerListado();
        mostrarMensaje(
          mensajeError,
          `${conPuntoFinal(fallo.deLaOperacion ?? "")} ` +
            (releido ? "Se volvió a leer el listado." : "Tampoco se pudo volver a leer el listado."),
        );
        tituloListado.focus();
        return;
      }
      if (fallo.porCampo.length > 0) {
        mostrarErroresDeCampos("perfil", fallo.porCampo, mensajeErrorPerfil, "Revisá los campos marcados. No se guardó el perfil.");
      }
      if (fallo.deLaOperacion !== null) {
        mostrarMensaje(mensajeErrorPerfil, `No se guardó el perfil. ${conPuntoFinal(fallo.deLaOperacion)}`);
      }
      return;
    }

    cerrarPerfil();
    const releido = await releerListado();
    ocultarMensaje(mensajeError);
    mostrarMensaje(
      mensajeEstado,
      releido
        ? `Perfil de ${cliente.nombre} completado correctamente.`
        : `Perfil de ${cliente.nombre} guardado. No se pudo actualizar el listado; recargá la página.`,
    );
    tituloListado.focus();
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    registrarUnaVez(registrar).catch((error: unknown) => {
      mostrarMensaje(mensajeError, `No se pudo registrar el cliente. ${textoDeError(error)}`);
    });
  });

  cuerpoFilas.addEventListener("click", (evento) => {
    const destino = evento.target instanceof Element ? evento.target : null;
    const boton = destino?.closest<HTMLElement>('[data-accion="completar-perfil"]');
    const id = boton?.closest("tr")?.dataset["clienteId"];
    const cliente = clientes.find((registro) => String(registro.id) === id);
    if (cliente) abrirPerfil(cliente);
  });

  formularioPerfil.addEventListener("submit", (evento) => {
    evento.preventDefault();
    guardarPerfilUnaVez(guardarPerfil).catch((error: unknown) => {
      mostrarMensaje(mensajeErrorPerfil, `No se pudo guardar el perfil. ${textoDeError(error)}`);
    });
  });
  elementoPorId("cerrar-perfil-cliente", HTMLButtonElement).addEventListener("click", cerrarPerfil);
  elementoPorId("cancelar-perfil-cliente", HTMLButtonElement).addEventListener("click", cerrarPerfil);
  // Escape cierra el diálogo de forma nativa: se suelta también la referencia al cliente.
  dialogo.addEventListener("close", () => {
    clienteEnPerfil = null;
  });

  // Si esta lectura falla, el error lo muestra `arrancar` y el botón queda
  // deshabilitado: sin el listado no se puede comprobar el email repetido.
  clientes = await repositorioClientes.listar();
  pintarListado();
  botonRegistrar.disabled = false;
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
