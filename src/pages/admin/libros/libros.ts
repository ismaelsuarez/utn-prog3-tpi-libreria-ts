// Vista Libros: formulario de alta, selectores y listado, siempre a través de
// los repositorios. Las altas válidas se registran sin recargar la página.
import "../../../main";
import {
  repositorioAutores,
  repositorioEditoriales,
  repositorioGeneros,
  repositorioLibros,
} from "../../../datos/proveedor";
import { nombreGenero, nombresAutores } from "../../../logica/catalogo";
import { formatearImporte } from "../../../logica/dinero";
import { validarLibro, type BorradorLibro } from "../../../logica/libros";
import type { Autor } from "../../../types/autor";
import type { ErrorDeCampo } from "../../../types/formulario";
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
const CAMPOS = ["titulo", "isbn", "precio", "editorial", "genero", "autores"] as const;

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-libro", HTMLFormElement);
  const campoTitulo = elementoPorId("libro-titulo", HTMLInputElement);
  const campoIsbn = elementoPorId("libro-isbn", HTMLInputElement);
  const campoPrecio = elementoPorId("libro-precio", HTMLInputElement);
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

  function controlDe(campo: string): HTMLElement | null {
    if (campo === "autores") return grupoAutores.querySelector("input");
    return document.getElementById(`libro-${campo}`);
  }

  function regionDe(campo: string): HTMLElement | null {
    return document.getElementById(`error-libro-${campo}`);
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
      grupoAutores.appendChild(fragmento);
    }
  }

  async function renderizarListado(): Promise<void> {
    const libros = await repositorioLibros.listar();
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

  function leerBorrador(): BorradorLibro {
    const marcadas = Array.from(
      grupoAutores.querySelectorAll<HTMLInputElement>('input[name="autores"]:checked'),
    );
    return {
      titulo: campoTitulo.value,
      isbn: campoIsbn.value,
      precio: campoPrecio.value,
      editorial_id: idDeValor(campoEditorial.value),
      genero_id: idDeValor(campoGenero.value),
      autores: marcadas.map((casilla, posicion) => ({
        autor_id: Number(casilla.value),
        rol: "autor" as const,
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

  async function registrar(): Promise<void> {
    limpiarErrores();

    // Se relee el repositorio en cada envío para detectar duplicados de la sesión.
    const borrador = leerBorrador();
    const [libros, editoriales, generos, autores] = await Promise.all([
      repositorioLibros.listar(),
      repositorioEditoriales.listar(),
      repositorioGeneros.listar(),
      repositorioAutores.listar(),
    ]);
    const errores = validarLibro(borrador, libros, { editoriales, generos, autores });
    if (errores.length > 0 || borrador.editorial_id === null || borrador.editorial_id === undefined) {
      mostrarErrores(errores);
      return;
    }

    await repositorioLibros.crear({
      titulo: borrador.titulo.trim(),
      isbn: borrador.isbn.trim(),
      precio: Number(borrador.precio),
      // Dato provisorio: el formulario pedirá el stock en `operaciones-contra-api`.
      stock: 0,
      editorial_id: borrador.editorial_id,
      genero_id: borrador.genero_id ?? null,
      autores: [...(borrador.autores ?? [])],
    });

    await renderizarListado();
    formulario.reset();
    mostrarMensaje(mensajeEstado, "Libro registrado correctamente.");
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    registrar().catch((error: unknown) => {
      mostrarMensaje(mensajeError, `No se pudo registrar el libro. ${textoDeError(error)}`);
    });
  });

  const [editoriales, generos, autores] = await Promise.all([
    repositorioEditoriales.listar(),
    repositorioGeneros.listar(),
    repositorioAutores.listar(),
  ]);
  llenarSelect(campoEditorial, "Elegir una editorial", editoriales);
  llenarSelect(campoGenero, "Sin clasificar", generos);
  generarCasillasDeAutores(autores);
  await renderizarListado();
}

arrancar(iniciar, () => document.getElementById("mensaje-error"));
