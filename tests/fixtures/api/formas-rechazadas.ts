// Cada línea marcada con `@ts-expect-error` debe seguir siendo un error de tipos:
// si un tipo se relaja, `tsc` avisa de que la marca quedó sin efecto.
import type { AutorConRol } from "../../../src/types/autor";
import type { Libro } from "../../../src/types/libro";
import type { Cliente } from "../../../src/types/cliente";
import type { LibroNuevo } from "../../../src/types/libro";
import { listadoDeLibros } from "./libros";

const base = listadoDeLibros[0];

// @ts-expect-error `precio` es texto decimal (Dinero), no un número
export const precioNumerico: Libro = { ...base, precio: 25000 };

// @ts-expect-error `rol` debe ser uno de los valores de RolAutoria
export const rolFueraDeLaUnion: AutorConRol = { autor_id: 1, nombre: "A", rol: "editor", orden: 1 };

// @ts-expect-error `genero` es obligatorio: sin género se envía `null`, no se omite
export const generoAusente: Libro = { id: 3, isbn: "x", titulo: "t", precio: "1.00", stock: 0, editorial: { id: 1, nombre: "e" } };

// @ts-expect-error `stock` es obligatorio al crear un libro
export const libroNuevoSinStock: LibroNuevo = { isbn: "x", titulo: "t", precio: "1.00", editorial_id: 1 };

// @ts-expect-error el rol de una autoría debe ser uno de los cuatro valores
export const autoriaConRolInvalido: LibroNuevo = { isbn: "x", titulo: "t", precio: "1.00", stock: 0, editorial_id: 1, autores: [{ autor_id: 1, rol: "editor", orden: 1 }] };

// @ts-expect-error `perfil` es obligatorio en un cliente: sin perfil se entrega `null`, no se omite
export const clienteSinPerfilAusente: Cliente = { id: 1, nombre: "n", email: "e" };
