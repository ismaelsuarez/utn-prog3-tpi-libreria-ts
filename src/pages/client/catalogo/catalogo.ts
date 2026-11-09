// Vista Catálogo: tarjetas de libros desde el repositorio, con filtro por título.
import "../../../main";
import { repositorioLibros } from "../../../datos/proveedor";
import { estadoDelListado, filtrarPorTitulo, nombreGenero, nombresAutores } from "../../../logica/catalogo";
import { formatearImporte } from "../../../logica/dinero";
import type { LibroDetalle } from "../../../types/libro";
import { arrancar, buscar, elementoPorId, vaciarNodo } from "../../../utils/dom";
import { claseDeGenero, iniciarFicha } from "./ficha-libro";
import { portadaDe } from "./portadas";

async function iniciar(): Promise<void> {
  const formulario = elementoPorId("form-busqueda", HTMLFormElement);
  const campoBusqueda = elementoPorId("busqueda-titulo", HTMLInputElement);
  const lista = elementoPorId("lista-catalogo", HTMLElement);
  const mensajeVacio = elementoPorId("catalogo-vacio", HTMLElement);
  const mensajeSinResultados = elementoPorId("catalogo-sin-resultados", HTMLElement);
  const plantilla = elementoPorId("plantilla-tarjeta-libro", HTMLTemplateElement);

  const libros = await repositorioLibros.listar();
  const abrirFicha = iniciarFicha();

  function pintarLibro(libro: LibroDetalle): void {
    const item = plantilla.content.cloneNode(true) as DocumentFragment;
    const tarjeta = buscar(item, ".tarjeta", HTMLElement);
    const genero = nombreGenero(libro.genero);
    const tipo = claseDeGenero(genero);

    buscar(tarjeta, '[data-campo="titulo"]', HTMLElement).textContent = libro.titulo;
    buscar(tarjeta, '[data-campo="isbn"]', HTMLElement).textContent = libro.isbn;
    buscar(tarjeta, '[data-campo="editorial"]', HTMLElement).textContent = libro.editorial.nombre;
    const etiqueta = buscar(tarjeta, '[data-campo="genero"]', HTMLElement);
    etiqueta.textContent = genero;
    etiqueta.classList.add(`tarjeta__genero--${tipo}`);
    buscar(tarjeta, '[data-campo="autores"]', HTMLElement).textContent = nombresAutores(libro.autores);
    buscar(tarjeta, '[data-campo="precio"]', HTMLElement).textContent = formatearImporte(libro.precio);
    buscar(tarjeta, ".tarjeta__portada", HTMLElement).classList.add(`tarjeta__portada--${tipo}`);
    buscar(tarjeta, ".tarjeta__portada-fallback span", HTMLElement).textContent = libro.titulo;

    // Portadas: las fotos son opcionales, nunca se oculta la cubierta de respaldo.
    const imagen = buscar(tarjeta, ".tarjeta__imagen", HTMLImageElement);
    const portada = portadaDe(libro.titulo);
    imagen.alt = `Portada del libro ${libro.titulo}`;
    imagen.onload = (): void => {
      imagen.hidden = false;
    };
    imagen.onerror = (): void => {
      imagen.hidden = true;
    };
    if (portada === undefined) imagen.hidden = true;
    else imagen.src = portada;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ficha-abrir";
    boton.textContent = "Ver sinopsis ↗";
    boton.setAttribute("aria-label", `Ver sinopsis de ${libro.titulo}`);
    boton.addEventListener("click", () => abrirFicha(libro, tarjeta));
    buscar(tarjeta, ".tarjeta__contenido", HTMLElement).appendChild(boton);

    lista.appendChild(item);
  }

  function actualizar(): void {
    const coincidencias = filtrarPorTitulo(libros, campoBusqueda.value);

    vaciarNodo(lista);
    coincidencias.forEach(pintarLibro);

    const estado = estadoDelListado(libros.length, coincidencias.length);
    lista.hidden = estado !== "con-resultados";
    mensajeVacio.hidden = estado !== "vacio";
    mensajeSinResultados.hidden = estado !== "sin-resultados";
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    actualizar();
  });
  campoBusqueda.addEventListener("input", actualizar);

  actualizar();
}

arrancar(iniciar, () => document.getElementById("catalogo-error"));
