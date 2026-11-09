import { describe, expect, test } from "vitest";
import { datosIniciales } from "../../../src/datos/local/datos-iniciales";

const { editoriales, generos, autores, libros, clientes } = datosIniciales;

describe("datos iniciales", () => {
  test("cumplen los mínimos exigidos por la consigna", () => {
    expect(libros.length).toBeGreaterThanOrEqual(6);
    expect(editoriales.length).toBeGreaterThanOrEqual(2);
    expect(generos.length).toBeGreaterThanOrEqual(2);
    expect(autores.length).toBeGreaterThanOrEqual(3);
    expect(clientes.length).toBeGreaterThanOrEqual(3);
  });

  test("los identificadores son únicos dentro de cada entidad", () => {
    const colecciones = { editoriales, generos, autores, libros, clientes };
    for (const [nombre, registros] of Object.entries(colecciones)) {
      const ids = registros.map((registro) => registro.id);
      expect(new Set(ids).size, `IDs duplicados en ${nombre}`).toBe(ids.length);
    }
  });

  test("los identificadores siguen el esquema prefijo + contador", () => {
    const esperado: Array<[string, readonly { id: string }[]]> = [
      ["edi", editoriales],
      ["gen", generos],
      ["aut", autores],
      ["lib", libros],
      ["cli", clientes],
    ];
    for (const [prefijo, registros] of esperado) {
      for (const registro of registros) {
        expect(registro.id).toMatch(new RegExp(`^${prefijo}-\\d{2}$`));
      }
    }
  });

  test("cada libro referencia editorial, género opcional y autores existentes", () => {
    const idsEditoriales = new Set(editoriales.map((e) => e.id));
    const idsGeneros = new Set(generos.map((g) => g.id));
    const idsAutores = new Set(autores.map((a) => a.id));

    for (const libro of libros) {
      expect(idsEditoriales.has(libro.editorialId), `${libro.id}: editorial inexistente`).toBe(true);
      if (libro.generoId !== null) {
        expect(idsGeneros.has(libro.generoId), `${libro.id}: género inexistente`).toBe(true);
      }
      expect(libro.autorIds.length, `${libro.id}: sin autores`).toBeGreaterThanOrEqual(1);
      for (const autorId of libro.autorIds) {
        expect(idsAutores.has(autorId), `${libro.id}: autor inexistente`).toBe(true);
      }
    }
  });

  test("el conjunto inicial incluye los casos exigidos", () => {
    expect(libros.some((l) => l.generoId === null)).toBe(true);
    expect(libros.some((l) => l.autorIds.length > 1)).toBe(true);
    expect(libros.some((l) => l.precio === 1500)).toBe(true);
    expect(libros.some((l) => l.precio === 2000)).toBe(true);
  });

  test("las entidades tienen sus propiedades según el modelo", () => {
    for (const libro of libros) {
      for (const propiedad of ["id", "titulo", "isbn", "precio", "editorialId", "generoId", "autorIds"]) {
        expect(propiedad in libro, `libro ${libro.id} sin ${propiedad}`).toBe(true);
      }
      expect(typeof libro.precio).toBe("number");
      expect(libro.precio, `${libro.id}: precio mayor que cero`).toBeGreaterThan(0);
    }
    for (const cliente of clientes) {
      expect("id" in cliente && "nombreCompleto" in cliente && "email" in cliente, `cliente ${cliente.id}`).toBe(true);
    }
  });

  test("editoriales y autores suman el país y la nacionalidad que exige la forma de la API", () => {
    for (const editorial of editoriales) {
      expect(editorial.pais.trim(), editorial.id).not.toBe("");
    }
    for (const autor of autores) {
      expect(autor.nacionalidad.trim(), autor.id).not.toBe("");
    }
  });
});
