// Lógica pura de la venta: borrador, cálculo en centavos enteros e instantánea
// histórica. No toca el DOM ni el almacenamiento.
//
// Entrada: renglones `{ libro_id, cantidad }` con cantidad numérica o texto
// numérico no vacío, siempre entera positiva y segura. Los precios del catálogo
// pueden ser `Dinero` (texto decimal) o número; el precio unitario se redondea
// primero al centavo (mitades hacia arriba) y se multiplica en centavos enteros.
// Un precio positivo menor que un centavo puede dar un unitario de 0.
//
// Éxito: `{ ok: true, errores: [], renglones, total }`; rechazo:
// `{ ok: false, errores }`, sin sustituir el último borrador válido. Cada
// renglón devuelto copia título, ISBN, cantidad, unitario y subtotal, y ninguna
// operación modifica las entradas ni comparte objetos de renglón.
import type { ClienteRef } from "../types/cliente";
import type { ErrorDeCampo } from "../types/formulario";
import type { Dinero, FechaIso, Id } from "../types/primitivos";
import type { Renglon } from "../types/venta";
import { aCentavos, centavosADinero } from "./dinero";

/** Renglón de un borrador de venta, tal como lo arma el formulario. */
export interface RenglonBorrador {
  libro_id: Id;
  cantidad: number | string;
}

/** Datos de un libro que intervienen en el cálculo de una venta. */
export interface LibroVendible {
  id: Id;
  titulo: string;
  isbn: string;
  precio: Dinero | number;
}

/** Renglón calculado: el de la API más el ISBN, que la instantánea local conserva. */
export interface RenglonCalculado extends Renglon {
  isbn: string;
}

export type ResultadoCalculo =
  | { ok: true; errores: []; renglones: RenglonCalculado[]; total: Dinero }
  | { ok: false; errores: ErrorDeCampo[] };

/** Venta lista para guardar: todavía sin identificador. */
export interface VentaConstruida {
  fecha: FechaIso;
  cliente: ClienteRef;
  renglones: RenglonCalculado[];
  total: Dinero;
}

export type ResultadoConstruccion =
  | { ok: true; errores: []; venta: VentaConstruida }
  | { ok: false; errores: ErrorDeCampo[] };

const MENSAJE_CANTIDAD = "La cantidad debe ser un entero positivo seguro.";
const FORMATO_FECHA =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function rechazo(campo: string, mensaje: string): { ok: false; errores: ErrorDeCampo[] } {
  return { ok: false, errores: [{ campo, mensaje }] };
}

function cantidadValida(cantidad: unknown): cantidad is number | string {
  return (
    (typeof cantidad === "number" ||
      (typeof cantidad === "string" && cantidad.trim() !== "")) &&
    Number.isSafeInteger(Number(cantidad)) &&
    Number(cantidad) > 0
  );
}

interface LibroResuelto {
  id: Id;
  titulo: string;
  isbn: string;
  precio: Dinero | number;
}

function calcular<R extends RenglonBorrador>(
  renglones: readonly R[],
  resolverLibro: (renglon: R) => LibroResuelto | undefined,
  permiteCero: boolean,
): ResultadoCalculo {
  const ids = renglones.map((renglon) => renglon.libro_id);
  if (new Set(ids).size !== ids.length) {
    return rechazo("renglones", "Cada libro debe aparecer en un único renglón.");
  }

  const errores: ErrorDeCampo[] = [];
  let totalCentavos = 0;
  const calculados: RenglonCalculado[] = [];
  for (const renglon of renglones) {
    if (!cantidadValida(renglon.cantidad)) {
      errores.push({ campo: "cantidad", mensaje: MENSAJE_CANTIDAD });
      continue;
    }
    const libro = resolverLibro(renglon);
    if (!libro) {
      errores.push({ campo: "libro", mensaje: "Seleccione un libro existente." });
      continue;
    }
    const centavos = aCentavos(libro.precio);
    if (centavos === null || (!permiteCero && Number(libro.precio) === 0)) {
      errores.push({
        campo: "libro",
        mensaje: "El precio del libro no es utilizable en una venta.",
      });
      continue;
    }
    const cantidad = Number(renglon.cantidad);
    const subtotalCentavos = centavos * cantidad;
    if (!Number.isSafeInteger(subtotalCentavos)) {
      errores.push({
        campo: "cantidad",
        mensaje: "El subtotal excede el rango seguro de centavos.",
      });
      continue;
    }
    totalCentavos += subtotalCentavos;
    calculados.push({
      libro_id: libro.id,
      titulo: libro.titulo,
      isbn: libro.isbn,
      cantidad,
      precio_unitario: centavosADinero(centavos),
      subtotal: centavosADinero(subtotalCentavos),
    });
  }
  if (!Number.isSafeInteger(totalCentavos)) {
    errores.push({
      campo: "renglones",
      mensaje: "El total excede el rango seguro de centavos.",
    });
  }
  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, errores: [], renglones: calculados, total: centavosADinero(totalCentavos) };
}

export function calcularVenta(
  renglones: readonly RenglonBorrador[],
  libros: readonly LibroVendible[],
): ResultadoCalculo {
  return calcular(
    renglones,
    (renglon) => libros.find((libro) => libro.id === renglon.libro_id),
    false,
  );
}

export function agregarRenglon(
  renglones: readonly RenglonBorrador[],
  libroId: Id,
  cantidad: unknown,
  libros: readonly LibroVendible[],
): ResultadoCalculo {
  if (!cantidadValida(cantidad)) return rechazo("cantidad", MENSAJE_CANTIDAD);
  const existente = renglones.some((renglon) => renglon.libro_id === libroId);
  const nuevos: RenglonBorrador[] = existente
    ? renglones.map((renglon) =>
        renglon.libro_id === libroId
          ? { libro_id: libroId, cantidad: Number(renglon.cantidad) + Number(cantidad) }
          : renglon,
      )
    : [...renglones, { libro_id: libroId, cantidad: Number(cantidad) }];
  return calcularVenta(nuevos, libros);
}

export function cambiarCantidad(
  renglones: readonly RenglonBorrador[],
  libroId: Id,
  cantidad: unknown,
  libros: readonly LibroVendible[],
): ResultadoCalculo {
  if (!cantidadValida(cantidad)) return rechazo("cantidad", MENSAJE_CANTIDAD);
  if (!renglones.some((renglon) => renglon.libro_id === libroId)) {
    return rechazo("libro", "El libro no pertenece al borrador.");
  }
  return calcularVenta(
    renglones.map((renglon) =>
      renglon.libro_id === libroId
        ? { libro_id: libroId, cantidad: Number(cantidad) }
        : renglon,
    ),
    libros,
  );
}

export function quitarRenglon(
  renglones: readonly RenglonBorrador[],
  libroId: Id,
  libros: readonly LibroVendible[],
): ResultadoCalculo {
  return calcularVenta(
    renglones.filter((renglon) => renglon.libro_id !== libroId),
    libros,
  );
}

/**
 * Devuelve solo errores: exige un cliente vigente y al menos un renglón, además
 * del cálculo válido.
 */
export function validarVenta(
  clienteId: Id | null | undefined,
  renglones: readonly RenglonBorrador[],
  clientes: readonly { id: Id }[],
  libros: readonly LibroVendible[],
): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  if (!clientes.some((cliente) => cliente.id === clienteId)) {
    errores.push({ campo: "cliente", mensaje: "Seleccione un cliente existente." });
  }
  if (renglones.length === 0) {
    errores.push({ campo: "renglones", mensaje: "Agregue al menos un libro a la venta." });
  }
  return [...errores, ...calcularVenta(renglones, libros).errores];
}

/**
 * Arma la instantánea de la venta (sin identificador): copia los datos del
 * cliente y de cada renglón. No consulta el catálogo ni el reloj: debe llamarse
 * tras `validarVenta`, con los renglones ya calculados y la fecha suministrada.
 */
export function construirVenta(
  cliente: ClienteRef | null,
  renglones: readonly RenglonCalculado[],
  fecha: FechaIso,
): ResultadoConstruccion {
  const errores: ErrorDeCampo[] = [];
  if (!cliente?.id) {
    errores.push({ campo: "cliente", mensaje: "Seleccione un cliente existente." });
  }
  if (renglones.length === 0) {
    errores.push({ campo: "renglones", mensaje: "Agregue al menos un libro a la venta." });
  }
  if (typeof fecha !== "string" || !FORMATO_FECHA.test(fecha) || !Number.isFinite(Date.parse(fecha))) {
    errores.push({ campo: "fecha", mensaje: "La fecha de confirmación no es válida." });
  }
  const resultado = calcular(
    renglones,
    (renglon) => ({
      id: renglon.libro_id,
      titulo: renglon.titulo,
      isbn: renglon.isbn,
      precio: renglon.precio_unitario,
    }),
    true,
  );
  errores.push(...resultado.errores);
  if (
    resultado.ok &&
    renglones.some((renglon, indice) => {
      const calculado = resultado.renglones[indice];
      return (
        renglon.precio_unitario !== calculado?.precio_unitario ||
        renglon.subtotal !== calculado.subtotal
      );
    })
  ) {
    errores.push({
      campo: "renglones",
      mensaje: "Los importes del borrador no coinciden con sus cantidades y unitarios.",
    });
  }
  if (errores.length > 0 || !resultado.ok || !cliente) return { ok: false, errores };
  return {
    ok: true,
    errores: [],
    venta: {
      fecha,
      cliente: { id: cliente.id, nombre: cliente.nombre, email: cliente.email },
      renglones: resultado.renglones,
      total: resultado.total,
    },
  };
}

/** Código con el que se muestra una venta (`1` → `ven-01`), como en la versión anterior. */
export function codigoDeVenta(id: Id): string {
  return `ven-${String(id).padStart(2, "0")}`;
}
