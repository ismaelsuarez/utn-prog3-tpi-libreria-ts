// Cuerpos enviados y respuestas de las altas y de los detalles por identificador,
// con la forma de los esquemas del backend desplegado (`LibroCreate`,
// `LibroDetalleRead`, `ClienteCreate`, `ClienteRead`, `PerfilCreate`,
// `PerfilRead`, `VentaCreate`, `VentaRead`, `AutorRead`). Cada constante usa
// `satisfies`: `tsc` falla si un tipo de dominio deja de coincidir.
import type { Autor } from "../../../src/types/autor";
import type { Cliente, ClienteNuevo, Perfil } from "../../../src/types/cliente";
import type { LibroDetalle } from "../../../src/types/libro";
import type { Venta, VentaNueva } from "../../../src/types/venta";

/** GET /autores/1 */
export const detalleDelAutor1 = {
  id: 1,
  nombre: "Julio Cortázar",
  nacionalidad: "Argentina",
} satisfies Autor;

/** GET /autores/5 */
export const detalleDelAutor5 = {
  id: 5,
  nombre: "Jorge Luis Borges",
  nacionalidad: "Argentina",
} satisfies Autor;

/** GET /clientes/2 (cliente sin perfil) */
export const detalleDelCliente2SinPerfil = {
  id: 2,
  nombre: "Luis Pérez",
  email: "luis@example.com",
  perfil: null,
} satisfies Cliente;

/** Cuerpo de POST /clientes/ */
export const altaDeCliente = {
  nombre: "Ana Gómez",
  email: "ana@example.com",
} satisfies ClienteNuevo;

/** 201 de POST /clientes/ */
export const clienteCreado = {
  id: 4,
  nombre: "Ana Gómez",
  email: "ana@example.com",
  perfil: null,
} satisfies Cliente;

/** 201 de POST /clientes/4/perfil */
export const perfilCreado = {
  id: 2,
  cliente_id: 4,
  telefono: "+54 11 5555-0104",
  direccion: null,
} satisfies Perfil;

/** 201 de POST /libros/ */
export const libroCreado = {
  id: 6,
  isbn: "978-950-00-0006-6",
  titulo: "El Aleph",
  precio: "21500.50",
  stock: 3,
  editorial: { id: 1, nombre: "Emecé" },
  genero: { id: 3, nombre: "Cuento" },
  autores: [
    { autor_id: 5, nombre: "Jorge Luis Borges", rol: "autor", orden: 1 },
    { autor_id: 1, nombre: "Julio Cortázar", rol: "ilustrador", orden: 2 },
  ],
} satisfies LibroDetalle;

/** Cuerpo de POST /ventas/ (el ejemplo de la consigna: cliente 2, libro 1 x2 y libro 4 x1) */
export const altaDeVenta = {
  cliente_id: 2,
  renglones: [
    { libro_id: 1, cantidad: 2 },
    { libro_id: 4, cantidad: 1 },
  ],
} satisfies VentaNueva;

/** 201 de POST /ventas/ */
export const ventaCreada = {
  id: 4,
  fecha: "2026-11-08T21:11:02.123456Z",
  total: "77000.00",
  cliente: { id: 2, nombre: "Luis Pérez", email: "luis@example.com" },
  renglones: [
    { libro_id: 1, titulo: "Rayuela", cantidad: 2, precio_unitario: "25000.00", subtotal: "50000.00" },
    { libro_id: 4, titulo: "Los Detectives Salvajes", cantidad: 1, precio_unitario: "27000.00", subtotal: "27000.00" },
  ],
} satisfies Venta;
