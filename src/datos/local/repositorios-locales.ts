// Adaptador de los repositorios sobre el almacén local. Traduce entre la forma
// guardada en el almacenamiento del navegador (identificadores `lib-07`, precio numérico,
// relaciones por identificador, `nombreCompleto`, `telefono`) y la forma de la
// API de producción (ids enteros, `Dinero`, relaciones anidadas, `perfil`), sin
// cambiar el formato que se guarda. Es transitorio: `cliente-http-y-catalogo` y
// `operaciones-contra-api` lo reemplazan por adaptadores HTTP.
//
// Datos de transición: el formato local no guarda `stock` (se entrega `0` y el
// valor recibido en `crear` se descarta) ni el rol de autoría (siempre
// `"autor"`, con `orden` según la posición), `direccion` del perfil (`null`) ni
// `pais` y `nacionalidad` (ficticios, no se persisten).
import { ErrorDeRepositorio } from "../errores";
import type { Repositorios } from "../repositorios";
import { aCentavos, aDinero } from "../../logica/dinero";
import { filtrarPorTitulo } from "../../logica/catalogo";
import {
  calcularVenta,
  construirVenta,
  validarVenta,
  type LibroVendible,
} from "../../logica/ventas";
import type { Autor } from "../../types/autor";
import type { Cliente, Perfil } from "../../types/cliente";
import type { Editorial } from "../../types/editorial";
import type { Genero } from "../../types/genero";
import type { LibroDetalle } from "../../types/libro";
import type { Dinero, Id } from "../../types/primitivos";
import type { Venta } from "../../types/venta";
import type { AlmacenLocal } from "./almacen-local";
import type {
  AutorLocal,
  ClienteLocal,
  EditorialLocal,
  GeneroLocal,
  LibroLocal,
  VentaLocal,
} from "./tipos-locales";

export interface OpcionesRepositoriosLocales {
  /** Reloj usado para la fecha de las ventas; por defecto, la hora actual. */
  ahora?: () => Date;
}

/** Contador de un identificador de texto: `lib-07` → `7`. */
function contador(idLocal: string): Id {
  const numero = Number(idLocal.slice(idLocal.lastIndexOf("-") + 1));
  return Number.isInteger(numero) ? numero : 0;
}

/** Registro cuyo contador vale `id` (se comparan números, sin rearmar el texto). */
function buscar<T extends { id: string }>(lista: readonly T[], id: Id): T | undefined {
  return lista.find((registro) => contador(registro.id) === id);
}

function importe(valor: number | Dinero): Dinero {
  const texto = aDinero(valor);
  if (texto === null) {
    throw new ErrorDeRepositorio(`El importe guardado no es válido: ${String(valor)}`);
  }
  return texto;
}

/** Dinero → número con las reglas de centavos. */
function aNumero(valor: number | Dinero): number | null {
  const centavos = aCentavos(valor);
  return centavos === null ? null : centavos / 100;
}

function clienteDe(local: ClienteLocal): Cliente {
  const id = contador(local.id);
  const telefono = local.telefono ?? "";
  const perfil: Perfil | null =
    telefono === "" ? null : { id, cliente_id: id, telefono, direccion: null };
  return { id, nombre: local.nombreCompleto, email: local.email, perfil };
}

function ventaDe(local: VentaLocal): Venta {
  return {
    id: contador(local.id),
    fecha: local.fecha,
    total: importe(local.total),
    cliente: {
      id: contador(local.cliente.id),
      nombre: local.cliente.nombreCompleto,
      email: local.cliente.email,
    },
    renglones: local.renglones.map((renglon) => ({
      libro_id: contador(renglon.libroId),
      titulo: renglon.titulo,
      isbn: renglon.isbn,
      cantidad: renglon.cantidad,
      precio_unitario: importe(renglon.precioUnitario),
      subtotal: importe(renglon.subtotal),
    })),
  };
}

export function crearRepositoriosLocales(
  almacen: AlmacenLocal,
  opciones: OpcionesRepositoriosLocales = {},
): Repositorios {
  const ahora = opciones.ahora ?? ((): Date => new Date());

  function detalleDe(
    libro: LibroLocal,
    editoriales: readonly EditorialLocal[],
    generos: readonly GeneroLocal[],
    autores: readonly AutorLocal[],
  ): LibroDetalle {
    const editorial = editoriales.find((e) => e.id === libro.editorialId);
    const genero = generos.find((g) => g.id === libro.generoId);
    const autoresDelLibro = libro.autorIds.flatMap((autorId, posicion) => {
      const autor = autores.find((a) => a.id === autorId);
      return autor
        ? [{ autor_id: contador(autor.id), nombre: autor.nombre, rol: "autor" as const, orden: posicion + 1 }]
        : [];
    });
    return {
      id: contador(libro.id),
      isbn: libro.isbn,
      titulo: libro.titulo,
      precio: importe(libro.precio),
      stock: 0,
      editorial: {
        id: contador(libro.editorialId),
        nombre: editorial ? editorial.nombre : "",
      },
      genero: genero ? { id: contador(genero.id), nombre: genero.nombre } : null,
      autores: autoresDelLibro,
    };
  }

  function detalles(libros: readonly LibroLocal[]): LibroDetalle[] {
    const editoriales = almacen.obtenerEditoriales();
    const generos = almacen.obtenerGeneros();
    const autores = almacen.obtenerAutores();
    return libros.map((libro) => detalleDe(libro, editoriales, generos, autores));
  }

  function clienteLocal(id: Id): ClienteLocal {
    const local = buscar(almacen.obtenerClientes(), id);
    if (!local) throw new ErrorDeRepositorio(`No existe el cliente ${id}.`);
    return local;
  }

  return {
    libros: {
      async listar(filtro) {
        let libros = detalles(almacen.obtenerLibros());
        if (filtro?.titulo !== undefined) libros = filtrarPorTitulo(libros, filtro.titulo);
        const generoId = filtro?.genero_id;
        if (generoId !== undefined) {
          libros = libros.filter((libro) => libro.genero?.id === generoId);
        }
        const desde = filtro?.offset ?? 0;
        return filtro?.limit === undefined
          ? libros.slice(desde)
          : libros.slice(desde, desde + filtro.limit);
      },
      async obtener(id) {
        const local = buscar(almacen.obtenerLibros(), id);
        if (!local) throw new ErrorDeRepositorio(`No existe el libro ${id}.`);
        return detalles([local])[0] as LibroDetalle;
      },
      async crear(libro) {
        const editorial = buscar(almacen.obtenerEditoriales(), libro.editorial_id);
        if (!editorial) {
          throw new ErrorDeRepositorio(`No existe la editorial ${libro.editorial_id}.`);
        }
        let generoId: string | null = null;
        if (libro.genero_id !== undefined && libro.genero_id !== null) {
          const genero = buscar(almacen.obtenerGeneros(), libro.genero_id);
          if (!genero) throw new ErrorDeRepositorio(`No existe el género ${libro.genero_id}.`);
          generoId = genero.id;
        }
        const autores = almacen.obtenerAutores();
        const autorIds = [...(libro.autores ?? [])]
          .sort((a, b) => a.orden - b.orden)
          .map((autoria) => {
            const autor = buscar(autores, autoria.autor_id);
            if (!autor) throw new ErrorDeRepositorio(`No existe el autor ${autoria.autor_id}.`);
            return autor.id;
          });
        const precio = aNumero(libro.precio);
        if (precio === null) throw new ErrorDeRepositorio("El precio no es un importe válido.");
        // El formato local no guarda `stock`: el valor recibido se descarta.
        const guardado = almacen.agregarLibro({
          titulo: libro.titulo,
          isbn: libro.isbn,
          precio,
          editorialId: editorial.id,
          generoId,
          autorIds,
        });
        return detalles([guardado])[0] as LibroDetalle;
      },
    },
    editoriales: {
      async listar(): Promise<Editorial[]> {
        return almacen.obtenerEditoriales().map((e) => ({
          id: contador(e.id),
          nombre: e.nombre,
          pais: e.pais,
        }));
      },
    },
    generos: {
      async listar(): Promise<Genero[]> {
        return almacen.obtenerGeneros().map((g) => ({ id: contador(g.id), nombre: g.nombre }));
      },
    },
    autores: {
      async listar(): Promise<Autor[]> {
        return almacen.obtenerAutores().map((a) => ({
          id: contador(a.id),
          nombre: a.nombre,
          nacionalidad: a.nacionalidad,
        }));
      },
    },
    clientes: {
      async listar() {
        return almacen.obtenerClientes().map(clienteDe);
      },
      async obtener(id) {
        return clienteDe(clienteLocal(id));
      },
      async crear(cliente) {
        const guardado = almacen.agregarCliente({
          nombreCompleto: cliente.nombre,
          email: cliente.email,
        });
        return clienteDe(guardado);
      },
      async crearPerfil(id, perfil) {
        const actual = clienteLocal(id);
        const guardado = almacen.actualizarCliente(actual.id, {
          nombreCompleto: actual.nombreCompleto,
          email: actual.email,
          telefono: perfil.telefono ?? undefined,
        });
        const numero = contador(guardado.id);
        return {
          id: numero,
          cliente_id: numero,
          telefono: guardado.telefono ?? null,
          direccion: null,
        };
      },
      async actualizar(id, cambios) {
        const actual = clienteLocal(id);
        const guardado = almacen.actualizarCliente(actual.id, {
          nombreCompleto: cambios.nombre ?? actual.nombreCompleto,
          email: cambios.email ?? actual.email,
          telefono: actual.telefono,
        });
        return clienteDe(guardado);
      },
      async actualizarTelefono(id, telefono) {
        const actual = clienteLocal(id);
        const guardado = almacen.actualizarCliente(actual.id, {
          nombreCompleto: actual.nombreCompleto,
          email: actual.email,
          telefono,
        });
        return clienteDe(guardado);
      },
    },
    ventas: {
      async listar() {
        return almacen.obtenerVentas().map(ventaDe);
      },
      async crear(venta) {
        // Hace lo que hará el servidor: resuelve cliente y libros vigentes, copia
        // el precio unitario, calcula subtotales y total y guarda la instantánea.
        const clientes = almacen.obtenerClientes();
        const librosLocales = almacen.obtenerLibros();
        const vendibles: LibroVendible[] = librosLocales.map((libro) => ({
          id: contador(libro.id),
          titulo: libro.titulo,
          isbn: libro.isbn,
          precio: libro.precio,
        }));
        const clientesApi = clientes.map(clienteDe);
        const errores = validarVenta(venta.cliente_id, venta.renglones, clientesApi, vendibles);
        if (errores.length > 0) {
          throw new ErrorDeRepositorio("La venta no es válida.", errores);
        }
        const calculo = calcularVenta(venta.renglones, vendibles);
        const cliente = clientesApi.find((c) => c.id === venta.cliente_id);
        if (!calculo.ok || !cliente) {
          throw new ErrorDeRepositorio("La venta no es válida.", calculo.errores);
        }
        const construida = construirVenta(
          { id: cliente.id, nombre: cliente.nombre, email: cliente.email },
          calculo.renglones,
          ahora().toISOString(),
        );
        if (!construida.ok) {
          throw new ErrorDeRepositorio("La venta no es válida.", construida.errores);
        }
        const { venta: instantanea } = construida;
        const clienteLocal = buscar(clientes, instantanea.cliente.id) as ClienteLocal;
        const guardada = almacen.agregarVenta({
          fecha: instantanea.fecha,
          cliente: {
            id: clienteLocal.id,
            nombreCompleto: instantanea.cliente.nombre,
            email: instantanea.cliente.email,
          },
          renglones: instantanea.renglones.map((renglon) => ({
            libroId: (buscar(librosLocales, renglon.libro_id) as LibroLocal).id,
            titulo: renglon.titulo,
            isbn: renglon.isbn,
            cantidad: renglon.cantidad,
            precioUnitario: aNumero(renglon.precio_unitario) as number,
            subtotal: aNumero(renglon.subtotal) as number,
          })),
          total: aNumero(instantanea.total) as number,
        });
        return ventaDe(guardada);
      },
    },
  };
}
