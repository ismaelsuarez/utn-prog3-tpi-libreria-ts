// Almacén local: implementación vigente y transitoria de los datos de la
// aplicación sobre `localStorage`. Conserva las claves, el formato guardado y las
// reglas de lectura de la versión anterior; se crea con el almacenamiento
// inyectado (`crearAlmacenLocal(storage)`) para no depender del `localStorage`
// global y poder probarlo con un almacenamiento simulado.
//
// Inicialización:
//   inicializar()           - siembra únicamente las claves ausentes en el primer
//                             inicio: libros y clientes con sus datos de ejemplo
//                             y ventas con una lista vacía. Las claves presentes
//                             se respetan (un arreglo válido no se duplica y un
//                             contenido ilegible se conserva intacto).
// Escritura:
//   agregarLibro, agregarCliente, actualizarCliente y agregarVenta; esta última
//   asigna `ven-XX` y devuelve una copia independiente de lo guardado.
// El almacén no valida reglas de negocio ni normaliza datos: eso corresponde a
// la lógica pura y al formulario. Los fallos de almacenamiento se propagan en las
// altas; la excepción es `inicializar()`: un fallo al escribir la siembra degrada
// a una reserva en memoria sin interrumpir la carga de la página.
import { datosIniciales } from "./datos-iniciales";
import type {
  AutorLocal,
  ClienteLocal,
  EditorialLocal,
  GeneroLocal,
  LibroLocal,
  VentaLocal,
} from "./tipos-locales";

export const CLAVE_LIBROS = "libreria.libros";
export const CLAVE_CLIENTES = "libreria.clientes";
export const CLAVE_VENTAS = "libreria.ventas";

/**
 * Lo que los almacenes necesitan de `Storage`; una interfaz sin `getItem` o sin
 * `setItem` cuenta como ausente. `removeItem` lo usa solo el almacén de usuarios
 * para cerrar la sesión.
 */
export type AlmacenamientoInyectable = Partial<
  Pick<Storage, "getItem" | "setItem" | "removeItem">
>;

type AlmacenamientoUtilizable = Pick<Storage, "getItem" | "setItem">;

export type LibroNuevoLocal = Omit<LibroLocal, "id">;
export type ClienteNuevoLocal = Omit<ClienteLocal, "id">;
export type VentaNuevaLocal = Omit<VentaLocal, "id">;

export interface CambiosClienteLocal {
  nombreCompleto: string;
  email: string;
  telefono: string | undefined;
}

export interface AlmacenLocal {
  inicializar(): void;
  obtenerLibros(): LibroLocal[];
  obtenerClientes(): ClienteLocal[];
  obtenerVentas(): VentaLocal[];
  obtenerEditoriales(): EditorialLocal[];
  obtenerGeneros(): GeneroLocal[];
  obtenerAutores(): AutorLocal[];
  agregarLibro(libro: LibroNuevoLocal): LibroLocal;
  agregarCliente(cliente: ClienteNuevoLocal): ClienteLocal;
  actualizarCliente(id: string, cambios: CambiosClienteLocal): ClienteLocal;
  agregarVenta(venta: VentaNuevaLocal): VentaLocal;
}

function copiarLibro(libro: LibroLocal): LibroLocal {
  return { ...libro, autorIds: libro.autorIds.slice() };
}

function copiarRegistro<T extends object>(registro: T): T {
  return { ...registro };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function copiarVenta<T extends VentaNuevaLocal>(venta: T): T {
  // Solo comprueba la estructura necesaria para copiar; no reglas de negocio.
  const candidata: unknown = venta;
  if (
    !esObjeto(candidata) ||
    !esObjeto(candidata.cliente) ||
    !Array.isArray(candidata.renglones) ||
    !candidata.renglones.every(esObjeto)
  ) {
    throw new Error("La venta no tiene una estructura válida.");
  }
  return {
    ...venta,
    cliente: copiarRegistro(venta.cliente),
    renglones: venta.renglones.map(copiarRegistro),
  };
}

function esUtilizable(
  storage: AlmacenamientoInyectable | null,
): storage is AlmacenamientoUtilizable {
  return (
    storage !== null &&
    typeof storage.getItem === "function" &&
    typeof storage.setItem === "function"
  );
}

// Esquema de identificadores: prefijo + contador de al menos dos dígitos
// (lib-07, cli-04, ven-01).
function siguienteId(lista: readonly { id?: unknown }[], prefijo: string): string {
  let maximo = 0;
  for (const registro of lista) {
    if (typeof registro?.id === "string" && registro.id.startsWith(`${prefijo}-`)) {
      const numero = Number(registro.id.slice(prefijo.length + 1));
      if (Number.isInteger(numero) && numero > maximo) maximo = numero;
    }
  }
  return `${prefijo}-${String(maximo + 1).padStart(2, "0")}`;
}

/**
 * Almacenamiento del navegador, o `null` si no hay ventana o el acceso está
 * bloqueado. Es el único lugar de la aplicación que nombra `localStorage`.
 */
export function obtenerAlmacenamientoDelNavegador(): AlmacenamientoInyectable | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null; // Acceso bloqueado por el navegador: se usa la reserva en memoria.
  }
}

export function crearAlmacenLocal(
  almacenamiento: AlmacenamientoInyectable | null,
): AlmacenLocal {
  const storage = esUtilizable(almacenamiento) ? almacenamiento : null;
  // Reserva en memoria de libros y clientes cuando no hay almacenamiento.
  const memoria = new Map<string, unknown[]>();

  function obtenerStorageVentas(): AlmacenamientoUtilizable {
    // No se anuncia persistencia cuando el almacenamiento no está disponible.
    if (storage === null) {
      throw new Error("El almacenamiento de ventas no está disponible.");
    }
    return storage;
  }

  // A diferencia de libros y clientes, las ventas ilegibles no se reemplazan.
  function leerVentas(almacen: AlmacenamientoUtilizable): VentaLocal[] {
    const crudo = almacen.getItem(CLAVE_VENTAS);
    if (crudo === null || crudo === undefined) return [];
    const lista: unknown = JSON.parse(crudo);
    if (!Array.isArray(lista)) {
      throw new Error("Las ventas guardadas no contienen una lista válida.");
    }
    return (lista as VentaLocal[]).map(copiarVenta);
  }

  // Lee la clave guardada; si falta, no es un arreglo JSON válido o no hay
  // almacenamiento, devuelve los ejemplos. Nunca escribe: la lectura no siembra.
  function leerLista<T>(clave: string, ejemplos: readonly T[], copia: (registro: T) => T): T[] {
    if (storage !== null) {
      const crudo = storage.getItem(clave);
      if (crudo !== null && crudo !== undefined) {
        try {
          const parseado: unknown = JSON.parse(crudo);
          if (Array.isArray(parseado)) {
            return (parseado as T[]).map(copia);
          }
        } catch {
          // Contenido ilegible: carga provisoria; no se sobrescribe.
        }
      }
      return ejemplos.map(copia);
    }
    const guardados = memoria.get(clave);
    if (guardados !== undefined) return (guardados as T[]).map(copia);
    return ejemplos.map(copia);
  }

  function escribirLista(clave: string, lista: unknown[]): void {
    if (storage !== null) {
      storage.setItem(clave, JSON.stringify(lista));
      return;
    }
    memoria.set(clave, lista);
  }

  // True si la clave ya existe (arreglo válido o contenido ilegible intacto): en
  // cualquiera de los dos casos la inicialización la respeta y no la toca.
  function clavePresente(clave: string): boolean {
    if (storage !== null) {
      try {
        const crudo = storage.getItem(clave);
        return crudo !== null && crudo !== undefined;
      } catch {
        return true; // Lectura rechazada: se conserva todo tal como está.
      }
    }
    return memoria.has(clave);
  }

  function sembrar<T>(clave: string, ejemplos: readonly T[], copia: (registro: T) => T): void {
    if (clavePresente(clave)) return;
    try {
      escribirLista(clave, ejemplos.map(copia));
    } catch {
      memoria.set(clave, ejemplos.map(copia));
    }
  }

  return {
    inicializar() {
      sembrar(CLAVE_LIBROS, datosIniciales.libros, copiarLibro);
      sembrar(CLAVE_CLIENTES, datosIniciales.clientes, copiarRegistro);
      sembrar<VentaLocal>(CLAVE_VENTAS, [], copiarVenta);
    },
    obtenerLibros: () => leerLista(CLAVE_LIBROS, datosIniciales.libros, copiarLibro),
    obtenerClientes: () => leerLista(CLAVE_CLIENTES, datosIniciales.clientes, copiarRegistro),
    obtenerVentas: () => leerVentas(obtenerStorageVentas()),
    obtenerEditoriales: () => datosIniciales.editoriales.map(copiarRegistro),
    obtenerGeneros: () => datosIniciales.generos.map(copiarRegistro),
    obtenerAutores: () => datosIniciales.autores.map(copiarRegistro),
    agregarLibro(libro) {
      const lista = leerLista(CLAVE_LIBROS, datosIniciales.libros, copiarLibro);
      const registro: LibroLocal = {
        ...libro,
        id: siguienteId(lista, "lib"),
        autorIds: Array.isArray(libro.autorIds) ? libro.autorIds.slice() : [],
      };
      escribirLista(CLAVE_LIBROS, [...lista, registro]);
      return copiarLibro(registro);
    },
    agregarCliente(cliente) {
      const lista = leerLista(CLAVE_CLIENTES, datosIniciales.clientes, copiarRegistro);
      const registro: ClienteLocal = { ...cliente, id: siguienteId(lista, "cli") };
      escribirLista(CLAVE_CLIENTES, [...lista, registro]);
      return copiarRegistro(registro);
    },
    actualizarCliente(id, cambios) {
      // Conserva el id y cualquier propiedad no editable: así las ventas
      // anteriores siguen apuntando al mismo cliente.
      const lista = leerLista(CLAVE_CLIENTES, datosIniciales.clientes, copiarRegistro);
      const posicion = lista.findIndex((cliente) => cliente.id === id);
      const actual = lista[posicion];
      if (actual === undefined) {
        throw new Error("El cliente que intentás editar ya no existe.");
      }
      const actualizado: ClienteLocal = {
        ...actual,
        nombreCompleto: cambios.nombreCompleto,
        email: cambios.email,
        telefono: cambios.telefono,
      };
      lista[posicion] = actualizado;
      // Una sola escritura de clientes. No modifica ventas ni otros registros.
      escribirLista(CLAVE_CLIENTES, lista);
      return copiarRegistro(actualizado);
    },
    agregarVenta(venta) {
      const almacen = obtenerStorageVentas();
      const lista = leerVentas(almacen);
      const registro: VentaLocal = { ...copiarVenta(venta), id: siguienteId(lista, "ven") };
      almacen.setItem(CLAVE_VENTAS, JSON.stringify([...lista, registro]));
      return copiarVenta(registro);
    },
  };
}
