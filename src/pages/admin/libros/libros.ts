// Vista Libros: formulario de alta, selectores y listado, siempre a través de
// los repositorios. Las listas se leen una vez al abrir la página; solo el
// listado de libros se vuelve a leer después de un alta (o de un resultado
// incierto), para detectar duplicados y mostrar lo que quedó en la API.
import "../../../main";
import {
  repositorioAutores,
  repositorioEditoriales,
  repositorioGeneros,
  repositorioLibros,
} from "../../../datos/proveedor";
import { nombreGenero, nombresAutores } from "../../../logica/catalogo";
import { formatearImporte } from "../../../logica/dinero";
import { crearEnvioUnico } from "../../../logica/envio-unico";
import {
  CAMPOS_DE_LIBRO,
  describirFallo,
  type FalloDeOperacion,
} from "../../../logica/errores-de-formulario";
import {
  libroNuevoDesdeBorrador,
  validarLibro,
  type BorradorLibro,
  type CatalogosDeLibros,
} from "../../../logica/libros";
import type { Autor } from "../../../types/autor";
import type { ErrorDeCampo } from "../../../types/formulario";
import type { LibroDetalle } from "../../../types/libro";
import {
  arrancar,
  buscar,
  elementoPorId,
  idDeValor,
  llenarSelect,
  mostrarMensaje,
  ocultarMensaje,
  textoDeError,
  vaciarNodo,
} from "../../../utils/dom";

// Cada clave se corresponde 1:1 con su región #error-libro-<campo> del HTML.
const CAMPOS = ["titulo", "isbn", "precio", "stock", "editorial", "genero", "autores"] as const;

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-libro", HTMLFormElement);
  const botonRegistrar = elementoPorId("boton-registrar-libro", HTMLButtonElement);
  const campoTitulo = elementoPorId("libro-titulo", HTMLInputElement);
  const campoIsbn = elementoPorId("libro-isbn", HTMLInputElement);
  const campoPrecio = elementoPorId("libro-precio", HTMLInputElement);
  const campoStock = elementoPorId("libro-stock", HTMLInputElement);
  const campoEditorial = elementoPorId("libro-editorial", HTMLSelectElement);
  const campoGenero = elementoPorId("libro-genero", HTMLSelectElement);
  const grupoAutores = elementoPorId("libro-autores", HTMLFieldSetElement);
  const mensajeError = elementoPorId("mensaje-error", HTMLElement);
  const mensajeEstado = elementoPorId("mensaje-estado", HTMLElement);
  const cuerpoFilas = elementoPorId("filas-libros", HTMLElement);
  const mensajeVacio = elementoPorId("libros-vacio", HTMLElement);
  const tabla = elementoPorId("tabla-libros", HTMLElement);
  const plantillaFila = elementoPorId("plantilla-fila-libro", HTMLTemplateElement);
  const plantillaAutor = elementoPorId("plantilla-opcion-autor", HTMLTemplateElement);

  // Lo que leyó la API al abrir; `null` mientras las opciones no estén completas.
  let catalogos: CatalogosDeLibros | null = null;
  let libros: LibroDetalle[] = [];

  const ejecutarUnaVez = crearEnvioUnico((enCurso) => {
    botonRegistrar.disabled = enCurso;
  });

  function controlDe(campo: string): HTMLElement | null {
    if (campo === "autores") return grupoAutores.querySelector("input");
    return document.getElementById(`libro-${campo}`);
  }

  function regionDe(campo: string): HTMLElement | null {
    return document.getElementById(`error-libro-${campo}`);
  }

  function selectorDeRol(casilla: HTMLInputElement): HTMLSelectElement | null {
    const select = casilla.closest(".grupo-opciones__autor")?.querySelector("select");
    return select instanceof HTMLSelectElement ? select : null;
  }

  // El rol de un autor solo se elige mientras su casilla está marcada.
  function sincronizarRoles(): void {
    for (const casilla of grupoAutores.querySelectorAll<HTMLInputElement>('input[name="autores"]')) {
      const select = selectorDeRol(casilla);
      if (select) select.disabled = !casilla.checked;
    }
  }

  function generarCasillasDeAutores(autores: readonly Autor[]): void {
    // Se conserva la <legend> del fieldset.
    for (const hijo of Array.from(grupoAutores.children)) {
      if (hijo.tagName !== "LEGEND") grupoAutores.removeChild(hijo);
    }
    for (const autor of autores) {
      const fragmento = plantillaAutor.content.cloneNode(true) as DocumentFragment;
      buscar(fragmento, "input", HTMLInputElement).value = String(autor.id);
      buscar(fragmento, '[data-campo="nombre"]', HTMLElement).textContent = autor.nombre;
      buscar(fragmento, '[data-campo="rol"]', HTMLSelectElement).setAttribute(
        "aria-label",
        `Rol de ${autor.nombre}`,
      );
      grupoAutores.appendChild(fragmento);
    }
  }

  function pintarListado(): void {
    vaciarNodo(cuerpoFilas);
    for (const libro of libros) {
      const fragmento = plantillaFila.content.cloneNode(true) as DocumentFragment;
      buscar(fragmento, '[data-campo="titulo"]', HTMLElement).textContent = libro.titulo;
      buscar(fragmento, '[data-campo="isbn"]', HTMLElement).textContent = libro.isbn;
      buscar(fragmento, '[data-campo="editorial"]', HTMLElement).textContent = libro.editorial.nombre;
      buscar(fragmento, '[data-campo="genero"]', HTMLElement).textContent = nombreGenero(libro.genero);
      buscar(fragmento, '[data-campo="autores"]', HTMLElement).textContent = nombresAutores(libro.autores);
      buscar(fragmento, '[data-campo="precio"]', HTMLElement).textContent = formatearImporte(libro.precio);
      cuerpoFilas.appendChild(fragmento);
    }
    const vacio = libros.length === 0;
    tabla.hidden = vacio;
    mensajeVacio.hidden = !vacio;
  }

  /** Vuelve a leer el listado de libros; `false` si la lectura falla (queda el anterior). */
  async function releerListado(): Promise<boolean> {
    try {
      libros = await repositorioLibros.listar();
    } catch {
      return false;
    }
    pintarListado();
    return true;
  }

  function leerBorrador(): BorradorLibro {
    const marcadas = Array.from(
      grupoAutores.querySelectorAll<HTMLInputElement>('input[name="autores"]:checked'),
    );
    return {
      titulo: campoTitulo.value,
      isbn: campoIsbn.value,
      precio: campoPrecio.value,
      stock: campoStock.value,
      editorial_id: idDeValor(campoEditorial.value),
      genero_id: idDeValor(campoGenero.value),
      // El orden de autoría es el de las casillas marcadas, desde 1.
      autores: marcadas.map((casilla, posicion) => ({
        autor_id: Number(casilla.value),
        rol: selectorDeRol(casilla)?.value ?? "autor",
        orden: posicion + 1,
      })),
    };
  }

  function limpiarErrores(): void {
    for (const campo of CAMPOS) {
      const region = regionDe(campo);
      if (region) region.textContent = "";
      controlDe(campo)?.removeAttribute("aria-invalid");
    }
    ocultarMensaje(mensajeError);
    ocultarMensaje(mensajeEstado);
  }

  function mostrarErrores(errores: readonly ErrorDeCampo[]): void {
    for (const error of errores) {
      const region = regionDe(error.campo);
      if (region) mostrarMensaje(region, error.mensaje);
      controlDe(error.campo)?.setAttribute("aria-invalid", "true");
    }
    mostrarMensaje(mensajeError, "Revisa los campos marcados: no se registró el libro.");
    const primerCampo = errores[0];
    if (primerCampo) controlDe(primerCampo.campo)?.focus();
  }

  function mostrarRechazo(fallo: FalloDeOperacion): void {
    if (fallo.porCampo.length > 0) mostrarErrores(fallo.porCampo);
    if (fallo.deLaOperacion !== null) {
      const resumen = fallo.porCampo.length > 0 ? `${mensajeError.textContent ?? ""} ` : "";
      mostrarMensaje(mensajeError, `${resumen}No se registró el libro. ${fallo.deLaOperacion}`.trim());
    }
  }

  async function registrar(): Promise<void> {
    limpiarErrores();
    if (catalogos === null) {
      mostrarMensaje(mensajeError, "No se pudieron cargar las opciones del formulario. Recargá la página.");
      return;
    }

    const borrador = leerBorrador();
    const errores = validarLibro(borrador, libros, catalogos);
    if (errores.length > 0) {
      mostrarErrores(errores);
      return;
    }
    const nuevo = libroNuevoDesdeBorrador(borrador);
    if (nuevo === null) {
      mostrarMensaje(mensajeError, "No se pudo armar el libro con los datos del formulario.");
      return;
    }

    try {
      await repositorioLibros.crear(nuevo);
    } catch (error) {
      const fallo = describirFallo(error, CAMPOS_DE_LIBRO);
      if (fallo.resultadoIncierto) {
        // No se anuncia éxito ni se reintenta: se muestra lo que quedó en la API.
        const releido = await releerListado();
        mostrarMensaje(
          mensajeError,
          `${fallo.deLaOperacion ?? ""} ` +
            (releido
              ? "Se volvió a leer el listado: comprobá si el libro figura antes de reintentar."
              : "Tampoco se pudo volver a leer el listado."),
        );
        return;
      }
      mostrarRechazo(fallo);
      return;
    }

    const releido = await releerListado();
    formulario.reset();
    sincronizarRoles();
    mostrarMensaje(
      mensajeEstado,
      releido
        ? "Libro registrado correctamente."
        : "Libro registrado correctamente. No se pudo actualizar el listado; recargá la página.",
    );
  }

  formulario.addEventListener("change", sincronizarRoles);
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    ejecutarUnaVez(registrar).catch((error: unknown) => {
      mostrarMensaje(mensajeError, `No se pudo registrar el libro. ${textoDeError(error)}`);
    });
  });

  // Una sola lectura al abrir; si falla, el error lo muestra `arrancar` y el
  // botón queda deshabilitado: no se registra con opciones incompletas.
  const [lecturaLibros, editoriales, generos, autores] = await Promise.all([
    repositorioLibros.listar(),
    repositorioEditoriales.listar(),
    repositorioGeneros.listar(),
    repositorioAutores.listar(),
  ]);
  libros = lecturaLibros;
  catalogos = { editoriales, generos, autores };
  llenarSelect(campoEditorial, "Elegir una editorial", editoriales);
  llenarSelect(campoGenero, "Sin clasificar", generos);
  generarCasillasDeAutores(autores);
  pintarListado();
  botonRegistrar.disabled = false;
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
