export function normalizarTexto(texto: string): string {
  return String(texto).trim().toLowerCase();
}

export function normalizarIsbn(isbn: string): string {
  return String(isbn).replace(/[\s-]/g, "");
}

export function normalizarEmail(email: string): string {
  return String(email).trim().toLowerCase();
}
