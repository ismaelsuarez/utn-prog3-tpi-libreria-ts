import { afterEach, describe, expect, test } from "vitest";
import { crearAlmacenLocal } from "../../../src/datos/local/almacen-local";
import { datosIniciales as datos } from "../../../src/datos/local/datos-iniciales";
import type {
  LibroLocal,
  VentaLocal,
} from "../../../src/datos/local/tipos-locales";

const LIBROS = "libreria.libros";
const CLIENTES = "libreria.clientes";
const VENTAS = "libreria.ventas";

interface StorageSimulado {
  escrituras: string[];
  contenido: Record<string, string>;
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
}

/** Almacenamiento simulado que registra cada escritura. */
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

function crearVenta(): Omit<VentaLocal, "id"> {
  return {
    fecha: "2026-10-16T14:30:00.000Z",
    cliente: { id: "cli-01", nombreCompleto: "Cliente de prueba", email: "cliente@correo.test" },
    renglones: [
      { libroId: "lib-01", titulo: "Libro de prueba", isbn: "978-987-000-001-1", cantidad: 2, precioUnitario: 1500, subtotal: 3000 },
    ],
    total: 3000,
  };
}

function libroNuevo(cambios: Partial<Omit<LibroLocal, "id">> = {}): Omit<LibroLocal, "id"> {
  return {
    titulo: "Libro de recuperación",
    isbn: "978-987-000-099-9",
    precio: 100,
    editorialId: "edi-01",
    generoId: null,
    autorIds: [],
    ...cambios,
  };
}

const libroGuardado: LibroLocal = {
  id: "lib-77",
  titulo: "Guardado la noche anterior",
  isbn: "978-987-000-077-6",
  precio: 999,
  editorialId: "edi-01",
  generoId: null,
  autorIds: ["aut-01"],
};

describe("lecturas", () => {
  test("las seis lecturas devuelven los datos iniciales con su forma", () => {
    const almacen = crearAlmacenLocal(crearStorage());
    expect(almacen.obtenerLibros()).toHaveLength(datos.libros.length);
    expect(almacen.obtenerClientes()).toHaveLength(datos.clientes.length);
    expect(almacen.obtenerEditoriales()).toHaveLength(datos.editoriales.length);
    expect(almacen.obtenerGeneros()).toHaveLength(datos.generos.length);
    expect(almacen.obtenerAutores()).toHaveLength(datos.autores.length);
    expect(almacen.obtenerVentas()).toEqual([]);

    const libro = almacen.obtenerLibros()[0] as LibroLocal;
    for (const propiedad of ["id", "titulo", "isbn", "precio", "editorialId", "generoId", "autorIds"]) {
      expect(propiedad in libro, `libro sin ${propiedad}`).toBe(true);
    }
    const cliente = almacen.obtenerClientes()[0] as object;
    for (const propiedad of ["id", "nombreCompleto", "email"]) {
      expect(propiedad in cliente, `cliente sin ${propiedad}`).toBe(true);
    }
  });

  test("las lecturas devuelven copias: mutar el resultado no altera los datos iniciales", () => {
    const almacen = crearAlmacenLocal(null);
    const libros = almacen.obtenerLibros();
    const longitudInicial = libros.length;

    (libros[0] as LibroLocal).titulo = "Título alterado";
    (libros[0] as LibroLocal).autorIds.push("aut-99");
    libros.push({ ...libroGuardado, id: "lib-99" });

    const deNuevo = almacen.obtenerLibros();
    expect(deNuevo).toHaveLength(longitudInicial);
    expect(deNuevo[0]?.titulo).not.toBe("Título alterado");
    expect(deNuevo[0]?.titulo).toBe(datos.libros[0]?.titulo);
    expect(deNuevo[0]?.autorIds.includes("aut-99")).toBe(false);

    const clientes = almacen.obtenerClientes();
    (clientes[0] as { email: string }).email = "alterado@correo.test";
    expect(almacen.obtenerClientes()[0]?.email).toBe(datos.clientes[0]?.email);
  });

  test("editoriales, géneros y autores se devuelven como copias de los datos iniciales", () => {
    const almacen = crearAlmacenLocal(crearStorage());
    (almacen.obtenerEditoriales()[0] as { nombre: string }).nombre = "Alterada";
    (almacen.obtenerGeneros()[0] as { nombre: string }).nombre = "Alterado";
    (almacen.obtenerAutores()[0] as { nombre: string }).nombre = "Alterado";
    expect(almacen.obtenerEditoriales()[0]?.nombre).toBe(datos.editoriales[0]?.nombre);
    expect(almacen.obtenerGeneros()[0]?.nombre).toBe(datos.generos[0]?.nombre);
    expect(almacen.obtenerAutores()[0]?.nombre).toBe(datos.autores[0]?.nombre);
  });

  test("obtenerLibros y obtenerClientes priorizan la clave guardada", () => {
    const clientesGuardados = [{ id: "cli-77", nombreCompleto: "Guardado Cliente", email: "guardado@correo.test" }];
    const storage = crearStorage({
      [LIBROS]: JSON.stringify([libroGuardado]),
      [CLIENTES]: JSON.stringify(clientesGuardados),
    });
    const almacen = crearAlmacenLocal(storage);

    const libros = almacen.obtenerLibros();
    expect(libros, "debería devolver lo guardado y no los seis ejemplos").toHaveLength(1);
    expect(libros[0]?.titulo).toBe("Guardado la noche anterior");
    expect(libros[0]?.autorIds, "los autorIds deben conservarse").toHaveLength(1);

    const clientes = almacen.obtenerClientes();
    expect(clientes).toHaveLength(1);
    expect(clientes[0]?.email).toBe("guardado@correo.test");
    expect(storage.escrituras, "la lectura nunca debe escribir (sin siembra)").toEqual([]);
  });

  test("una clave ausente devuelve los ejemplos sin sembrarla", () => {
    const storage = crearStorage();
    const almacen = crearAlmacenLocal(storage);
    expect(almacen.obtenerLibros()).toHaveLength(datos.libros.length);
    expect(almacen.obtenerClientes()).toHaveLength(datos.clientes.length);
    expect(storage.escrituras, "la lectura no debe escribir").toEqual([]);
    expect(storage.contenido[LIBROS], "la clave no debe crearse al leer").toBeUndefined();
  });

  test("un contenido ilegible devuelve los ejemplos sin sobrescribirlo", () => {
    const storage = crearStorage({
      [LIBROS]: "{esto no es un arreglo json",
      [CLIENTES]: JSON.stringify({ forma: "de objeto, no de arreglo" }),
    });
    const almacen = crearAlmacenLocal(storage);
    expect(almacen.obtenerLibros()).toHaveLength(datos.libros.length);
    expect(almacen.obtenerClientes()).toHaveLength(datos.clientes.length);
    expect(storage.escrituras, "la lectura no debe escribir").toEqual([]);
    expect(storage.contenido[LIBROS], "no se sobrescribe lo ilegible").toBe("{esto no es un arreglo json");
  });
});

describe("independencia del entorno", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  test("el resultado no cambia si existe un localStorage global", () => {
    const global = crearStorage({ [LIBROS]: JSON.stringify([libroGuardado]) });
    Object.defineProperty(globalThis, "localStorage", { value: global, configurable: true });

    const conNull = crearAlmacenLocal(null);
    expect(conNull.obtenerLibros()).toHaveLength(datos.libros.length);
    conNull.agregarLibro(libroNuevo());
    expect(global.escrituras, "no escribe en el almacenamiento global").toEqual([]);

    const propio = crearStorage();
    const conPropio = crearAlmacenLocal(propio);
    conPropio.agregarLibro(libroNuevo());
    expect(propio.escrituras).toEqual([LIBROS]);
    expect(global.escrituras).toEqual([]);
    expect(global.contenido[LIBROS]).toBe(JSON.stringify([libroGuardado]));
  });

  test("sin almacenamiento el almacén opera en memoria para libros y clientes", () => {
    const almacen = crearAlmacenLocal(null);
    const guardado = almacen.agregarLibro(libroNuevo());
    expect(guardado.id).toBe("lib-07");
    expect(almacen.obtenerLibros().some((libro) => libro.id === "lib-07")).toBe(true);
    // Otra instancia no comparte la reserva en memoria.
    expect(crearAlmacenLocal(null).obtenerLibros()).toHaveLength(datos.libros.length);
  });
});

describe("inicializar", () => {
  test("siembra las tres claves en el primer inicio", () => {
    const storage = crearStorage();
    const almacen = crearAlmacenLocal(storage);

    almacen.inicializar();

    expect(JSON.parse(storage.contenido[LIBROS] as string)).toEqual(datos.libros);
    expect(JSON.parse(storage.contenido[CLIENTES] as string)).toEqual(datos.clientes);
    expect(storage.contenido[VENTAS]).toBe("[]");
    expect(storage.escrituras).toEqual([LIBROS, CLIENTES, VENTAS]);

    // Triangulación: las lecturas posteriores devuelven los ejemplos y [].
    expect(almacen.obtenerLibros()).toHaveLength(datos.libros.length);
    expect(almacen.obtenerLibros()[0]?.titulo).toBe(datos.libros[0]?.titulo);
    expect(almacen.obtenerClientes()).toHaveLength(datos.clientes.length);
    expect(almacen.obtenerClientes()[0]?.email).toBe(datos.clientes[0]?.email);
    expect(almacen.obtenerVentas()).toHaveLength(0);
  });

  test("en un segundo inicio respeta las claves sembradas y no escribe", () => {
    const storage = crearStorage();
    crearAlmacenLocal(storage).inicializar();
    const libros = storage.contenido[LIBROS];
    const clientes = storage.contenido[CLIENTES];
    const ventas = storage.contenido[VENTAS];
    storage.escrituras.length = 0;

    // Segunda página abierta: instancia nueva, almacenamiento ya sembrado.
    const segunda = crearAlmacenLocal(storage);
    segunda.inicializar();

    expect(storage.escrituras, "el segundo inicio no debe escribir").toEqual([]);
    expect(storage.contenido[LIBROS]).toBe(libros);
    expect(storage.contenido[CLIENTES]).toBe(clientes);
    expect(storage.contenido[VENTAS]).toBe(ventas);
    expect(segunda.obtenerLibros(), "sin duplicar ejemplos").toHaveLength(datos.libros.length);
    expect(segunda.obtenerClientes(), "sin duplicar ejemplos").toHaveLength(datos.clientes.length);
    expect(segunda.obtenerVentas(), "sin duplicar ventas").toHaveLength(0);
  });

  test.each([LIBROS, CLIENTES, VENTAS])("con una clave parcial siembra solo la ausente: %s", (claveAusente) => {
    const presentes: Record<string, string> = {
      [LIBROS]: JSON.stringify([libroGuardado]),
      [CLIENTES]: JSON.stringify([{ id: "cli-77", nombreCompleto: "Único cliente guardado", email: "unico@correo.test" }]),
      [VENTAS]: JSON.stringify([{ ...crearVenta(), id: "ven-77" }]),
    };
    const contenidoInicial = Object.fromEntries(
      Object.entries(presentes).filter(([clave]) => clave !== claveAusente),
    );
    const storage = crearStorage(contenidoInicial);

    crearAlmacenLocal(storage).inicializar();

    expect(storage.escrituras, `solo debe sembrar ${claveAusente}`).toEqual([claveAusente]);
    for (const [clave, contenido] of Object.entries(presentes)) {
      if (clave !== claveAusente) {
        expect(storage.contenido[clave], `${clave} debe conservar su contenido`).toBe(contenido);
      }
    }
  });

  test.each(["{esto no es un arreglo json", JSON.stringify({ forma: "objeto, no arreglo" }), JSON.stringify(null)])(
    "conserva el JSON ilegible y la lectura sirve los ejemplos provisorios: %s",
    (crudo) => {
      const storage = crearStorage({ [LIBROS]: crudo, [CLIENTES]: crudo, [VENTAS]: crudo });
      const almacen = crearAlmacenLocal(storage);

      almacen.inicializar();

      expect(storage.contenido[LIBROS]).toBe(crudo);
      expect(storage.contenido[CLIENTES]).toBe(crudo);
      expect(storage.contenido[VENTAS]).toBe(crudo);
      expect(storage.escrituras, "no se repara ni se sobrescribe").toEqual([]);
      expect(almacen.obtenerLibros(), "lectura provisoria de ejemplos").toHaveLength(datos.libros.length);
      expect(almacen.obtenerClientes(), "lectura provisoria de ejemplos").toHaveLength(datos.clientes.length);
    },
  );

  test("tras una clave ilegible, un alta posterior pisa la lista completa", () => {
    const storage = crearStorage({ [LIBROS]: "{esto no es un arreglo json" });
    const almacen = crearAlmacenLocal(storage);

    almacen.inicializar();
    const guardado = almacen.agregarLibro(libroNuevo());

    const lista = JSON.parse(storage.contenido[LIBROS] as string) as LibroLocal[];
    expect(lista, "ejemplos más el registro nuevo: la lista completa").toHaveLength(datos.libros.length + 1);
    expect(lista[lista.length - 1]?.id).toBe(guardado.id);
    expect(almacen.obtenerLibros().some((libro) => libro.id === guardado.id)).toBe(true);
  });

  test("un fallo de escritura en la siembra no interrumpe la carga", () => {
    const storage = crearStorage();
    storage.setItem = () => {
      throw new Error("Cuota de almacenamiento agotada");
    };
    const almacen = crearAlmacenLocal(storage);

    almacen.inicializar();

    expect(storage.escrituras, "la siembra rechazada no debe quedar registrada").toEqual([]);
    expect(almacen.obtenerLibros(), "la lectura sigue respondiendo en la sesión").toHaveLength(datos.libros.length);
    expect(almacen.obtenerClientes()).toHaveLength(datos.clientes.length);
    expect(almacen.obtenerVentas()).toHaveLength(0);
  });

  test("el fallo de escritura de una clave no afecta a las otras dos", () => {
    const storage = crearStorage();
    const escribir = storage.setItem;
    storage.setItem = (clave, valor) => {
      if (clave === VENTAS) throw new Error("Cuota de almacenamiento agotada");
      escribir(clave, valor);
    };
    const almacen = crearAlmacenLocal(storage);

    almacen.inicializar();

    expect(storage.contenido[LIBROS]).toBe(JSON.stringify(datos.libros));
    expect(storage.contenido[CLIENTES]).toBe(JSON.stringify(datos.clientes));
    expect(storage.contenido[VENTAS], "la clave rechazada no llega al storage").toBeUndefined();
    expect(storage.escrituras).toEqual([LIBROS, CLIENTES]);
    expect(almacen.obtenerVentas(), "ventas sigue respondiendo en la sesión").toHaveLength(0);
  });
});

describe("altas de libros y clientes", () => {
  test("agregarLibro da de alta sobre los ejemplos, asigna lib-07 y devuelve el registro", () => {
    const almacen = crearAlmacenLocal(null);
    expect(almacen.obtenerLibros(), "se parte de los seis ejemplos (clave ausente)").toHaveLength(datos.libros.length);

    const entrada = libroNuevo({
      titulo: "La torre de los sueños",
      isbn: "978-987-000-088-3",
      precio: 1750.5,
      generoId: "gen-01",
      autorIds: ["aut-01", "aut-03"],
    });

    const guardado = almacen.agregarLibro(entrada);

    expect(guardado.id, "el id sigue el esquema prefijo + contador").toBe("lib-07");
    expect(guardado.titulo).toBe(entrada.titulo);
    expect(
      almacen.obtenerLibros().map((libro) => libro.id),
      "quedan los ejemplos más el registro nuevo, sin perder datos",
    ).toEqual([...datos.libros.map((libro) => libro.id), "lib-07"]);

    // Ni lo devuelto ni lo de entrada comparten referencias con lo almacenado.
    guardado.autorIds.push("aut-99");
    entrada.autorIds.push("aut-02");
    const releido = almacen.obtenerLibros().find((libro) => libro.id === "lib-07");
    expect(releido?.autorIds, "la lista de autores debe venir copiada").toEqual(["aut-01", "aut-03"]);
    expect(releido?.titulo).toBe("La torre de los sueños");
  });

  test("una segunda alta de libro continúa el contador", () => {
    const almacen = crearAlmacenLocal(null);
    almacen.agregarLibro(libroNuevo());
    const antes = almacen.obtenerLibros();
    const guardado = almacen.agregarLibro(libroNuevo({ titulo: "Cuaderno de bitácora", isbn: "978-987-000-087-6" }));

    expect(guardado.id).toBe(`lib-${String(antes.length + 1).padStart(2, "0")}`);
    expect(almacen.obtenerLibros().some((libro) => libro.id === guardado.id), "el registro nuevo debe verse en la lectura").toBe(true);
  });

  test("agregarCliente da de alta sobre los ejemplos, asigna cli-04 y devuelve el registro", () => {
    const almacen = crearAlmacenLocal(null);
    expect(almacen.obtenerClientes(), "se parte de los tres ejemplos").toHaveLength(datos.clientes.length);

    const guardado = almacen.agregarCliente({ nombreCompleto: "Bruno Lagos", email: "bruno.lagos@correo.test" });

    expect(guardado.id, "el id sigue el esquema prefijo + contador").toBe("cli-04");
    expect(
      almacen.obtenerClientes().map((cliente) => cliente.id),
      "quedan los ejemplos más el registro nuevo, sin perder datos",
    ).toEqual([...datos.clientes.map((cliente) => cliente.id), "cli-04"]);

    guardado.email = "alterado@correo.test";
    const releido = almacen.obtenerClientes().find((cliente) => cliente.id === "cli-04");
    expect(releido?.email, "lo devuelto es una copia de lo almacenado").toBe("bruno.lagos@correo.test");
  });

  test("una segunda alta de cliente continúa el contador", () => {
    const almacen = crearAlmacenLocal(null);
    almacen.agregarCliente({ nombreCompleto: "Bruno Lagos", email: "bruno.lagos@correo.test" });
    const antes = almacen.obtenerClientes();
    const guardado = almacen.agregarCliente({ nombreCompleto: "Cira Ledesma", email: "cira.ledesma@correo.test" });

    expect(guardado.id).toBe(`cli-${String(antes.length + 1).padStart(2, "0")}`);
    expect(almacen.obtenerClientes().some((cliente) => cliente.id === guardado.id), "el registro nuevo debe verse en la lectura").toBe(true);
  });

  test("el almacén no valida ni normaliza: guarda los datos tal como llegan", () => {
    const almacen = crearAlmacenLocal(null);
    const guardado = almacen.agregarLibro({
      titulo: "  Con espacios  ",
      isbn: " 978 987 000 111 1 ",
      precio: -5,
      editorialId: "edi-inexistente",
      generoId: "",
      autorIds: [],
    });

    expect(guardado.titulo, "no recorta el título").toBe("  Con espacios  ");
    expect(guardado.precio, "no comprueba el precio").toBe(-5);
    expect(guardado.editorialId, "no comprueba la editorial").toBe("edi-inexistente");
    expect(guardado.generoId, "no normaliza el género").toBe("");
    expect(almacen.obtenerLibros().some((libro) => libro.id === guardado.id)).toBe(true);
  });

  test("actualizarCliente conserva el id y reescribe solo la clave de clientes", () => {
    const storage = crearStorage({ [CLIENTES]: JSON.stringify(datos.clientes) });
    const almacen = crearAlmacenLocal(storage);

    const actualizado = almacen.actualizarCliente("cli-02", {
      nombreCompleto: "Ricardo S. Soria",
      email: "ricardo@correo.test",
      telefono: "11 5555-0000",
    });

    expect(actualizado).toEqual({
      id: "cli-02",
      nombreCompleto: "Ricardo S. Soria",
      email: "ricardo@correo.test",
      telefono: "11 5555-0000",
    });
    expect(storage.escrituras).toEqual([CLIENTES]);
    expect(almacen.obtenerClientes().map((cliente) => cliente.id)).toEqual(["cli-01", "cli-02", "cli-03"]);
    expect(almacen.obtenerClientes()[0]).toEqual(datos.clientes[0]);
  });

  test("actualizarCliente rechaza un cliente inexistente sin escribir", () => {
    const storage = crearStorage();
    const almacen = crearAlmacenLocal(storage);
    expect(() =>
      almacen.actualizarCliente("cli-99", { nombreCompleto: "X", email: "x@correo.test", telefono: "1234567" }),
    ).toThrow("El cliente que intentás editar ya no existe.");
    expect(storage.escrituras).toEqual([]);
  });
});

describe("ventas", () => {
  test("agregarVenta persiste la primera venta sin tocar libros ni clientes", () => {
    const storage = crearStorage({ [LIBROS]: "[]", [CLIENTES]: "[]" });
    const almacen = crearAlmacenLocal(storage);

    expect(almacen.obtenerVentas()).toEqual([]);
    expect(storage.escrituras, "leer no siembra la clave").toEqual([]);
    const venta = crearVenta();
    const guardada = almacen.agregarVenta(venta);
    expect(guardada.id).toBe("ven-01");
    expect(guardada.cliente).toEqual(venta.cliente);
    expect(guardada.renglones).toEqual(venta.renglones);
    expect(guardada.fecha).toBe(venta.fecha);
    expect(guardada.total).toBe(3000);
    expect(JSON.parse(storage.contenido[VENTAS] as string)).toEqual([guardada]);
    expect(almacen.obtenerVentas()).toEqual([guardada]);
    expect(storage.escrituras).toEqual([VENTAS]);
    expect(storage.contenido[LIBROS]).toBe("[]");
    expect(storage.contenido[CLIENTES]).toBe("[]");
  });

  test("las ventas se agregan en orden con ID propio y sin duplicar al leer", () => {
    const storage = crearStorage();
    const almacen = crearAlmacenLocal(storage);
    const primera = almacen.agregarVenta(crearVenta());
    const entrada: VentaLocal = {
      ...crearVenta(),
      id: "ven-999",
      total: 0,
      renglones: [{ libroId: "lib-01", titulo: "Libro de prueba", isbn: "978-987-000-001-1", cantidad: 2, precioUnitario: 0, subtotal: 0 }],
    };
    const segunda = almacen.agregarVenta(entrada);
    expect(segunda.id, "el ID externo no reemplaza al asignado").toBe("ven-02");
    expect(segunda.total, "el almacén no cambia importes validados por la lógica").toBe(0);
    expect(almacen.obtenerVentas()).toEqual([primera, segunda]);
    expect(almacen.obtenerVentas()).toEqual([primera, segunda]);
    expect(storage.escrituras).toEqual([VENTAS, VENTAS]);
  });

  test("el ID de venta continúa el máximo guardado y no la cantidad de ventas", () => {
    const anteriores = [{ ...crearVenta(), id: "ven-02" }, { ...crearVenta(), id: "ven-07" }];
    const storage = crearStorage({ [VENTAS]: JSON.stringify(anteriores) });
    const almacen = crearAlmacenLocal(storage);
    const guardada = almacen.agregarVenta(crearVenta());
    expect(guardada.id).toBe("ven-08");
    expect(almacen.obtenerVentas()).toEqual([...anteriores, guardada]);
    expect(storage.escrituras).toEqual([VENTAS]);
  });

  test("aíslan entrada y respuesta del alta", () => {
    const almacen = crearAlmacenLocal(crearStorage());
    const entrada = crearVenta();
    const guardada = almacen.agregarVenta(entrada);
    entrada.cliente.nombreCompleto = "Nombre alterado";
    (entrada.renglones[0] as { precioUnitario: number }).precioUnitario = 9000;
    entrada.renglones.push({ ...(entrada.renglones[0] as VentaLocal["renglones"][number]) });
    guardada.cliente.email = "otro@correo.test";
    (guardada.renglones[0] as { titulo: string }).titulo = "Título alterado";
    guardada.total = 999;
    const releida = almacen.obtenerVentas()[0] as VentaLocal;
    expect(releida.cliente.nombreCompleto).toBe("Cliente de prueba");
    expect(releida.cliente.email).toBe("cliente@correo.test");
    expect(releida.renglones).toHaveLength(1);
    expect(releida.renglones[0]?.precioUnitario).toBe(1500);
    expect(releida.renglones[0]?.titulo).toBe("Libro de prueba");
    expect(releida.total).toBe(3000);
  });

  test("las lecturas devuelven copias independientes", () => {
    const almacen = crearAlmacenLocal(crearStorage());
    const primera = almacen.agregarVenta(crearVenta());
    const segunda = almacen.agregarVenta(crearVenta());
    expect(primera.id).toBe("ven-01");
    expect(segunda.id).toBe("ven-02");
    const lectura = almacen.obtenerVentas();
    (lectura[0] as VentaLocal).cliente.id = "cli-99";
    (lectura[0]?.renglones[0] as { subtotal: number }).subtotal = 123;
    (lectura[0] as VentaLocal).renglones.length = 0;
    lectura.pop();
    const releida = almacen.obtenerVentas();
    expect(releida).toHaveLength(2);
    expect(releida[0]?.cliente.id).toBe("cli-01");
    expect(releida[0]?.renglones).toHaveLength(1);
    expect(releida[0]?.renglones[0]?.subtotal).toBe(3000);
    expect(releida[1]?.total).toBe(3000);
  });

  test("con JSON ilegible no se leen como vacías ni se sobrescriben", () => {
    const storage = crearStorage({ [VENTAS]: "{contenido ilegible" });
    const almacen = crearAlmacenLocal(storage);
    expect(() => almacen.obtenerVentas()).toThrow();
    expect(() => almacen.agregarVenta(crearVenta())).toThrow();
    expect(storage.contenido[VENTAS]).toBe("{contenido ilegible");
    expect(storage.escrituras).toEqual([]);
  });

  test.each(["null", "{}", "[null]", "[{}]", '[{"cliente":null,"renglones":[]}]', '[{"cliente":{},"renglones":[null]}]'])(
    "con estructura ilegible conservan exactamente el contenido guardado: %s",
    (crudo) => {
      const storage = crearStorage({ [VENTAS]: crudo });
      const almacen = crearAlmacenLocal(storage);
      expect(() => almacen.obtenerVentas(), `debe rechazar ${crudo}`).toThrow();
      expect(() => almacen.agregarVenta(crearVenta()), `no debe agregar sobre ${crudo}`).toThrow();
      expect(storage.contenido[VENTAS]).toBe(crudo);
      expect(storage.escrituras).toEqual([]);
    },
  );

  test("sin almacenamiento las ventas fallan en lugar de usar memoria", () => {
    const almacen = crearAlmacenLocal(null);
    expect(() => almacen.obtenerVentas()).toThrow(/almacenamiento/);
    expect(() => almacen.agregarVenta(crearVenta())).toThrow(/almacenamiento/);
    expect(() => almacen.obtenerVentas()).toThrow(/almacenamiento/);
    expect(almacen.obtenerLibros(), "se conserva el fallback de libros").toHaveLength(datos.libros.length);
    expect(almacen.obtenerClientes(), "se conserva el fallback de clientes").toHaveLength(datos.clientes.length);
  });

  test("un error al leer ventas se propaga y no intenta escribir", () => {
    const fallo = new Error("Lectura rechazada");
    const storage = crearStorage({ [VENTAS]: "[]" });
    storage.getItem = () => {
      throw fallo;
    };
    const almacen = crearAlmacenLocal(storage);
    expect(() => almacen.obtenerVentas()).toThrow(fallo);
    expect(() => almacen.agregarVenta(crearVenta())).toThrow(fallo);
    expect(storage.contenido[VENTAS]).toBe("[]");
    expect(storage.escrituras).toEqual([]);
  });

  test("una escritura fallida conserva ventas y entrada y el reintento no duplica registros", () => {
    const anterior = { ...crearVenta(), id: "ven-01" };
    const crudo = JSON.stringify([anterior]);
    const storage = crearStorage({ [VENTAS]: crudo });
    const escribir = storage.setItem;
    const fallo = new Error("Cuota de almacenamiento agotada");
    storage.setItem = () => {
      throw fallo;
    };
    const almacen = crearAlmacenLocal(storage);
    const entrada = crearVenta();
    const antes = JSON.stringify(entrada);
    expect(() => almacen.agregarVenta(entrada)).toThrow(fallo);
    expect(JSON.stringify(entrada)).toBe(antes);
    expect(storage.contenido[VENTAS]).toBe(crudo);
    expect(storage.escrituras).toEqual([]);
    expect(almacen.obtenerVentas()).toHaveLength(1);
    storage.setItem = escribir;
    const guardada = almacen.agregarVenta(entrada);
    expect(guardada.id).toBe("ven-02");
    expect(almacen.obtenerVentas()).toHaveLength(2);
    expect(storage.escrituras).toEqual([VENTAS]);
  });

  test("una interfaz de almacenamiento incompleta no activa la reserva de ventas", () => {
    const almacen = crearAlmacenLocal({ getItem: () => null });
    expect(() => almacen.obtenerVentas()).toThrow(/almacenamiento/);
    expect(() => almacen.agregarVenta(crearVenta())).toThrow(/almacenamiento/);
  });
});
