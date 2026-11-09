import { describe, expect, test } from "vitest";
import {
  buscarPorEmail,
  validarIngreso,
  validarRegistro,
} from "../../src/logica/usuarios";
import type { BorradorRegistro } from "../../src/types/usuario";

const guardados = [
  { email: "laura@correo.test" },
  { email: "admin@libreria.test" },
];

function borradorValido(cambios: Partial<BorradorRegistro> = {}): BorradorRegistro {
  return {
    email: "nuevo@correo.test",
    contrasena: "Faro-2026",
    repeticion: "Faro-2026",
    ...cambios,
  };
}

function conContrasena(contrasena: string): BorradorRegistro {
  return borradorValido({ contrasena, repeticion: contrasena });
}

const MENSAJE_LARGO = "La contraseña debe tener entre 8 y 64 caracteres.";

describe("validarRegistro", () => {
  test("un borrador válido no produce errores", () => {
    expect(validarRegistro(borradorValido(), guardados)).toEqual([]);
  });

  test("email vacío o solo espacios", () => {
    const esperado = [{ campo: "email", mensaje: "El email es obligatorio." }];
    expect(validarRegistro(borradorValido({ email: "" }), guardados)).toEqual(esperado);
    expect(validarRegistro(borradorValido({ email: "   " }), guardados)).toEqual(esperado);
  });

  test("email con formato inválido", () => {
    expect(validarRegistro(borradorValido({ email: "ana@" }), guardados)).toEqual([
      { campo: "email", mensaje: "El email no tiene un formato válido." },
    ]);
  });

  test("email duplicado con otra capitalización y espacios", () => {
    expect(
      validarRegistro(borradorValido({ email: "  LAURA@Correo.TEST " }), guardados),
    ).toEqual([{ campo: "email", mensaje: "Ese email ya está registrado." }]);
  });

  test("el email del administrador cuenta como ya registrado", () => {
    expect(
      validarRegistro(borradorValido({ email: "Admin@Libreria.test" }), guardados),
    ).toEqual([{ campo: "email", mensaje: "Ese email ya está registrado." }]);
  });

  test("contraseña vacía pide la contraseña y, al estar vacía también la repetición, repetirla", () => {
    expect(validarRegistro(conContrasena(""), guardados)).toEqual([
      { campo: "contrasena", mensaje: "La contraseña es obligatoria." },
      { campo: "repeticion", mensaje: "Repetí la contraseña." },
    ]);
  });

  test.each([
    ["7 caracteres", "a".repeat(7), false],
    ["8 caracteres", "a".repeat(8), true],
    ["64 caracteres", "a".repeat(64), true],
    ["65 caracteres", "a".repeat(65), false],
  ])("largo de la contraseña: %s", (_nombre, contrasena, valida) => {
    const errores = validarRegistro(conContrasena(contrasena), guardados);
    expect(errores).toEqual(
      valida ? [] : [{ campo: "contrasena", mensaje: MENSAJE_LARGO }],
    );
  });

  test("los espacios cuentan y no se recortan", () => {
    expect(validarRegistro(conContrasena("       a"), guardados)).toEqual([]);
    expect(validarRegistro(conContrasena("        "), guardados)).toEqual([]);
    expect(validarRegistro(conContrasena("a       "), guardados)).toEqual([]);
  });

  test("repetición vacía", () => {
    expect(validarRegistro(borradorValido({ repeticion: "" }), guardados)).toEqual([
      { campo: "repeticion", mensaje: "Repetí la contraseña." },
    ]);
  });

  test("repetición distinta, incluso por mayúsculas", () => {
    const esperado = [{ campo: "repeticion", mensaje: "Las contraseñas no coinciden." }];
    expect(validarRegistro(borradorValido({ repeticion: "Faro-2027" }), guardados)).toEqual(esperado);
    expect(validarRegistro(borradorValido({ repeticion: "faro-2026" }), guardados)).toEqual(esperado);
  });

  test("informa un error por campo, en el orden del formulario", () => {
    expect(
      validarRegistro({ email: "", contrasena: "corta", repeticion: "otra" }, guardados),
    ).toEqual([
      { campo: "email", mensaje: "El email es obligatorio." },
      { campo: "contrasena", mensaje: MENSAJE_LARGO },
      { campo: "repeticion", mensaje: "Las contraseñas no coinciden." },
    ]);
  });

  test("sin usuarios guardados cualquier email válido se acepta", () => {
    expect(validarRegistro(borradorValido({ email: "laura@correo.test" }), [])).toEqual([]);
  });
});

describe("validarIngreso", () => {
  test("credenciales completas no producen errores", () => {
    expect(validarIngreso({ email: "a@b.test", contrasena: "x" })).toEqual([]);
  });

  test("email vacío", () => {
    expect(validarIngreso({ email: "  ", contrasena: "x" })).toEqual([
      { campo: "email", mensaje: "Ingresá tu email." },
    ]);
  });

  test("contraseña vacía", () => {
    expect(validarIngreso({ email: "a@b.test", contrasena: "" })).toEqual([
      { campo: "contrasena", mensaje: "Ingresá tu contraseña." },
    ]);
  });

  test("ambos vacíos informa los dos campos", () => {
    expect(validarIngreso({ email: "", contrasena: "" })).toEqual([
      { campo: "email", mensaje: "Ingresá tu email." },
      { campo: "contrasena", mensaje: "Ingresá tu contraseña." },
    ]);
  });

  test("una contraseña de solo espacios no está vacía", () => {
    expect(validarIngreso({ email: "a@b.test", contrasena: "   " })).toEqual([]);
  });
});

describe("buscarPorEmail", () => {
  const usuarios = [
    { email: "laura@correo.test", role: "client" },
    { email: "admin@libreria.test", role: "admin" },
  ];

  test("coincide con el email normalizado", () => {
    expect(buscarPorEmail(usuarios, "  ADMIN@Libreria.TEST ")).toBe(usuarios[1]);
  });

  test("sin coincidencia devuelve null", () => {
    expect(buscarPorEmail(usuarios, "otra@correo.test")).toBeNull();
    expect(buscarPorEmail([], "laura@correo.test")).toBeNull();
  });
});
