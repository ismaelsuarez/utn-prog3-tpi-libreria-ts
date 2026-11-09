import type { DatosIniciales } from "./tipos-locales";

// Datos de ejemplo de la aplicación. Editoriales y autores suman `pais` y
// `nacionalidad` ficticios, que la forma de la API exige y que no se persisten
// (SU-05: estas entidades no se guardan en `localStorage`).
export const datosIniciales: DatosIniciales = {
  editoriales: [
    { id: "edi-01", nombre: "Ediciones del Puerto", pais: "Argentina" },
    { id: "edi-02", nombre: "Editorial Brújula", pais: "Argentina" },
  ],
  generos: [
    { id: "gen-01", nombre: "Novela" },
    { id: "gen-02", nombre: "Ensayo" },
  ],
  autores: [
    { id: "aut-01", nombre: "Marta Ibáñez", nacionalidad: "Argentina" },
    { id: "aut-02", nombre: "Tomás Quiroga", nacionalidad: "Argentina" },
    { id: "aut-03", nombre: "Elena Varela", nacionalidad: "Argentina" },
  ],
  libros: [
    { id: "lib-01", titulo: "El faro de los vientos", isbn: "978-987-000-001-1", precio: 1500, editorialId: "edi-01", generoId: "gen-01", autorIds: ["aut-01"] },
    { id: "lib-02", titulo: "Cartas desde el sur", isbn: "978-987-000-002-8", precio: 2000, editorialId: "edi-02", generoId: "gen-01", autorIds: ["aut-02"] },
    { id: "lib-03", titulo: "Mapas para perderse", isbn: "978-987-000-003-5", precio: 2350.5, editorialId: "edi-02", generoId: "gen-02", autorIds: ["aut-03", "aut-02"] },
    { id: "lib-04", titulo: "La casa del río", isbn: "978-987-000-004-2", precio: 1800, editorialId: "edi-01", generoId: null, autorIds: ["aut-01"] },
    { id: "lib-05", titulo: "Breve historia del silencio", isbn: "978-987-000-005-9", precio: 2750, editorialId: "edi-01", generoId: "gen-02", autorIds: ["aut-03"] },
    { id: "lib-06", titulo: "Los días contados", isbn: "978-987-000-006-6", precio: 1990.9, editorialId: "edi-02", generoId: "gen-01", autorIds: ["aut-02"] },
  ],
  clientes: [
    { id: "cli-01", nombreCompleto: "Laura Mendoza", email: "laura.mendoza@correo.test" },
    { id: "cli-02", nombreCompleto: "Ricardo Soria", email: "ricardo.soria@correo.test" },
    { id: "cli-03", nombreCompleto: "Nina Podestá", email: "nina.podesta@correo.test" },
  ],
};
