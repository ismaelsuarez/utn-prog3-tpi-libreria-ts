import type { Editorial } from "../../../src/types/editorial";
import type { Genero } from "../../../src/types/genero";

/** GET /editoriales/?limit=2 */
export const listadoDeEditoriales = [
  { id: 1, nombre: "Emecé", pais: "Argentina" },
  { id: 2, nombre: "Sudamericana", pais: "Argentina" },
] satisfies Editorial[];

/** GET /generos/?limit=2 */
export const listadoDeGeneros = [
  { id: 1, nombre: "Policial" },
  { id: 2, nombre: "Novela" },
] satisfies Genero[];
