import { describe, expect, test } from "vitest";
import {
  aSesion,
  decidirAcceso,
  destinoPorRol,
  esRol,
  esCuentaCreada,
  esSesion,
  esUsuarioRegistrado,
  rutaDe,
  sesionVigente,
  zonaDeRuta,
} from "../../src/logica/sesion";
import type { IUser } from "../../src/types/IUser";
import type { UsuarioRegistrado } from "../../src/types/usuario";

function usuarioValido(): UsuarioRegistrado {
  return {
    email: "laura@correo.test",
    role: "client",
    contrasena: {
      algoritmo: "PBKDF2-SHA-256",
      iteraciones: 100000,
      sal: "00112233445566778899aabbccddeeff",
      huella: "ab".repeat(32),
    },
    creadoEn: "2026-11-09T17:00:00.000Z",
  };
}

describe("esRol", () => {
  test.each(["client", "admin"])("acepta %s", (rol) => {
    expect(esRol(rol)).toBe(true);
  });

  test.each(["superusuario", "", "Admin", null, undefined, 1, {}])("rechaza %j", (valor) => {
    expect(esRol(valor)).toBe(false);
  });
});

describe("esSesion", () => {
  test("acepta una sesión válida de cada rol", () => {
    expect(esSesion({ email: "a@b.test", loggedIn: true, role: "client" })).toBe(true);
    expect(esSesion({ email: "a@b.test", loggedIn: true, role: "admin" })).toBe(true);
  });

  test("rechaza loggedIn distinto de true", () => {
    expect(esSesion({ email: "a@b.test", loggedIn: false, role: "client" })).toBe(false);
    expect(esSesion({ email: "a@b.test", loggedIn: "true", role: "client" })).toBe(false);
    expect(esSesion({ email: "a@b.test", role: "client" })).toBe(false);
  });

  test("rechaza un rol desconocido", () => {
    expect(esSesion({ email: "a@b.test", loggedIn: true, role: "superusuario" })).toBe(false);
    expect(esSesion({ email: "a@b.test", loggedIn: true })).toBe(false);
  });

  test("rechaza un email vacío, de espacios o que no es texto", () => {
    expect(esSesion({ email: "", loggedIn: true, role: "admin" })).toBe(false);
    expect(esSesion({ email: "   ", loggedIn: true, role: "admin" })).toBe(false);
    expect(esSesion({ email: 7, loggedIn: true, role: "admin" })).toBe(false);
  });

  test.each([null, undefined, [], ["a@b.test"], "texto", 42, true])("rechaza %j", (valor) => {
    expect(esSesion(valor)).toBe(false);
  });
});

describe("esUsuarioRegistrado", () => {
  test("acepta un usuario completo", () => {
    expect(esUsuarioRegistrado(usuarioValido())).toBe(true);
    expect(esUsuarioRegistrado({ ...usuarioValido(), role: "admin" })).toBe(true);
  });

  test.each([
    ["email vacío", { email: "" }],
    ["rol desconocido", { role: "superusuario" }],
    ["sin fecha de alta", { creadoEn: undefined }],
    ["contraseña como texto", { contrasena: "Faro-2026" }],
    ["contraseña nula", { contrasena: null }],
    ["algoritmo distinto", { contrasena: { ...usuarioValido().contrasena, algoritmo: "MD5" } }],
    ["iteraciones en cero", { contrasena: { ...usuarioValido().contrasena, iteraciones: 0 } }],
    ["iteraciones decimales", { contrasena: { ...usuarioValido().contrasena, iteraciones: 1.5 } }],
    ["sal vacía", { contrasena: { ...usuarioValido().contrasena, sal: "" } }],
    ["sal no hexadecimal", { contrasena: { ...usuarioValido().contrasena, sal: "zz" } }],
    ["huella vacía", { contrasena: { ...usuarioValido().contrasena, huella: "" } }],
    ["huella que no es texto", { contrasena: { ...usuarioValido().contrasena, huella: 5 } }],
  ])("rechaza %s", (_nombre, cambios) => {
    expect(esUsuarioRegistrado({ ...usuarioValido(), ...cambios })).toBe(false);
  });

  test.each([null, undefined, [], "texto", 3])("rechaza %j", (valor) => {
    expect(esUsuarioRegistrado(valor)).toBe(false);
  });
});

describe("aSesion", () => {
  test("el resultado tiene exactamente email, loggedIn y role", () => {
    const sesion = aSesion(usuarioValido());
    expect(sesion).toEqual({ email: "laura@correo.test", loggedIn: true, role: "client" });
    expect(Object.keys(sesion).sort()).toEqual(["email", "loggedIn", "role"]);
  });

  test("no lleva la contraseña ni su huella", () => {
    const texto = JSON.stringify(aSesion(usuarioValido()));
    expect(texto).not.toContain("huella");
    expect(texto).not.toContain("contrasena");
    expect(texto).not.toContain("sal");
  });

  test("una sesión armada así es una sesión válida", () => {
    expect(esSesion(aSesion({ ...usuarioValido(), role: "admin" }))).toBe(true);
  });
});

describe("destinoPorRol", () => {
  test("el administrador va a Libros y el cliente al Catálogo", () => {
    expect(destinoPorRol("admin")).toBe("libros");
    expect(destinoPorRol("client")).toBe("catalogo");
  });
});

describe("rutaDe", () => {
  test("rutas relativas a una página de src/pages/<zona>/<vista>/", () => {
    expect(rutaDe("login")).toBe("../../auth/login/login.html");
    expect(rutaDe("registro")).toBe("../../auth/registro/registro.html");
    expect(rutaDe("libros")).toBe("../../admin/libros/libros.html");
    expect(rutaDe("catalogo")).toBe("../../client/catalogo/catalogo.html");
    expect(rutaDe("clientes")).toBe("../../admin/clientes/clientes.html");
    expect(rutaDe("ventas")).toBe("../../admin/ventas/ventas.html");
    expect(rutaDe("historial")).toBe("../../admin/historial/historial.html");
  });

  test("login con cuenta creada agrega la marca en la dirección", () => {
    expect(rutaDe("login", { cuentaCreada: true })).toBe(
      "../../auth/login/login.html?cuenta=creada",
    );
  });

  test("sin la opción, o con ella en falso, la dirección no lleva marca", () => {
    expect(rutaDe("login", {})).toBe("../../auth/login/login.html");
    expect(rutaDe("login", { cuentaCreada: false })).toBe("../../auth/login/login.html");
  });
});

describe("esCuentaCreada", () => {
  test("solo la marca `cuenta=creada` de la dirección anuncia el alta", () => {
    expect(esCuentaCreada("?cuenta=creada")).toBe(true);
    expect(esCuentaCreada("?otro=1&cuenta=creada")).toBe(true);
  });

  test.each(["", "?", "?cuenta=", "?cuenta=otra", "?Cuenta=creada", "?cuenta=Creada", "?x=cuenta=creada"])(
    "no la anuncia con %j",
    (busqueda) => {
      expect(esCuentaCreada(busqueda)).toBe(false);
    },
  );

  test("es la marca que arma rutaDe", () => {
    const ruta = rutaDe("login", { cuentaCreada: true });
    expect(esCuentaCreada(ruta.slice(ruta.indexOf("?")))).toBe(true);
  });
});

describe("zonaDeRuta", () => {
  test.each([
    ["/src/pages/admin/libros/libros.html", "admin"],
    ["/libreria/src/pages/client/catalogo/catalogo.html", "client"],
    ["/src/pages/auth/login/login.html", "auth"],
    ["/src/pages/admin/ventas/ventas", "admin"],
  ])("la ruta %s es de la zona %s", (ruta, zona) => {
    expect(zonaDeRuta(ruta)).toBe(zona);
  });

  test.each(["/index.html", "/", "", "/src/pages/otra/x/x.html", "/admin.html", "/admin/libros"])(
    "la ruta %j no tiene zona conocida",
    (ruta) => {
      expect(zonaDeRuta(ruta)).toBeNull();
    },
  );

  test("la ruta del login armada por rutaDe nunca da una zona desconocida", () => {
    const raiz = "/src/pages/admin/libros/";
    const resuelta = new URL(rutaDe("login"), `http://localhost${raiz}libros.html`).pathname;
    expect(zonaDeRuta(resuelta)).toBe("auth");
  });

  test("funciona bajo una subruta profunda", () => {
    expect(zonaDeRuta("/a/b/c/src/pages/admin/historial/historial.html")).toBe("admin");
    expect(zonaDeRuta("/a/b/c/src/pages/auth/registro/registro.html")).toBe("auth");
  });
});

describe("sesionVigente", () => {
  const laura = usuarioValido();
  const sesionDeLaura = { email: "laura@correo.test", loggedIn: true, role: "client" };

  test("devuelve la sesión si el email existe en users con el mismo rol", () => {
    expect(sesionVigente(sesionDeLaura, [laura])).toEqual(sesionDeLaura);
  });

  test("el email se coteja normalizado en ambos lados y la sesión conserva el texto de userData", () => {
    const resultado = sesionVigente({ ...sesionDeLaura, email: "  LAURA@Correo.TEST " }, [laura]);
    expect(resultado).toEqual({ email: "  LAURA@Correo.TEST ", loggedIn: true, role: "client" });
    expect(sesionVigente(sesionDeLaura, [{ ...laura, email: "Laura@Correo.test" }])).toEqual(
      sesionDeLaura,
    );
  });

  test("el resultado tiene exactamente email, loggedIn y role", () => {
    const resultado = sesionVigente({ ...sesionDeLaura, extra: "x" }, [laura]);
    expect(Object.keys(resultado ?? {}).sort()).toEqual(["email", "loggedIn", "role"]);
  });

  test("rol editado a admin sobre un client registrado: sin sesión", () => {
    expect(sesionVigente({ ...sesionDeLaura, role: "admin" }, [laura])).toBeNull();
  });

  test("rol editado a client sobre un admin registrado: sin sesión", () => {
    const admin = { ...laura, email: "admin@libreria.test", role: "admin" as const };
    expect(sesionVigente({ email: admin.email, loggedIn: true, role: "client" }, [admin])).toBeNull();
    expect(sesionVigente({ email: admin.email, loggedIn: true, role: "admin" }, [admin])).not.toBeNull();
  });

  test("email que no está registrado: sin sesión", () => {
    expect(sesionVigente({ ...sesionDeLaura, email: "otra@correo.test" }, [laura])).toBeNull();
  });

  test("sin usuarios registrados: sin sesión", () => {
    expect(sesionVigente(sesionDeLaura, [])).toBeNull();
  });

  test.each([
    ["loggedIn en falso", { ...sesionDeLaura, loggedIn: false }],
    ["rol superusuario", { ...sesionDeLaura, role: "superusuario" }],
    ["texto", "laura@correo.test"],
    ["null", null],
    ["arreglo vacío", []],
    ["undefined", undefined],
  ])("sesión inválida (%s): sin sesión aunque el usuario exista", (_nombre, guardada) => {
    expect(sesionVigente(guardada, [laura])).toBeNull();
  });
});

describe("decidirAcceso", () => {
  const cliente: IUser = { email: "laura@correo.test", loggedIn: true, role: "client" };
  const admin: IUser = { email: "admin@libreria.test", loggedIn: true, role: "admin" };
  const permitir = { tipo: "permitir" };
  const aLogin = { tipo: "redirigir", destino: "login" };
  const aCatalogo = { tipo: "redirigir", destino: "catalogo" };
  const aLibros = { tipo: "redirigir", destino: "libros" };

  test.each([
    ["auth", null, permitir],
    ["auth", cliente, aCatalogo],
    ["auth", admin, aLibros],
    ["client", null, aLogin],
    ["client", cliente, permitir],
    ["client", admin, permitir],
    ["admin", null, aLogin],
    ["admin", cliente, aCatalogo],
    ["admin", admin, permitir],
    [null, null, aLogin],
    [null, cliente, aCatalogo],
    [null, admin, aLibros],
  ] as const)("zona %s con sesión %j: %j", (zona, sesion, esperada) => {
    expect(decidirAcceso(zona, sesion)).toEqual(esperada);
  });

  test("el destino de la redirección con sesión es el de destinoPorRol", () => {
    for (const sesion of [cliente, admin]) {
      expect(decidirAcceso("auth", sesion)).toEqual({
        tipo: "redirigir",
        destino: destinoPorRol(sesion.role),
      });
    }
  });
});
