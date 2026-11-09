// Ficha de lectura del Catálogo: un diálogo modal con los datos del libro. No
// reemplaza al catálogo ni modifica sus datos; recibe el libro ya cargado.
import { nombreGenero, nombresAutores } from "../../../logica/catalogo";
import { formatearImporte } from "../../../logica/dinero";
import type { LibroDetalle } from "../../../types/libro";
import { buscar, elementoPorId } from "../../../utils/dom";

// Sinopsis ILUSTRATIVAS (no proceden de las editoriales).
const SINOPSIS_DE_MUESTRA = new Map<string, string>([
  ["El faro de los vientos", "En una pequeña ciudad costera, las historias de quienes viven alrededor de un antiguo faro se entrelazan cuando un hallazgo inesperado despierta recuerdos que parecían olvidados. Una novela sobre los vínculos, la memoria y la posibilidad de empezar de nuevo."],
  ["Cartas desde el sur", "Un intercambio de cartas une a personas separadas por la distancia. Entre recuerdos familiares y decisiones difíciles, cada mensaje revela una nueva mirada sobre el pasado."],
  ["Mapas para perderse", "Un recorrido por los lugares que habitamos, los caminos que elegimos y las formas en que construimos nuestra identidad a partir de los viajes."],
  ["La casa del río", "Una vieja casa junto al río guarda los recuerdos de distintas generaciones. Sus habitantes intentan entender qué significa pertenecer a un lugar."],
  ["Breve historia del silencio", "Una reflexión sobre los momentos de silencio que atravesamos en la vida cotidiana, la literatura y las relaciones humanas."],
  ["Los días contados", "Un personaje que vive pendiente del calendario comienza a reconsiderar sus prioridades cuando una noticia inesperada altera su rutina."],
]);

export type ClaseDeGenero = "novela" | "ensayo" | "sin-clasificar";

export function claseDeGenero(nombre: string): ClaseDeGenero {
  const genero = nombre.toLocaleLowerCase("es").trim();
  if (genero === "novela") return "novela";
  if (genero === "ensayo") return "ensayo";
  return "sin-clasificar";
}

function escribir(id: string, valor: string): void {
  elementoPorId(id, HTMLElement).textContent = valor;
}

/** Conecta el diálogo de la ficha y devuelve la función que lo abre para un libro. */
export function iniciarFicha(): (libro: LibroDetalle, tarjeta: HTMLElement) => void {
  const dialogo = elementoPorId("ficha-libro", HTMLDialogElement);
  const cerrar = (): void => {
    if (dialogo.open) dialogo.close();
  };
  elementoPorId("cerrar-ficha", HTMLElement).addEventListener("click", cerrar);
  elementoPorId("volver-catalogo", HTMLElement).addEventListener("click", cerrar);
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) cerrar();
  });

  return (libro, tarjeta) => {
    const titulo = libro.titulo;
    const autor = nombresAutores(libro.autores);
    const genero = nombreGenero(libro.genero);
    const editorial = libro.editorial.nombre;
    const sinopsisDeMuestra = SINOPSIS_DE_MUESTRA.get(titulo);
    const sinopsis = sinopsisDeMuestra ?? "Este libro todavía no tiene una sinopsis cargada.";

    escribir("ficha-titulo", titulo);
    escribir("ficha-cubierta-titulo", titulo);
    escribir("ficha-cubierta-editorial", editorial);
    escribir("ficha-cubierta-autor", autor);
    escribir("ficha-autor", autor ? `por ${autor}` : "Autor no informado");
    const icono = genero === "Novela" ? "▣ " : genero === "Ensayo" ? "✎ " : "◇ ";
    escribir("ficha-genero", icono + genero.toUpperCase());
    escribir("ficha-genero-texto", genero);
    escribir("ficha-editorial", editorial);
    escribir("ficha-isbn", libro.isbn);
    escribir("ficha-precio", formatearImporte(libro.precio));
    escribir("ficha-sinopsis", sinopsis);
    elementoPorId("ficha-advertencia", HTMLElement).hidden = sinopsisDeMuestra === undefined;

    elementoPorId("ficha-genero", HTMLElement).className =
      `ficha-category ficha-category--${claseDeGenero(genero)}`;
    const portadaDeTarjeta = tarjeta.querySelector(".tarjeta__portada") ?? tarjeta;
    elementoPorId("ficha-portada", HTMLElement).style.background =
      getComputedStyle(portadaDeTarjeta).backgroundImage;
    const imagenOriginal = buscar(tarjeta, ".tarjeta__imagen", HTMLImageElement);
    const imagenModal = elementoPorId("ficha-portada-imagen", HTMLImageElement);
    const hayImagen =
      !imagenOriginal.hidden && imagenOriginal.complete && imagenOriginal.naturalWidth > 0;
    imagenModal.hidden = !hayImagen;
    if (hayImagen) imagenModal.src = imagenOriginal.src;
    else imagenModal.removeAttribute("src");
    elementoPorId("ficha-cubierta-hint", HTMLElement).textContent = hayImagen
      ? "Portada del libro"
      : "Cubierta ilustrativa de ejemplo";

    // La ficha se abre solo a pedido del usuario, nunca al cargar la página.
    if (!dialogo.open) dialogo.showModal();
  };
}
