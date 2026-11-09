// Lógica pura de la venta: borrador y cálculo en centavos enteros (el importe
// definitivo y el precio histórico los fija y guarda el servidor). No toca el DOM
// ni el almacenamiento.
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
import type { ErrorDeCampo } from "../types/formulario";
import type { Dinero, Id } from "../types/primitivos";
import type { Renglon, VentaNueva } from "../types/venta";
import { aCentavos, centavosADinero } from "./dinero";
import type { FalloDeOperacion } from "./errores-de-formulario";
import { ENTERO_MAXIMO_DE_LA_API, ENTERO_MAXIMO_DE_LA_API_TEXTO } from "./limites";
import { conPuntoFinal } from "./texto";

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

/** Renglón calculado del borrador: el de la API más el ISBN del libro, que el borrador muestra. */
export interface RenglonCalculado extends Renglon {
  isbn: string;
}

export type ResultadoCalculo =
  | { ok: true; errores: []; renglones: RenglonCalculado[]; total: Dinero }
  | { ok: false; errores: ErrorDeCampo[] };

const MENSAJE_CANTIDAD = "La cantidad debe ser un entero positivo seguro.";
const MENSAJE_CANTIDAD_MAXIMA = `La cantidad no puede superar ${ENTERO_MAXIMO_DE_LA_API_TEXTO}.`;

function rechazo(campo: string, mensaje: string): { ok: false; errores: ErrorDeCampo[] } {
  return { ok: false, errores: [{ campo, mensaje }] };
}

function esEnteroPositivoSeguro(cantidad: unknown): cantidad is number | string {
  return (
    (typeof cantidad === "number" ||
      (typeof cantidad === "string" && cantidad.trim() !== "")) &&
    Number.isSafeInteger(Number(cantidad)) &&
    Number(cantidad) > 0
  );
}

/** Mensaje de rechazo de una cantidad, o `null` si es un entero positivo que la API acepta. */
function mensajeDeCantidad(cantidad: unknown): string | null {
  if (!esEnteroPositivoSeguro(cantidad)) return MENSAJE_CANTIDAD;
  return Number(cantidad) > ENTERO_MAXIMO_DE_LA_API ? MENSAJE_CANTIDAD_MAXIMA : null;
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
): ResultadoCalculo {
  const ids = renglones.map((renglon) => renglon.libro_id);
  if (new Set(ids).size !== ids.length) {
    return rechazo("renglones", "Cada libro debe aparecer en un único renglón.");
  }

  const errores: ErrorDeCampo[] = [];
  let totalCentavos = 0;
  const calculados: RenglonCalculado[] = [];
  for (const renglon of renglones) {
    const mensajeCantidad = mensajeDeCantidad(renglon.cantidad);
    if (mensajeCantidad !== null) {
      errores.push({ campo: "cantidad", mensaje: mensajeCantidad });
      continue;
    }
    const libro = resolverLibro(renglon);
    if (!libro) {
      errores.push({ campo: "libro", mensaje: "Seleccione un libro existente." });
      continue;
    }
    const centavos = aCentavos(libro.precio);
    if (centavos === null || Number(libro.precio) === 0) {
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
  );
}

export function agregarRenglon(
  renglones: readonly RenglonBorrador[],
  libroId: Id,
  cantidad: unknown,
  libros: readonly LibroVendible[],
): ResultadoCalculo {
  const mensajeCantidad = mensajeDeCantidad(cantidad);
  if (mensajeCantidad !== null) return rechazo("cantidad", mensajeCantidad);
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
  const mensajeCantidad = mensajeDeCantidad(cantidad);
  if (mensajeCantidad !== null) return rechazo("cantidad", mensajeCantidad);
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

/** Código con el que se muestra una venta (`1` → `ven-01`), como en la versión anterior. */
export function codigoDeVenta(id: Id): string {
  return `ven-${String(id).padStart(2, "0")}`;
}

/**
 * Cuerpo de `POST /ventas/`: solo el identificador del cliente y, por renglón, el
 * del libro y la cantidad. El precio, los subtotales y el total los calcula el
 * servidor con el precio vigente al confirmar.
 */
export function ventaNuevaDesdeBorrador(
  clienteId: Id,
  renglones: readonly RenglonBorrador[],
): VentaNueva {
  return {
    cliente_id: clienteId,
    renglones: renglones.map((renglon) => ({
      libro_id: renglon.libro_id,
      cantidad: Number(renglon.cantidad),
    })),
  };
}

/**
 * Mensaje de una confirmación que no se registró. Ante una falta de respuesta
 * no se sabe si la venta quedó: se pide revisar el Historial y no se reenvía.
 */
export function mensajeDeVentaFallida(fallo: FalloDeOperacion): string {
  if (fallo.resultadoIncierto) {
    return (
      "No se pudo confirmar si la venta se registró. Revisá el Historial antes de reintentar: " +
      "el borrador se conserva y no se vuelve a enviar solo."
    );
  }
  const motivos = [
    ...(fallo.deLaOperacion === null ? [] : [fallo.deLaOperacion]),
    ...fallo.porCampo.map((error) => error.mensaje),
  ];
  return `${motivos.map(conPuntoFinal).join(" ")} El borrador se conserva.`.trim();
}
