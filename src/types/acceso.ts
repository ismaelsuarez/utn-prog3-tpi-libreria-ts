// Tipos de la protección de rutas: zonas de `src/pages/`, destinos entre
// páginas y decisión de acceso. Solo tipos (regla dura 3).

/** Carpeta de zona de una página: `src/pages/<zona>/<vista>/`. */
export type Zona = "auth" | "client" | "admin";

export type DestinoDeRuta =
  | "login"
  | "registro"
  | "catalogo"
  | "libros"
  | "clientes"
  | "ventas"
  | "historial";

/** Resultado de decidir si una página se muestra o a dónde se redirige. */
export type DecisionDeAcceso =
  | { tipo: "permitir" }
  | { tipo: "redirigir"; destino: DestinoDeRuta };
