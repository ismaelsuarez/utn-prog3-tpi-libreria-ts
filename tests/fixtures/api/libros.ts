// Respuestas reales de la API de producción (solo GET), copiadas para que `tsc`
// falle si un tipo de dominio deja de coincidir con lo que la API devuelve.
import type { Libro, LibroDetalle } from "../../../src/types/libro";

/** GET /libros/?limit=2 */
export const listadoDeLibros = [
  {
    id: 1,
    isbn: "978-950-00-0001-1",
    titulo: "Rayuela",
    precio: "25000.00",
    stock: 10,
    editorial: { id: 2, nombre: "Sudamericana" },
    genero: { id: 2, nombre: "Novela" },
  },
  {
    id: 2,
    isbn: "978-950-00-0002-2",
    titulo: "Ficciones",
    precio: "18000.00",
    stock: 8,
    editorial: { id: 1, nombre: "Emecé" },
    genero: { id: 3, nombre: "Cuento" },
  },
] satisfies Libro[];

/** GET /libros/1 */
export const detalleDelLibro1 = {
  id: 1,
  isbn: "978-950-00-0001-1",
  titulo: "Rayuela",
  precio: "25000.00",
  stock: 10,
  editorial: { id: 2, nombre: "Sudamericana" },
  genero: { id: 2, nombre: "Novela" },
  autores: [{ autor_id: 1, nombre: "Julio Cortázar", rol: "autor", orden: 1 }],
} satisfies LibroDetalle;

/** GET /libros/2 */
export const detalleDelLibro2 = {
  id: 2,
  isbn: "978-950-00-0002-2",
  titulo: "Ficciones",
  precio: "18000.00",
  stock: 8,
  editorial: { id: 1, nombre: "Emecé" },
  genero: { id: 3, nombre: "Cuento" },
  autores: [
    { autor_id: 5, nombre: "Jorge Luis Borges", rol: "autor", orden: 1 },
  ],
} satisfies LibroDetalle;
