import type { ClienteRef } from "./cliente";
import type { Dinero, FechaIso, Id } from "./primitivos";

export interface Renglon {
  libro_id: Id;
  titulo: string;
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
