import { describe, expect, test } from "vitest";
import { crearAlmacenLocal } from "../../../src/datos/local/almacen-local";
import { crearRepositoriosLocales } from "../../../src/datos/local/repositorios-locales";
import { ErrorDeRepositorio } from "../../../src/datos/errores";
import type { LibroLocal } from "../../../src/datos/local/tipos-locales";

interface StorageSimulado {
  escrituras: string[];
  contenido: Record<string, string>;
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
}

function crearStorage(): StorageSimulado {
  const claves: Record<string, string> = {};
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

const FECHA = new Date("2026-11-09T12:00:00.000Z");

/** Repositorios sobre un almacenamiento simulado ya sembrado con los ejemplos. */
function preparar() {
  const storage = crearStorage();
  const almacen = crearAlmacenLocal(storage);
  almacen.inicializar();
  storage.escrituras.length = 0;
  const repos = crearRepositoriosLocales(almacen, { ahora: () => FECHA });
  const guardado = <T>(clave: string): T => JSON.parse(storage.contenido[clave] as string) as T;
  return { storage, almacen, repos, guardado };
}

describe("RepositorioLibros: lectura", () => {
  test("entrega los libros con identificador entero, precio como texto decimal y relaciones anidadas", async () => {
    const { repos } = preparar();
    const libros = await repos.libros.listar();

    expect(libros).toHaveLength(6);
    expect(libros[0]).toEqual({
      id: 1,
      isbn: "978-987-000-001-1",
      titulo: "El faro de los vientos",
      precio: "1500.00",
      stock: 0,
      editorial: { id: 1, nombre: "Ediciones del Puerto" },
      genero: { id: 1, nombre: "Novela" },
      autores: [{ autor_id: 1, nombre: "Marta Ibáñez", rol: "autor", orden: 1 }],
    });
  });

  test("convierte el precio numérico con las reglas de centavos: 2350.5 → «2350.50»", async () => {
    const { repos } = preparar();
    const libros = await repos.libros.listar();
    expect(libros[2]?.precio).toBe("2350.50");
    expect(libros[5]?.precio).toBe("1990.90");
  });

  test("un libro sin género entrega genero null", async () => {
    const { repos } = preparar();
    const libros = await repos.libros.listar();
    expect(libros[3]?.titulo).toBe("La casa del río");
    expect(libros[3]?.genero).toBeNull();
  });

  test("los autores conservan su posición en «orden» (1, 2, …)", async () => {
    const { repos } = preparar();
    const libro = (await repos.libros.listar())[2];
    expect(libro?.autores).toEqual([
      { autor_id: 3, nombre: "Elena Varela", rol: "autor", orden: 1 },
      { autor_id: 2, nombre: "Tomás Quiroga", rol: "autor", orden: 2 },
    ]);
  });

  test("el libro guardado como lib-07 se entrega con id 7 y obtener(7) lo devuelve", async () => {
    const { almacen, repos } = preparar();
    const nuevo: Omit<LibroLocal, "id"> = {
      titulo: "Libro siete",
      isbn: "978-987-000-077-6",
      precio: 999,
      editorialId: "edi-02",
      generoId: "gen-02",
      autorIds: ["aut-01"],
    };
    expect(almacen.agregarLibro(nuevo).id).toBe("lib-07");

    const listado = await repos.libros.listar();
    expect(listado.at(-1)?.id).toBe(7);
    const obtenido = await repos.libros.obtener(7);
    expect(obtenido.titulo).toBe("Libro siete");
    expect(obtenido.editorial).toEqual({ id: 2, nombre: "Editorial Brújula" });
  });

  test("obtener un identificador inexistente rechaza la promesa", async () => {
    const { repos } = preparar();
    await expect(repos.libros.obtener(99)).rejects.toThrow("No existe el libro 99.");
    await expect(repos.libros.obtener(99)).rejects.toBeInstanceOf(ErrorDeRepositorio);
  });

  test("listar aplica el filtro por título, por género y la paginación", async () => {
    const { repos } = preparar();
    expect((await repos.libros.listar({ titulo: "FARO" })).map((l) => l.id)).toEqual([1]);
    expect((await repos.libros.listar({ genero_id: 2 })).map((l) => l.id)).toEqual([3, 5]);
    expect((await repos.libros.listar({ limit: 2, offset: 1 })).map((l) => l.id)).toEqual([2, 3]);
    expect(await repos.libros.listar({ titulo: "zzzz" })).toEqual([]);
  });

  test("una referencia a una editorial inexistente no rompe el listado", async () => {
    const { storage, repos } = preparar();
    const libros = JSON.parse(storage.contenido["libreria.libros"] as string) as LibroLocal[];
    storage.contenido["libreria.libros"] = JSON.stringify([
      { ...(libros[0] as LibroLocal), editorialId: "edi-99", autorIds: ["aut-99", "aut-02"] },
    ]);
    const [libro] = await repos.libros.listar();
    expect(libro?.editorial).toEqual({ id: 99, nombre: "" });
    expect(libro?.autores.map((a) => a.nombre)).toEqual(["Tomás Quiroga"]);
  });
});

describe("RepositorioLibros: alta", () => {
  test("crear guarda el libro con el formato local anterior y descarta el stock recibido", async () => {
    const { repos, guardado } = preparar();
    const creado = await repos.libros.crear({
      isbn: "978-987-000-088-3",
      titulo: "La torre de los sueños",
      precio: "1750.50",
      stock: 25,
      editorial_id: 1,
      genero_id: 1,
      autores: [
        { autor_id: 3, rol: "autor", orden: 2 },
        { autor_id: 1, rol: "autor", orden: 1 },
      ],
    });

    expect(creado).toEqual({
      id: 7,
      isbn: "978-987-000-088-3",
      titulo: "La torre de los sueños",
      precio: "1750.50",
      stock: 0,
      editorial: { id: 1, nombre: "Ediciones del Puerto" },
      genero: { id: 1, nombre: "Novela" },
      autores: [
        { autor_id: 1, nombre: "Marta Ibáñez", rol: "autor", orden: 1 },
        { autor_id: 3, nombre: "Elena Varela", rol: "autor", orden: 2 },
      ],
    });
    const lista = guardado<LibroLocal[]>("libreria.libros");
    expect(lista).toHaveLength(7);
    expect(lista[6]).toEqual({
      titulo: "La torre de los sueños",
      isbn: "978-987-000-088-3",
      precio: 1750.5,
      editorialId: "edi-01",
      generoId: "gen-01",
      autorIds: ["aut-01", "aut-03"],
      id: "lib-07",
    });
  });

  test("sin género guarda generoId null; un precio numérico se guarda tal cual", async () => {
    const { repos, guardado } = preparar();
    const creado = await repos.libros.crear({
      isbn: "978-987-000-089-0",
      titulo: "Sin género",
      precio: 1490,
      stock: 0,
      editorial_id: 2,
      autores: [{ autor_id: 2, rol: "autor", orden: 1 }],
    });
    expect(creado.genero).toBeNull();
    expect(creado.precio).toBe("1490.00");
    expect(guardado<LibroLocal[]>("libreria.libros")[6]).toMatchObject({ generoId: null, precio: 1490 });
  });

  test("una editorial, género, autor o precio inválido rechaza sin escribir", async () => {
    const { repos, storage } = preparar();
    const base = {
      isbn: "978-987-000-090-6",
      titulo: "T",
      precio: "10.00",
      stock: 0,
      editorial_id: 1,
      autores: [{ autor_id: 1, rol: "autor" as const, orden: 1 }],
    };
    await expect(repos.libros.crear({ ...base, editorial_id: 99 })).rejects.toThrow("No existe la editorial 99.");
    await expect(repos.libros.crear({ ...base, genero_id: 99 })).rejects.toThrow("No existe el género 99.");
    await expect(
      repos.libros.crear({ ...base, autores: [{ autor_id: 99, rol: "autor", orden: 1 }] }),
    ).rejects.toThrow("No existe el autor 99.");
    await expect(repos.libros.crear({ ...base, precio: "abc" })).rejects.toThrow("El precio no es un importe válido.");
    expect(storage.escrituras).toEqual([]);
  });
});

describe("catálogos", () => {
  test("editoriales, géneros y autores se entregan con id entero y la forma de la API", async () => {
    const { repos } = preparar();
    expect(await repos.editoriales.listar()).toEqual([
      { id: 1, nombre: "Ediciones del Puerto", pais: "Argentina" },
      { id: 2, nombre: "Editorial Brújula", pais: "Argentina" },
    ]);
    expect(await repos.generos.listar()).toEqual([
      { id: 1, nombre: "Novela" },
      { id: 2, nombre: "Ensayo" },
    ]);
    expect((await repos.autores.listar())[2]).toEqual({ id: 3, nombre: "Elena Varela", nacionalidad: "Argentina" });
  });
});

describe("RepositorioClientes", () => {
  test("entrega nombre y perfil null cuando el cliente no tiene teléfono", async () => {
    const { repos } = preparar();
    const clientes = await repos.clientes.listar();
    expect(clientes).toHaveLength(3);
    expect(clientes[0]).toEqual({
      id: 1,
      nombre: "Laura Mendoza",
      email: "laura.mendoza@correo.test",
      perfil: null,
    });
  });

  test("crear + crearPerfil guardan el cliente con el formato local anterior", async () => {
    const { repos, guardado } = preparar();
    const cliente = await repos.clientes.crear({ nombre: "Bruno Lagos", email: "bruno.lagos@correo.test" });
    expect(cliente).toEqual({ id: 4, nombre: "Bruno Lagos", email: "bruno.lagos@correo.test", perfil: null });

    const perfil = await repos.clientes.crearPerfil(4, { telefono: "11 5555-0123" });
    expect(perfil).toEqual({ id: 4, cliente_id: 4, telefono: "11 5555-0123", direccion: null });

    expect(guardado<unknown[]>("libreria.clientes")[3]).toEqual({
      nombreCompleto: "Bruno Lagos",
      email: "bruno.lagos@correo.test",
      telefono: "11 5555-0123",
      id: "cli-04",
    });
    expect((await repos.clientes.obtener(4)).perfil).toEqual(perfil);
  });

  test("actualizar cambia nombre y email y conserva el teléfono", async () => {
    const { repos } = preparar();
    await repos.clientes.crear({ nombre: "Bruno Lagos", email: "bruno.lagos@correo.test" });
    await repos.clientes.crearPerfil(4, { telefono: "11 5555-0123" });

    const actualizado = await repos.clientes.actualizar(4, { nombre: "Bruno A. Lagos", email: "bruno@correo.test" });
    expect(actualizado).toEqual({
      id: 4,
      nombre: "Bruno A. Lagos",
      email: "bruno@correo.test",
      perfil: { id: 4, cliente_id: 4, telefono: "11 5555-0123", direccion: null },
    });
  });

  test("actualizarTelefono cambia solo el teléfono", async () => {
    const { repos, guardado } = preparar();
    const actualizado = await repos.clientes.actualizarTelefono(2, "11 4444-0000");
    expect(actualizado.nombre).toBe("Ricardo Soria");
    expect(actualizado.perfil?.telefono).toBe("11 4444-0000");
    expect(guardado<unknown[]>("libreria.clientes")[1]).toEqual({
      id: "cli-02",
      nombreCompleto: "Ricardo Soria",
      email: "ricardo.soria@correo.test",
      telefono: "11 4444-0000",
    });
  });

  test("un cliente inexistente rechaza obtener, crearPerfil, actualizar y actualizarTelefono", async () => {
    const { repos, storage } = preparar();
    await expect(repos.clientes.obtener(99)).rejects.toThrow("No existe el cliente 99.");
    await expect(repos.clientes.crearPerfil(99, { telefono: "1234567" })).rejects.toThrow("No existe el cliente 99.");
    await expect(repos.clientes.actualizar(99, { nombre: "X" })).rejects.toThrow("No existe el cliente 99.");
    await expect(repos.clientes.actualizarTelefono(99, "1234567")).rejects.toThrow("No existe el cliente 99.");
    expect(storage.escrituras).toEqual([]);
  });
});

describe("RepositorioVentas", () => {
  test("entrega una venta guardada con la forma de la API e importes Dinero", async () => {
    const { storage, repos } = preparar();
    storage.contenido["libreria.ventas"] = JSON.stringify([
      {
        id: "ven-01",
        fecha: "2026-10-16T23:45:00.000Z",
        cliente: { id: "cli-02", nombreCompleto: "Ricardo Soria", email: "ricardo.soria@correo.test" },
        renglones: [
          { libroId: "lib-03", titulo: "Mapas para perderse", isbn: "978-987-000-003-5", cantidad: 2, precioUnitario: 2350.5, subtotal: 4701 },
        ],
        total: 4701,
      },
    ]);
    expect(await repos.ventas.listar()).toEqual([
      {
        id: 1,
        fecha: "2026-10-16T23:45:00.000Z",
        total: "4701.00",
        cliente: { id: 2, nombre: "Ricardo Soria", email: "ricardo.soria@correo.test" },
        renglones: [
          { libro_id: 3, titulo: "Mapas para perderse", cantidad: 2, precio_unitario: "2350.50", subtotal: "4701.00" },
        ],
      },
    ]);
  });

  test("crear copia el precio vigente, calcula subtotales y total y los conserva si el precio cambia", async () => {
    const { storage, repos, guardado } = preparar();
    const venta = await repos.ventas.crear({
      cliente_id: 1,
      renglones: [
        { libro_id: 1, cantidad: 2 },
        { libro_id: 2, cantidad: 1 },
      ],
    });

    expect(venta).toEqual({
      id: 1,
      fecha: "2026-11-09T12:00:00.000Z",
      total: "5000.00",
      cliente: { id: 1, nombre: "Laura Mendoza", email: "laura.mendoza@correo.test" },
      renglones: [
        { libro_id: 1, titulo: "El faro de los vientos", cantidad: 2, precio_unitario: "1500.00", subtotal: "3000.00" },
        { libro_id: 2, titulo: "Cartas desde el sur", cantidad: 1, precio_unitario: "2000.00", subtotal: "2000.00" },
      ],
    });
    // Formato guardado idéntico al de la versión anterior (con ISBN y números).
    expect(guardado<unknown[]>("libreria.ventas")).toEqual([
      {
        id: "ven-01",
        fecha: "2026-11-09T12:00:00.000Z",
        cliente: { id: "cli-01", nombreCompleto: "Laura Mendoza", email: "laura.mendoza@correo.test" },
        renglones: [
          { libroId: "lib-01", titulo: "El faro de los vientos", isbn: "978-987-000-001-1", cantidad: 2, precioUnitario: 1500, subtotal: 3000 },
          { libroId: "lib-02", titulo: "Cartas desde el sur", isbn: "978-987-000-002-8", cantidad: 1, precioUnitario: 2000, subtotal: 2000 },
        ],
        total: 5000,
      },
    ]);

    // Cambiar solo el precio del libro en lo guardado no altera la venta (CM-6).
    const libros = JSON.parse(storage.contenido["libreria.libros"] as string) as LibroLocal[];
    storage.contenido["libreria.libros"] = JSON.stringify(
      libros.map((libro) => (libro.id === "lib-01" ? { ...libro, precio: 9999 } : libro)),
    );
    const [releida] = await repos.ventas.listar();
    expect(releida?.renglones[0]?.precio_unitario).toBe("1500.00");
    expect(releida?.total).toBe("5000.00");
    expect((await repos.libros.obtener(1)).precio).toBe("9999.00");
  });

  test("un segundo alta continúa el identificador", async () => {
    const { repos } = preparar();
    await repos.ventas.crear({ cliente_id: 1, renglones: [{ libro_id: 1, cantidad: 1 }] });
    const segunda = await repos.ventas.crear({ cliente_id: 2, renglones: [{ libro_id: 2, cantidad: 3 }] });
    expect(segunda.id).toBe(2);
    expect(segunda.total).toBe("6000.00");
  });

  test("una venta inválida rechaza con los errores de campo y sin escribir", async () => {
    const { repos, storage } = preparar();
    const sinCliente = repos.ventas.crear({ cliente_id: 99, renglones: [{ libro_id: 1, cantidad: 1 }] });
    await expect(sinCliente).rejects.toBeInstanceOf(ErrorDeRepositorio);
    await expect(sinCliente).rejects.toMatchObject({
      errores: [{ campo: "cliente", mensaje: "Seleccione un cliente existente." }],
    });
    await expect(
      repos.ventas.crear({ cliente_id: 1, renglones: [{ libro_id: 1, cantidad: 0 }] }),
    ).rejects.toMatchObject({ errores: [{ campo: "cantidad" }] });
    await expect(repos.ventas.crear({ cliente_id: 1, renglones: [] })).rejects.toMatchObject({
      errores: [{ campo: "renglones" }],
    });
    await expect(
      repos.ventas.crear({ cliente_id: 1, renglones: [{ libro_id: 99, cantidad: 1 }] }),
    ).rejects.toMatchObject({ errores: [{ campo: "libro" }] });
    expect(storage.escrituras).toEqual([]);
  });
});
