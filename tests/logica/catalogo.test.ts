import { describe, expect, test } from "vitest";
import {
  estadoDelListado,
  filtrarPorTitulo,
  nombreGenero,
  nombresAutores,
} from "../../src/logica/catalogo";
import { normalizarTexto } from "../../src/logica/texto";
import { librosDeEjemplo } from "../fixtures/libros-de-ejemplo";

describe("filtrarPorTitulo", () => {
  test("filtra sin distinguir mayúsculas de minúsculas", () => {
    const resultado = filtrarPorTitulo(librosDeEjemplo, "FARO DE");
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.titulo).toBe("El faro de los vientos");
  });

  test("encuentra coincidencias parciales dentro del título", () => {
    const resultado = filtrarPorTitulo(librosDeEjemplo, "cartas");
    expect(resultado).toHaveLength(1);
    expect(resultado[0]?.titulo).toBe("Cartas desde el sur");

    const varios = filtrarPorTitulo(librosDeEjemplo, "a");
    expect(varios.length).toBeGreaterThan(1);
  });

  test("elimina los espacios de los extremos de la búsqueda", () => {
    const directo = filtrarPorTitulo(librosDeEjemplo, "faro");
    const conEspacios = filtrarPorTitulo(librosDeEjemplo, "   faro   ");
    expect(conEspacios).toEqual(directo);
    expect(conEspacios).toHaveLength(1);
  });

  test("una búsqueda vacía o de solo espacios muestra todo el catálogo", () => {
    expect(filtrarPorTitulo(librosDeEjemplo, "")).toHaveLength(librosDeEjemplo.length);
    expect(filtrarPorTitulo(librosDeEjemplo, "   ")).toHaveLength(librosDeEjemplo.length);
  });

  test("una búsqueda sin coincidencias devuelve un arreglo vacío", () => {
    expect(filtrarPorTitulo(librosDeEjemplo, "zzzzz")).toEqual([]);
  });

  test("funciona con la normalización de texto", () => {
    expect(normalizarTexto("  Mapas  ")).toBe("mapas");
    expect(filtrarPorTitulo(librosDeEjemplo, "  MAPAS  ")).toHaveLength(1);
  });

  test("no modifica la lista recibida", () => {
    const copia = structuredClone(librosDeEjemplo);
    filtrarPorTitulo(librosDeEjemplo, "faro");
    expect(librosDeEjemplo).toEqual(copia);
  });
});

describe("nombreGenero", () => {
  test("devuelve «Sin clasificar» cuando el libro no tiene género", () => {
    expect(nombreGenero(null)).toBe("Sin clasificar");
  });

  test("devuelve el nombre del género cuando existe", () => {
    expect(nombreGenero({ id: 1, nombre: "Novela" })).toBe("Novela");
    expect(nombreGenero({ id: 2, nombre: "Ensayo" })).toBe("Ensayo");
  });
});

describe("nombresAutores", () => {
  test("un autor da su nombre", () => {
    expect(
      nombresAutores([{ autor_id: 1, nombre: "Marta Ibáñez", rol: "autor", orden: 1 }]),
    ).toBe("Marta Ibáñez");
  });

  test("une varios autores con coma en el orden de «orden», no en el recibido", () => {
    expect(
      nombresAutores([
        { autor_id: 2, nombre: "Tomás Quiroga", rol: "autor", orden: 2 },
        { autor_id: 3, nombre: "Elena Varela", rol: "autor", orden: 1 },
      ]),
    ).toBe("Elena Varela, Tomás Quiroga");
  });

  test("sin autores devuelve vacío y no modifica el arreglo recibido", () => {
    expect(nombresAutores([])).toBe("");
    const autores = [
      { autor_id: 2, nombre: "B", rol: "autor", orden: 2 },
      { autor_id: 1, nombre: "A", rol: "autor", orden: 1 },
    ] as const;
    const copia = structuredClone(autores);
    nombresAutores([...autores]);
    expect(autores).toEqual(copia);
  });
});

describe("estadoDelListado", () => {
  test("distingue vacío, sin resultados y con resultados", () => {
    expect(estadoDelListado(0, 0)).toBe("vacio");
    expect(estadoDelListado(6, 0)).toBe("sin-resultados");
    expect(estadoDelListado(6, 2)).toBe("con-resultados");
  });
});
