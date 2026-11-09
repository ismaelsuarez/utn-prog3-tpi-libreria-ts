import type { LibroDetalle } from "../../src/types/libro";

const puerto = { id: 1, nombre: "Ediciones del Puerto" };
const brujula = { id: 2, nombre: "Editorial Brújula" };
const novela = { id: 1, nombre: "Novela" };
const ensayo = { id: 2, nombre: "Ensayo" };
const ibanez = { autor_id: 1, nombre: "Marta Ibáñez", rol: "autor", orden: 1 } as const;
const quiroga = { autor_id: 2, nombre: "Tomás Quiroga", rol: "autor", orden: 1 } as const;
const varela = { autor_id: 3, nombre: "Elena Varela", rol: "autor", orden: 1 } as const;

/** Los seis libros de ejemplo de la aplicación, con la forma de la API. */
export const librosDeEjemplo: LibroDetalle[] = [
  { id: 1, titulo: "El faro de los vientos", isbn: "978-987-000-001-1", precio: "1500.00", stock: 0, editorial: puerto, genero: novela, autores: [ibanez] },
  { id: 2, titulo: "Cartas desde el sur", isbn: "978-987-000-002-8", precio: "2000.00", stock: 0, editorial: brujula, genero: novela, autores: [quiroga] },
  { id: 3, titulo: "Mapas para perderse", isbn: "978-987-000-003-5", precio: "2350.50", stock: 0, editorial: brujula, genero: ensayo, autores: [{ ...quiroga, orden: 2 }, varela] },
  { id: 4, titulo: "La casa del río", isbn: "978-987-000-004-2", precio: "1800.00", stock: 0, editorial: puerto, genero: null, autores: [ibanez] },
  { id: 5, titulo: "Breve historia del silencio", isbn: "978-987-000-005-9", precio: "2750.00", stock: 0, editorial: puerto, genero: ensayo, autores: [varela] },
  { id: 6, titulo: "Los días contados", isbn: "978-987-000-006-6", precio: "1990.90", stock: 0, editorial: brujula, genero: novela, autores: [quiroga] },
];
