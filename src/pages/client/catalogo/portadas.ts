// Portadas ilustrativas de los libros de ejemplo. Se importan como recursos para
// que Vite las incluya en la compilación y reescriba sus rutas: una ruta armada
// como texto en tiempo de ejecución apuntaría a la carpeta de la página.
import breveHistoria from "../../../assets/portadas/Breve_Historia.png";
import cartasSur from "../../../assets/portadas/Cartas_Sur.png";
import casaRio from "../../../assets/portadas/Casa_Rio.png";
import diasContados from "../../../assets/portadas/Dias_Contados.png";
import faroVientos from "../../../assets/portadas/Faro_Vientos.png";
import mapas from "../../../assets/portadas/Mapas.png";

const PORTADAS_POR_TITULO = new Map<string, string>([
  ["El faro de los vientos", faroVientos],
  ["Cartas desde el sur", cartasSur],
  ["Mapas para perderse", mapas],
  ["La casa del río", casaRio],
  ["Breve historia del silencio", breveHistoria],
  ["Los días contados", diasContados],
]);

/** Dirección de la portada del libro, o `undefined` si no tiene imagen propia. */
export function portadaDe(titulo: string): string | undefined {
  return PORTADAS_POR_TITULO.get(titulo);
}
