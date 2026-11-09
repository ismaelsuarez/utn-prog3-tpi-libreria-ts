// Usuario administrador de demostración que se siembra en el primer inicio. Se
// declara con la sal y la huella ya calculadas para que la siembra sea síncrona;
// la contraseña de demostración figura solo en el README y una prueba verifica
// que esta huella le corresponde. Son datos de prueba de una aplicación sin
// seguridad de servidor, no un secreto.
import type { UsuarioRegistrado } from "../../types/usuario";

export const usuariosIniciales: readonly UsuarioRegistrado[] = [
  {
    email: "admin@libreria.test",
    role: "admin",
    contrasena: {
      algoritmo: "PBKDF2-SHA-256",
      iteraciones: 100000,
      sal: "76484f0a4afb9cbffee9b4c39c578aae",
      huella: "e516602fe048a3da747dde24df076841681e715f52e52cd466815809f19172ac",
    },
    creadoEn: "2026-11-09T00:00:00.000Z",
  },
];
