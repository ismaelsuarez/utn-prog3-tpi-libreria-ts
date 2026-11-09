import { describe, expect, test } from "vitest";
import {
  aCentavos,
  aDinero,
  centavosADinero,
  formatearImporte,
} from "../../src/logica/dinero";

describe("aCentavos", () => {
  test("redondea al centavo con mitades hacia arriba sin error de punto flotante", () => {
    expect(aCentavos(1.005)).toBe(101);
    expect(aCentavos(1.004)).toBe(100);
    expect(aCentavos(0.005)).toBe(1);
  });

  test("convierte un número y un texto decimal al mismo valor", () => {
    expect(aCentavos(2350.5)).toBe(235050);
    expect(aCentavos("2350.50")).toBe(235050);
    expect(aCentavos("1500")).toBe(150000);
    expect(aCentavos(0)).toBe(0);
  });

  test("devuelve null para negativos y valores no finitos", () => {
    expect(aCentavos(-1)).toBeNull();
    expect(aCentavos(Number.NaN)).toBeNull();
    expect(aCentavos(Number.POSITIVE_INFINITY)).toBeNull();
  });

  test("devuelve null para un texto que no es un decimal no negativo", () => {
    expect(aCentavos("")).toBeNull();
    expect(aCentavos("abc")).toBeNull();
    expect(aCentavos("-5")).toBeNull();
    expect(aCentavos("12.3.4")).toBeNull();
  });

  test("devuelve null si el resultado excede el rango de enteros seguros", () => {
    expect(aCentavos(1e21)).toBeNull();
  });
});

describe("centavosADinero", () => {
  test("formatea con dos decimales", () => {
    expect(centavosADinero(235050)).toBe("2350.50");
    expect(centavosADinero(5)).toBe("0.05");
    expect(centavosADinero(0)).toBe("0.00");
  });
});

describe("aDinero", () => {
  test("convierte un número a texto con dos decimales", () => {
    expect(aDinero(2350.5)).toBe("2350.50");
    expect(aDinero(1990.9)).toBe("1990.90");
    expect(aDinero(1500)).toBe("1500.00");
  });

  test("normaliza un texto decimal", () => {
    expect(aDinero("1500")).toBe("1500.00");
    expect(aDinero("1500.5")).toBe("1500.50");
    expect(aDinero("25000.00")).toBe("25000.00");
  });

  test("redondea la suma imprecisa de dos decimales", () => {
    expect(aDinero(0.1 + 0.2)).toBe("0.30");
  });

  test("devuelve null si el valor no es un importe utilizable", () => {
    expect(aDinero(-1)).toBeNull();
    expect(aDinero("abc")).toBeNull();
  });
});

describe("formatearImporte", () => {
  test("muestra el texto decimal con símbolo y coma decimal", () => {
    expect(formatearImporte("1500.00")).toBe("$ 1500,00");
    expect(formatearImporte("0.50")).toBe("$ 0,50");
  });

  test("normaliza un texto sin decimales y acepta un número", () => {
    expect(formatearImporte("2000")).toBe("$ 2000,00");
    expect(formatearImporte(2350.5)).toBe("$ 2350,50");
  });

  test("rechaza un valor que no es un importe", () => {
    expect(() => formatearImporte("abc")).toThrow(RangeError);
  });
});
