import type { Cliente } from "../../../src/types/cliente";
import type { Venta } from "../../../src/types/venta";

/** GET /ventas/?limit=1 */
export const listadoDeVentas = [
  {
    id: 1,
    fecha: "2026-11-08T20:30:31.070037Z",
    total: "18000.00",
    cliente: { id: 1, nombre: "Ana Gómez", email: "ana@example.com" },
    renglones: [
      {
        libro_id: 2,
        titulo: "Ficciones",
        cantidad: 1,
        precio_unitario: "18000.00",
        subtotal: "18000.00",
      },
    ],
  },
] satisfies Venta[];

/** GET /clientes/1 (el cliente de la venta anterior) */
export const detalleDelCliente1 = {
  id: 1,
  nombre: "Ana Gómez",
  email: "ana@example.com",
  perfil: {
    id: 1,
    cliente_id: 1,
    telefono: "+54 11 5555-0101",
    direccion: "Av. Corrientes 1234, CABA",
  },
} satisfies Cliente;
