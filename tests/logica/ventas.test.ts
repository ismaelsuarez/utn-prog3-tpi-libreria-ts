import { describe, expect, test } from "vitest";
import {
  agregarRenglon,
  calcularVenta,
  cambiarCantidad,
  codigoDeVenta,
  mensajeDeVentaFallida,
  quitarRenglon,
  validarVenta,
  ventaNuevaDesdeBorrador,
  type LibroVendible,
  type RenglonBorrador,
  type RenglonCalculado,
} from "../../src/logica/ventas";

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

describe("cantidad máxima de la API (2 147 483 647)", () => {
  const MAXIMO = 2_147_483_647;

  test("acepta exactamente el máximo", () => {
    const resultado = calcular(1, MAXIMO);
    expect(resultado.ok).toBe(true);
    expect(renglonesDe(resultado)[0]?.cantidad).toBe(MAXIMO);
  });

  test("rechaza el siguiente, señala la cantidad y no entrega renglones", () => {
    const resultado = calcular(1, MAXIMO + 1);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toEqual([
      { campo: "cantidad", mensaje: "La cantidad no puede superar 2 147 483 647." },
    ]);
    expect("renglones" in resultado).toBe(false);
  });

  test("agregarRenglon rechaza una cantidad mayor que el máximo", () => {
    const resultado = agregarRenglon([], 1, MAXIMO + 1, [libro(1500)]);
    expect(resultado.errores).toEqual([
      { campo: "cantidad", mensaje: "La cantidad no puede superar 2 147 483 647." },
    ]);
  });

  test("agregarRenglon rechaza la acumulación que supera el máximo sin modificar el borrador", () => {
    const borrador: RenglonBorrador[] = [{ libro_id: 1, cantidad: MAXIMO }];
    const resultado = agregarRenglon(borrador, 1, 1, [libro(1)]);
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0]?.campo).toBe("cantidad");
    expect(resultado.errores[0]?.mensaje).toBe("La cantidad no puede superar 2 147 483 647.");
    expect(borrador).toEqual([{ libro_id: 1, cantidad: MAXIMO }]);
  });

  test("cambiarCantidad rechaza una cantidad mayor que el máximo", () => {
    const resultado = cambiarCantidad([{ libro_id: 1, cantidad: 1 }], 1, MAXIMO + 1, [libro(1500)]);
    expect(resultado.errores[0]?.mensaje).toBe("La cantidad no puede superar 2 147 483 647.");
  });

  test("una cantidad no entera, cero o negativa conserva su mensaje de siempre", () => {
    for (const cantidad of [0, -1, 1.5, "abc", ""]) {
      expect(agregarRenglon([], 1, cantidad, [libro(1500)]).errores).toEqual([
        { campo: "cantidad", mensaje: "La cantidad debe ser un entero positivo seguro." },
      ]);
    }
  });
});

describe("codigoDeVenta", () => {
  test("muestra el identificador entero con el formato ven-XX de la versión anterior", () => {
    expect(codigoDeVenta(1)).toBe("ven-01");
    expect(codigoDeVenta(7)).toBe("ven-07");
    expect(codigoDeVenta(12)).toBe("ven-12");
  });

  test("no recorta los identificadores de más de dos dígitos", () => {
    expect(codigoDeVenta(123)).toBe("ven-123");
  });
});

describe("ventaNuevaDesdeBorrador: cuerpo de POST /ventas/", () => {
  test("lleva solo el cliente y, por renglón, el libro y la cantidad", () => {
    const cuerpo = ventaNuevaDesdeBorrador(2, [
      { libro_id: 1, cantidad: 2 },
      { libro_id: 4, cantidad: 1 },
    ]);
    expect(JSON.stringify(cuerpo)).toBe(
      '{"cliente_id":2,"renglones":[{"libro_id":1,"cantidad":2},{"libro_id":4,"cantidad":1}]}',
    );
  });

  test("descarta cualquier otro dato del renglón calculado (título, ISBN, importes) y pasa las cantidades a número", () => {
    const calculado = renglonesDe(calcularVenta([{ libro_id: 1, cantidad: "3" }], [libro(10)]));
    expect(ventaNuevaDesdeBorrador(5, calculado)).toEqual({
      cliente_id: 5,
      renglones: [{ libro_id: 1, cantidad: 3 }],
    });
    expect(ventaNuevaDesdeBorrador(5, [{ libro_id: 1, cantidad: "3" }]).renglones[0]?.cantidad).toBe(3);
  });
});

describe("venta sin control de stock", () => {
  test("una cantidad mayor que el stock del libro se acepta en el borrador", () => {
    const conStock = { ...libro(100), stock: 10 };
    const resultado = agregarRenglon([], 1, 12, [conStock]);
    expect(resultado.ok).toBe(true);
    expect(renglonesDe(resultado)[0]?.cantidad).toBe(12);
    expect(conStock.stock).toBe(10);
  });
});

describe("mensajeDeVentaFallida", () => {
  const sinCampos: [] = [];

  test("un rechazo de la API se muestra con su mensaje y avisa que el borrador se conserva", () => {
    const mensaje = mensajeDeVentaFallida({
      porCampo: sinCampos,
      deLaOperacion: "No se pudo registrar la venta: cliente o libros invalidos",
      resultadoIncierto: false,
      estado: 409,
    });
    expect(mensaje).toBe("No se pudo registrar la venta: cliente o libros invalidos. El borrador se conserva.");
  });

  test("un 422 junta los mensajes de cada campo", () => {
    expect(
      mensajeDeVentaFallida({
        porCampo: [
          { campo: "cliente", mensaje: "Input should be a valid integer" },
          { campo: "renglones", mensaje: "Libro repetido" },
        ],
        deLaOperacion: null,
        resultadoIncierto: false,
        estado: 422,
      }),
    ).toBe("Input should be a valid integer. Libro repetido. El borrador se conserva.");
  });

  test("una falta de respuesta dice que no se sabe si se registró y manda al Historial, sin reenvío automático", () => {
    const mensaje = mensajeDeVentaFallida({
      porCampo: sinCampos,
      deLaOperacion: "No se pudo confirmar si el servidor registró la operación. Revisá los datos antes de reintentar.",
      resultadoIncierto: true,
      estado: null,
    });
    expect(mensaje).toBe(
      "No se pudo confirmar si la venta se registró. Revisá el Historial antes de reintentar: " +
        "el borrador se conserva y no se vuelve a enviar solo.",
    );
  });
});
