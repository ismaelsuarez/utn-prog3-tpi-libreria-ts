import { afterEach, describe, expect, test } from "vitest";
import { obtenerAlmacenamientoDelNavegador } from "../../src/datos/local/almacen-local";
import { crearProveedor } from "../../src/datos/proveedor";
import { datosIniciales } from "../../src/datos/local/datos-iniciales";

interface StorageSimulado {
  escrituras: string[];
  contenido: Record<string, string>;
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
}

function crearStorage(contenidoInicial: Record<string, string> = {}): StorageSimulado {
  const claves: Record<string, string> = { ...contenidoInicial };
  const storage: StorageSimulado = {
    escrituras: [],
    contenido: claves,
    getItem: (clave) => (Object.hasOwn(claves, clave) ? (claves[clave] as string) : null),
    setItem: (clave, valor) => {
      storage.escrituras.push(clave);
      claves[clave] = String(valor);
    },
  };
  return storage;
}

describe("crearProveedor", () => {
  test("siembra una sola vez las claves ausentes", () => {
    const storage = crearStorage();
    crearProveedor(storage);

    expect(storage.escrituras).toEqual(["libreria.libros", "libreria.clientes", "libreria.ventas"]);
    expect(JSON.parse(storage.contenido["libreria.libros"] as string)).toEqual(datosIniciales.libros);
    expect(storage.contenido["libreria.ventas"]).toBe("[]");

    // Una segunda composición sobre el mismo almacenamiento no vuelve a sembrar.
    crearProveedor(storage);
    expect(storage.escrituras).toHaveLength(3);
  });

  test("respeta las claves presentes", () => {
    const libros = JSON.stringify([
      { id: "lib-77", titulo: "Guardado", isbn: "1", precio: 10, editorialId: "edi-01", generoId: null, autorIds: ["aut-01"] },
    ]);
    const storage = crearStorage({ "libreria.libros": libros });
    crearProveedor(storage);

    expect(storage.escrituras).toEqual(["libreria.clientes", "libreria.ventas"]);
    expect(storage.contenido["libreria.libros"]).toBe(libros);
  });

  test("entrega los seis repositorios, que ven lo sembrado", async () => {
    const repos = crearProveedor(crearStorage());
    expect(Object.keys(repos).sort()).toEqual(["autores", "clientes", "editoriales", "generos", "libros", "ventas"]);
    expect(await repos.libros.listar()).toHaveLength(6);
    expect(await repos.ventas.listar()).toEqual([]);
  });

  test("sin almacenamiento sigue funcionando con los ejemplos", async () => {
    const repos = crearProveedor(null);
    expect(await repos.libros.listar()).toHaveLength(6);
    expect(await repos.clientes.listar()).toHaveLength(3);
  });
});

describe("obtenerAlmacenamientoDelNavegador", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  test("fuera de un navegador devuelve null", () => {
    expect(obtenerAlmacenamientoDelNavegador()).toBeNull();
  });

  test("devuelve el almacenamiento de la ventana", () => {
    const storage = crearStorage();
    Object.defineProperty(globalThis, "window", { value: { localStorage: storage }, configurable: true });
    expect(obtenerAlmacenamientoDelNavegador()).toBe(storage);
  });

  test("si el acceso está bloqueado devuelve null en lugar de lanzar", () => {
    const ventana = {};
    Object.defineProperty(ventana, "localStorage", {
      get: () => {
        throw new Error("Acceso al almacenamiento bloqueado");
      },
    });
    Object.defineProperty(globalThis, "window", { value: ventana, configurable: true });
    expect(obtenerAlmacenamientoDelNavegador()).toBeNull();
  });
});
