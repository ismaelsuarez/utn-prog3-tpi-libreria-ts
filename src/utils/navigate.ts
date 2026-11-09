// Navegación del navegador. `replace` evita que volver atrás lleve a la página
// anterior después de iniciar o cerrar la sesión o de una redirección.
export function navegar(ruta: string): void {
  window.location.replace(ruta);
}

/** Recarga la página actual (se vuelve a decidir el acceso con la sesión de ese momento). */
export function recargar(): void {
  window.location.reload();
}
