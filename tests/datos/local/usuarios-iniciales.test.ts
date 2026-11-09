import { describe, expect, test } from "vitest";
import { verificarContrasena } from "../../../src/datos/local/contrasenas";
import { usuariosIniciales } from "../../../src/datos/local/usuarios-iniciales";
import { esUsuarioRegistrado } from "../../../src/logica/sesion";

// La contraseña de demostración vive solo en el README y en esta prueba: el
// código que viaja al navegador contiene únicamente su huella.
const CONTRASENA_DEL_ADMINISTRADOR = "Faro-Admin-2026";

describe("usuariosIniciales", () => {
  test("hay un único usuario: el administrador de demostración", () => {
    expect(usuariosIniciales).toHaveLength(1);
    expect(usuariosIniciales[0]?.email).toBe("admin@libreria.test");
    expect(usuariosIniciales[0]?.role).toBe("admin");
  });

  test("tiene la forma de un usuario guardado y el email ya normalizado", () => {
    const [admin] = usuariosIniciales;
    expect(esUsuarioRegistrado(admin)).toBe(true);
    expect(admin?.email).toBe(admin?.email.trim().toLowerCase());
  });

  test("la huella precalculada corresponde a la contraseña documentada", async () => {
    const [admin] = usuariosIniciales;
    expect(admin).toBeDefined();
    if (admin === undefined) return;
    expect(await verificarContrasena(CONTRASENA_DEL_ADMINISTRADOR, admin.contrasena)).toBe(true);
    expect(await verificarContrasena("Faro-Admin-2027", admin.contrasena)).toBe(false);
  });

  test("el texto de la contraseña no está en lo que se siembra", () => {
    expect(JSON.stringify(usuariosIniciales)).not.toContain(CONTRASENA_DEL_ADMINISTRADOR);
  });
});
