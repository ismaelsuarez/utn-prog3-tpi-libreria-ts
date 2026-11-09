// Envío único de un formulario: mientras una operación espera la respuesta de la
// API, un segundo envío (doble clic, Enter) no produce otra solicitud. No toca el
// DOM: la vista recibe el aviso de «en curso» y deshabilita su botón.

/**
 * Crea el guardián de un formulario. `alCambiar(true)` se invoca al empezar una
 * operación y `alCambiar(false)` al terminar, con éxito o con error. Mientras hay
 * una operación en curso, `ejecutar` no invoca la tarea y devuelve `undefined`.
 * Si la tarea rechaza, el rechazo llega a quien llamó, ya liberado el envío.
 */
export function crearEnvioUnico(
  alCambiar: (enCurso: boolean) => void,
): <T>(tarea: () => Promise<T>) => Promise<T | undefined> {
  let enCurso = false;
  return async <T>(tarea: () => Promise<T>): Promise<T | undefined> => {
    if (enCurso) return undefined;
    enCurso = true;
    alCambiar(true);
    try {
      return await tarea();
    } finally {
      enCurso = false;
      alCambiar(false);
    }
  };
}
