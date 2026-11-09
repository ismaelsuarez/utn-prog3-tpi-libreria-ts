import { describe, expect, test } from "vitest";
import {
  agregarRenglon,
  calcularVenta,
  cambiarCantidad,
  construirVenta,
  quitarRenglon,
  validarVenta,
  type LibroVendible,
  type RenglonBorrador,
  type RenglonCalculado,
} from "../../src/logica/ventas";
import type { ClienteRef } from "../../src/types/cliente";

function libro(precio: number | string, id = 1): LibroVendible {
  return { id, titulo: "Libro de prueba", isbn: "978-1", precio };
}

function calcular(precio: number | string, cantidad = 1) {
  return calcularVenta([{ libro_id: 1, cantidad }], [libro(precio)]);
}

/** Renglones de un cálculo que debe ser correcto (falla la prueba si no lo es). */
function renglonesDe(resultado: ReturnType<typeof calcularVenta>): RenglonCalculado[] {
  if (!resultado.ok) throw new Error(JSON.stringify(resultado.errores));
  return resultado.renglones;
}

const FECHA = "2026-01-06T01:07:00.000Z";

describe("calcularVenta: redondeo y centavos", () => {
  test("redondea el unitario antes de multiplicar sin cambiar el catálogo", () => {
    const catalogo = [libro(1500.125)];
    const resultado = calcularVenta([{ libro_id: 1, cantidad: 2 }], catalogo);
    expect(resultado).toEqual({
      ok: true,
      errores: [],
      renglones: [
        { libro_id: 1, titulo: "Libro de prueba", isbn: "978-1", cantidad: 2, precio_unitario: "1500.13", subtotal: "3000.26" },
      ],
      total: "3000.26",
    });
    expect(catalogo[0]?.precio).toBe(1500.125);
  });

  test.each([
    [1.005, 1, "1.01", "1.01"],
    [10.124, 2, "10.12", "20.24"],
    [0.004, 2, "0.00", "0.00"],
    [0.005, 2, "0.01", "0.02"],
    [1e-7, 2, "0.00", "0.00"],
    [5e-324, 1, "0.00", "0.00"],
  ])("redondeo decimal de %s con cantidad %s", (precio, cantidad, unitario, subtotal) => {
    const resultado = calcular(precio, cantidad);
    expect(resultado.errores).toEqual([]);
    const renglones = renglonesDe(resultado);
    expect(renglones[0]?.precio_unitario).toBe(unitario);
    expect(renglones[0]?.subtotal).toBe(subtotal);
    expect(resultado.ok && resultado.total).toBe(subtotal);
  });

  test("un precio de texto decimal da el mismo resultado que el número equivalente", () => {
    expect(calcular("1500.13", 2)).toEqual(calcular(1500.13, 2));
    expect(calcular("12", 1)).toEqual(calcular(12, 1));
    const resultado = calcular("2350.50", 2);
    expect(resultado.ok && resultado.total).toBe("4701.00");
  });

  test.each(["abc", "", "-5", Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, "0.00", -1, 1e21])(
    "rechaza precio no utilizable: %s",
    (precio) => {
      const resultado = calcular(precio);
      expect(resultado.ok).toBe(false);
      expect(resultado.errores).toHaveLength(1);
      expect(resultado.errores[0]?.campo).toBe("libro");
      expect(resultado.errores[0]?.mensaje.length).toBeGreaterThan(0);
      expect("renglones" in resultado).toBe(false);
    },
  );

  test.each([
    [1500, 2000, 2, "3000.00", "2000.00", "5000.00"],
    [0.1, 0.2, 3, "0.30", "0.20", "0.50"],
  ])("calcula subtotales y total de referencia %s y %s", (primero, segundo, cantidad, subtotal1, subtotal2, total) => {
    const resultado = calcularVenta(
      [{ libro_id: 1, cantidad }, { libro_id: 2, cantidad: 1 }],
      [libro(primero), libro(segundo, 2)],
    );
    expect(resultado.errores).toEqual([]);
    const renglones = renglonesDe(resultado);
    expect(renglones[0]?.subtotal).toBe(subtotal1);
    expect(renglones[1]?.subtotal).toBe(subtotal2);
    expect(resultado.ok && resultado.total).toBe(total);
  });

  test("rechaza subtotal inseguro aunque cantidad y precio sean seguros", () => {
    const resultado = calcular(0.02, Number.MAX_SAFE_INTEGER);
    expect(resultado.errores[0]?.campo).toBe("cantidad");
    expect("total" in resultado).toBe(false);
  });

  test("rechaza total inseguro aunque cada subtotal sea seguro", () => {
    const resultado = calcularVenta(
      [{ libro_id: 1, cantidad: 1 }, { libro_id: 2, cantidad: 1 }],
      [libro(45035996273704.96), libro(45035996273704.96, 2)],
    );
    expect(resultado.errores[0]?.campo).toBe("renglones");
    expect("total" in resultado).toBe(false);
  });

  test("rechaza el mismo libro en dos renglones", () => {
    const resultado = calcularVenta(
      [{ libro_id: 1, cantidad: 1 }, { libro_id: 1, cantidad: 2 }],
      [libro(1500)],
    );
    expect(resultado.errores).toEqual([
      { campo: "renglones", mensaje: "Cada libro debe aparecer en un único renglón." },
    ]);
  });
});

describe("agregarRenglon", () => {
  test("agrega un libro existente con cantidad tomada del formulario sin mutar entradas", () => {
    const borrador: RenglonBorrador[] = [];
    const catalogo = [libro(1500)];
    const resultado = agregarRenglon(borrador, 1, "2", catalogo);
    expect(resultado).toEqual({
      ok: true,
      errores: [],
      renglones: [
        { libro_id: 1, titulo: "Libro de prueba", isbn: "978-1", cantidad: 2, precio_unitario: "1500.00", subtotal: "3000.00" },
      ],
      total: "3000.00",
    });
    expect(borrador).toEqual([]);
    expect(catalogo).toEqual([libro(1500)]);
  });

  test("acumula 2 más 1 en una sola fila sin modificar otro libro ni el borrador", () => {
    const catalogo = [libro(1500), libro(2000, 2)];
    const anterior = calcularVenta(
      [{ libro_id: 1, cantidad: 2 }, { libro_id: 2, cantidad: 1 }],
      catalogo,
    );
    const copia = structuredClone(anterior);
    const resultado = agregarRenglon(renglonesDe(anterior), 1, 1, catalogo);
    expect(resultado.errores).toEqual([]);
    const renglones = renglonesDe(resultado);
    expect(renglones).toHaveLength(2);
    expect(renglones[0]?.cantidad).toBe(3);
    expect(renglones[0]?.subtotal).toBe("4500.00");
    expect(renglones[1]).toEqual(renglonesDe(anterior)[1]);
    expect(resultado.ok && resultado.total).toBe("6500.00");
    expect(anterior).toEqual(copia);
  });

  test.each(["", " ", 0, -1, 1.5, "1.5", Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, null, true])(
    "rechaza cantidad %s aun al acumular y preserva las entradas",
    (cantidad) => {
      const catalogo = [libro(1500)];
      const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: 2 }];
      const resultado = agregarRenglon(borrador, 1, cantidad, catalogo);
      expect(resultado.errores).toHaveLength(1);
      expect(resultado.errores[0]?.campo).toBe("cantidad");
      expect(resultado.errores[0]?.mensaje).toBe("La cantidad debe ser un entero positivo seguro.");
      expect("renglones" in resultado).toBe(false);
      expect(borrador).toEqual([{ libro_id: 1, cantidad: 2 }]);
      expect(catalogo).toEqual([libro(1500)]);
    },
  );

  test("rechaza un libro inexistente sin modificar el borrador", () => {
    const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: 2 }];
    const resultado = agregarRenglon(borrador, 999, 1, [libro(1500)]);
    expect(resultado.errores[0]?.campo).toBe("libro");
    expect(resultado.errores[0]?.mensaje).toBe("Seleccione un libro existente.");
    expect("renglones" in resultado).toBe(false);
    expect(borrador).toEqual([{ libro_id: 1, cantidad: 2 }]);
  });

  test("rechaza acumulación de cantidades fuera del rango seguro", () => {
    const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: Number.MAX_SAFE_INTEGER }];
    const resultado = agregarRenglon(borrador, 1, 1, [libro(0.001)]);
    expect(resultado.errores[0]?.campo).toBe("cantidad");
    expect("renglones" in resultado).toBe(false);
    expect(borrador[0]?.cantidad).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("cambiarCantidad", () => {
  test("cambia la cantidad a 3 y recalcula sin modificar el borrador", () => {
    const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: 2 }];
    const resultado = cambiarCantidad(borrador, 1, "3", [libro(1500)]);
    expect(resultado.errores).toEqual([]);
    const renglones = renglonesDe(resultado);
    expect(renglones[0]?.cantidad).toBe(3);
    expect(renglones[0]?.subtotal).toBe("4500.00");
    expect(resultado.ok && resultado.total).toBe("4500.00");
    expect(borrador).toEqual([{ libro_id: 1, cantidad: 2 }]);
  });

  test.each(["", 0, -2, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rechaza %s y conserva el borrador",
    (cantidad) => {
      const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: 2 }];
      const resultado = cambiarCantidad(borrador, 1, cantidad, [libro(1500)]);
      expect(resultado.errores[0]?.campo).toBe("cantidad");
      expect("renglones" in resultado).toBe(false);
      expect(borrador).toEqual([{ libro_id: 1, cantidad: 2 }]);
    },
  );

  test("cambiar una fila inexistente informa error", () => {
    const resultado = cambiarCantidad([], 1, 1, [libro(1500)]);
    expect(resultado.errores).toEqual([
      { campo: "libro", mensaje: "El libro no pertenece al borrador." },
    ]);
  });
});

describe("quitarRenglon", () => {
  test("quitar el último renglón deja el total en cero sin modificar la entrada", () => {
    const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: 2 }];
    expect(quitarRenglon(borrador, 1, [libro(1500)])).toEqual({
      ok: true,
      errores: [],
      renglones: [],
      total: "0.00",
    });
    expect(borrador).toEqual([{ libro_id: 1, cantidad: 2 }]);
  });

  test("quitar un renglón conserva el otro y recalcula su total", () => {
    const catalogo = [libro(1500), libro(2000, 2)];
    const borrador: RenglonBorrador[] = [
      { libro_id: 1, cantidad: 2 },
      { libro_id: 2, cantidad: 1 },
    ];
    const resultado = quitarRenglon(borrador, 1, catalogo);
    expect(resultado.errores).toEqual([]);
    const renglones = renglonesDe(resultado);
    expect(renglones).toHaveLength(1);
    expect(renglones[0]?.libro_id).toBe(2);
    expect(resultado.ok && resultado.total).toBe("2000.00");
    expect(borrador).toHaveLength(2);
  });
});

const clientes = [{ id: 1, nombre: "Cliente de prueba", email: "cliente@ejemplo.test" }];

describe("validarVenta", () => {
  test("acepta cliente vigente y renglones válidos", () => {
    expect(validarVenta(1, [{ libro_id: 1, cantidad: 2 }], clientes, [libro(1500)])).toEqual([]);
  });

  test.each([[null], [undefined], [999]])(
    "rechaza cliente ausente o inexistente: %s",
    (clienteId) => {
      const errores = validarVenta(clienteId, [{ libro_id: 1, cantidad: 1 }], clientes, [libro(1500)]);
      expect(errores).toHaveLength(1);
      expect(errores[0]?.campo).toBe("cliente");
      expect(errores[0]?.mensaje).toBe("Seleccione un cliente existente.");
    },
  );

  test("rechaza borrador vacío", () => {
    const errores = validarVenta(1, [], clientes, [libro(1500)]);
    expect(errores[0]?.campo).toBe("renglones");
    expect(errores[0]?.mensaje).toBe("Agregue al menos un libro a la venta.");
  });

  test.each<[string, RenglonBorrador[], string]>([
    ["libro", [{ libro_id: 999, cantidad: 1 }], "libro"],
    ["cantidad", [{ libro_id: 1, cantidad: 0 }], "cantidad"],
    ["renglones duplicados", [{ libro_id: 1, cantidad: 1 }, { libro_id: 1, cantidad: 2 }], "renglones"],
  ])("rechaza %s inválidos", (_nombre, renglones, campo) => {
    const copia = structuredClone(renglones);
    expect(validarVenta(1, renglones, clientes, [libro(1500)])[0]?.campo).toBe(campo);
    expect(renglones).toEqual(copia);
  });
});

describe("construirVenta", () => {
  test("construye la venta completa sin identificador y con fecha suministrada", () => {
    const renglones = renglonesDe(calcular(1500.125, 2));
    const resultado = construirVenta(clientes[0] as ClienteRef, renglones, "2026-10-16T23:45:00.000Z");
    expect(resultado).toEqual({
      ok: true,
      errores: [],
      venta: {
        fecha: "2026-10-16T23:45:00.000Z",
        cliente: { id: 1, nombre: "Cliente de prueba", email: "cliente@ejemplo.test" },
        renglones: [
          { libro_id: 1, titulo: "Libro de prueba", isbn: "978-1", cantidad: 2, precio_unitario: "1500.13", subtotal: "3000.26" },
        ],
        total: "3000.26",
      },
    });
  });

  test("la instantánea no comparte referencias con cliente, catálogo ni borrador", () => {
    const cliente: ClienteRef = { ...(clientes[0] as ClienteRef) };
    const catalogo = [libro(1500.125)];
    const borrador = renglonesDe(calcularVenta([{ libro_id: 1, cantidad: 2 }], catalogo));
    const resultado = construirVenta(cliente, borrador, FECHA);
    cliente.nombre = "Modificado";
    (catalogo[0] as LibroVendible).titulo = "Modificado";
    (catalogo[0] as LibroVendible).isbn = "Otro";
    (catalogo[0] as LibroVendible).precio = 999;
    (borrador[0] as RenglonCalculado).titulo = "Modificado";
    (borrador[0] as RenglonCalculado).cantidad = 99;
    borrador.push({ libro_id: 7, titulo: "otro", isbn: "x", cantidad: 1, precio_unitario: "1.00", subtotal: "1.00" });
    if (!resultado.ok) throw new Error("se esperaba una venta");
    expect(resultado.venta.cliente.nombre).toBe("Cliente de prueba");
    expect(resultado.venta.renglones).toEqual([
      { libro_id: 1, titulo: "Libro de prueba", isbn: "978-1", cantidad: 2, precio_unitario: "1500.13", subtotal: "3000.26" },
    ]);
    expect(resultado.venta.total).toBe("3000.26");
  });

  test("conserva el unitario cero redondeado desde un precio positivo", () => {
    const resultado = construirVenta(clientes[0] as ClienteRef, renglonesDe(calcular(0.004, 2)), FECHA);
    expect(resultado.errores).toEqual([]);
    if (!resultado.ok) throw new Error("se esperaba una venta");
    expect(resultado.venta.renglones[0]?.precio_unitario).toBe("0.00");
    expect(resultado.venta.total).toBe("0.00");
  });

  const valido = (): RenglonCalculado[] => renglonesDe(calcular(1));
  test.each<[string, ClienteRef | null, () => RenglonCalculado[], string, string]>([
    ["cliente", null, valido, FECHA, "cliente"],
    ["renglones", clientes[0] as ClienteRef, () => [], FECHA, "renglones"],
    ["cantidad", clientes[0] as ClienteRef, () => [{ ...(valido()[0] as RenglonCalculado), cantidad: 0 }], FECHA, "cantidad"],
    ["precio unitario", clientes[0] as ClienteRef, () => [{ ...(valido()[0] as RenglonCalculado), precio_unitario: "abc" }], FECHA, "libro"],
    ["fecha", clientes[0] as ClienteRef, valido, "fecha inválida", "fecha"],
  ])("rechaza %s inválido sin producir venta", (_nombre, cliente, crearRenglones, fecha, campo) => {
    const renglones = crearRenglones();
    const copia = structuredClone(renglones);
    const resultado = construirVenta(cliente, renglones, fecha);
    expect(resultado.errores[0]?.campo).toBe(campo);
    expect("venta" in resultado).toBe(false);
    expect(renglones).toEqual(copia);
  });

  test("calcula el total en centavos y copia solo los campos del contrato", () => {
    const renglones = renglonesDe(
      calcularVenta(
        [{ libro_id: 1, cantidad: 3 }, { libro_id: 2, cantidad: 1 }],
        [libro(0.1), libro(0.2, 2)],
      ),
    );
    const conExtra = Object.assign(renglones[0] as RenglonCalculado, { extra: { mutable: true } });
    expect(conExtra.extra.mutable).toBe(true);
    const clienteConExtra = Object.assign({ ...(clientes[0] as ClienteRef) }, { extra: { mutable: true } });
    const resultado = construirVenta(clienteConExtra, renglones, FECHA);
    expect(resultado.errores).toEqual([]);
    if (!resultado.ok) throw new Error("se esperaba una venta");
    expect(resultado.venta.total).toBe("0.50");
    expect("extra" in (resultado.venta.renglones[0] as object)).toBe(false);
    expect("extra" in resultado.venta.cliente).toBe(false);
  });

  test("rechaza renglones duplicados", () => {
    const renglon = renglonesDe(calcular(1))[0] as RenglonCalculado;
    const resultado = construirVenta(clientes[0] as ClienteRef, [renglon, { ...renglon }], FECHA);
    expect(resultado.errores[0]?.campo).toBe("renglones");
    expect("venta" in resultado).toBe(false);
  });

  test("rechaza fecha sin hora ISO", () => {
    const resultado = construirVenta(clientes[0] as ClienteRef, renglonesDe(calcular(1)), "2026-01-06");
    expect(resultado.errores[0]?.campo).toBe("fecha");
    expect(resultado.errores[0]?.mensaje).toBe("La fecha de confirmación no es válida.");
    expect("venta" in resultado).toBe(false);
  });

  test("rechaza subtotal alterado en vez de confirmar una venta distinta", () => {
    const renglones = renglonesDe(calcular(1500, 2));
    (renglones[0] as RenglonCalculado).subtotal = "3001.00";
    const resultado = construirVenta(clientes[0] as ClienteRef, renglones, FECHA);
    expect(resultado.errores[0]?.campo).toBe("renglones");
    expect("venta" in resultado).toBe(false);
    expect(renglones[0]?.subtotal).toBe("3001.00");
  });
});
