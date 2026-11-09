// Único punto de la aplicación que obtiene el almacenamiento del navegador
// (`localStorage`). Los almacenes de usuarios y sesión (`almacen-usuarios.ts`) lo
// reciben inyectado y son la única vía de lectura y escritura; los datos de
// negocio ya no se guardan aquí: salen de la API. Las claves `libreria.libros`,
// `libreria.clientes` y `libreria.ventas` de versiones anteriores no se leen,
// escriben, migran ni borran.

/**
 * Lo que los almacenes necesitan de `Storage`; una interfaz sin `getItem` o sin
 * `setItem` cuenta como ausente. `removeItem` lo usa solo el almacén de usuarios
 * para cerrar la sesión.
 */
export type AlmacenamientoInyectable = Partial<
  Pick<Storage, "getItem" | "setItem" | "removeItem">
>;

/**
 * Almacenamiento del navegador, o `null` si no hay ventana o el acceso está
 * bloqueado. Es el único lugar de la aplicación que nombra `localStorage`.
 */
export function obtenerAlmacenamientoDelNavegador(): AlmacenamientoInyectable | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null; // Acceso bloqueado por el navegador: los almacenes operan en memoria.
  }
}
