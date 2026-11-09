import type { ClienteRef } from "./cliente";
import type { Dinero, FechaIso, Id } from "./primitivos";

export interface Renglon {
  libro_id: Id;
  titulo: string;
  /**
   * Dato de transición del adaptador local, que conserva el ISBN copiado al
   * confirmar la venta (requisito de `historial`). La API de producción no lo
   * entrega: `operaciones-contra-api` decide cómo seguir mostrándolo.
   */
  isbn?: string;
  cantidad: number;
  precio_unitario: Dinero;
  subtotal: Dinero;
}

export interface Venta {
  id: Id;
  fecha: FechaIso;
  total: Dinero;
  cliente: ClienteRef;
  renglones: Renglon[];
}

export interface RenglonNuevo {
  libro_id: Id;
  cantidad: number;
}

export interface VentaNueva {
  cliente_id: Id;
  renglones: RenglonNuevo[];
}
