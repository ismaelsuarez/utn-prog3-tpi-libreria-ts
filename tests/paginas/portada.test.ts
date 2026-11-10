import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// La portada es HTML estático sin código: se comprueba su estructura leyendo el
// archivo (el entorno de pruebas es `node`, sin DOM, y no se agregan dependencias).
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const leer = (ruta: string): string => readFileSync(resolve(raiz, ruta), "utf-8");

const RUTA_LOGIN = "src/pages/auth/login/login.html";
const RUTA_REGISTRO = "src/pages/auth/registro/registro.html";
const MARCA_HACIA_PORTADA = "../../../../index.html";

interface Enlace {
  readonly href: string;
  readonly clase: string;
  readonly texto: string;
}

const atributo = (etiqueta: string, nombre: string): string =>
  new RegExp(`\\s${nombre}\\s*=\\s*"([^"]*)"`, "i").exec(etiqueta)?.[1] ?? "";

const quitarEtiquetas = (fragmento: string): string =>
  fragmento.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Todos los enlaces `<a href>` del documento, con su clase y su texto visible. */
const enlacesDe = (html: string): Enlace[] =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((coincidencia) => ({
    href: atributo(coincidencia[0], "href"),
    clase: atributo(coincidencia[0], "class"),
    texto: quitarEtiquetas(coincidencia[2] ?? ""),
  }));

describe("portada (index.html de la raíz)", () => {
  const html = leer("index.html");

  test("no tiene scripts ni manejadores de eventos en línea", () => {
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
  });

  test("no tiene estilos en línea (la política de seguridad los bloquea)", () => {
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
  });

  test("no menciona /api ni ningún origen absoluto", () => {
    expect(html).not.toContain("/api");
    expect(html).not.toMatch(/https?:\/\//i);
  });

  test("no redirige: sin meta refresh ni noscript", () => {
    expect(html).not.toMatch(/http-equiv\s*=\s*"refresh"/i);
    expect(html).not.toMatch(/<noscript/i);
  });

  test("el cuerpo no nace oculto: no hay código que lo muestre", () => {
    const cuerpo = /<body\b[^>]*>/i.exec(html)?.[0] ?? "";
    expect(cuerpo).not.toBe("");
    expect(cuerpo).not.toMatch(/\bhidden\b/i);
  });

  test("tiene exactamente un título principal", () => {
    expect(html.match(/<h1[\s>]/gi) ?? []).toHaveLength(1);
  });

  test("tiene encabezado, navegación, contenido principal y pie", () => {
    for (const etiqueta of ["header", "nav", "main", "footer"]) {
      expect(html.match(new RegExp(`<${etiqueta}[\\s>]`, "gi")) ?? [], etiqueta).toHaveLength(1);
    }
  });

  test("declara idioma, codificación y vista adaptable", () => {
    expect(html).toMatch(/<html[^>]*\slang="es"/i);
    expect(html).toMatch(/<meta\s+charset="utf-8"/i);
    expect(html).toMatch(/name="viewport"/i);
  });

  test("el título del documento nombra la portada y la librería", () => {
    const titulo = /<title>([^<]*)<\/title>/i.exec(html)?.[1] ?? "";
    expect(titulo).toBe("Inicio · Librería El Faro");
  });

  test("presenta el texto aprobado", () => {
    const texto = quitarEtiquetas(html);
    expect(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]?.trim()).toBe("Libros con historia, a un paso");
    expect(texto).toContain("Librería El Faro es una librería de barrio");
    expect(texto).toContain("Para ver el catálogo necesitás ingresar con tu cuenta.");
    for (const integrante of ["Avalos Pablo", "Blangetti Sofia", "Suarez Ismael"]) {
      expect(texto).toContain(integrante);
    }
  });

  test("«Ingresar» lleva al login y «Crear cuenta» al registro, con enlaces relativos", () => {
    const enlaces = enlacesDe(html);
    const ingresar = enlaces.find((enlace) => enlace.texto === "Ingresar");
    const crearCuenta = enlaces.find((enlace) => enlace.texto === "Crear cuenta");
    expect(ingresar?.href).toBe(RUTA_LOGIN);
    expect(crearCuenta?.href).toBe(RUTA_REGISTRO);
    expect(ingresar?.clase).toContain("boton");
    expect(crearCuenta?.clase).toContain("boton");
  });

  test("los accesos están dentro de la navegación «Acceso»", () => {
    const navegacion = /<nav\b[^>]*aria-label="Acceso"[^>]*>([\s\S]*?)<\/nav>/i.exec(html)?.[1] ?? "";
    expect(enlacesDe(navegacion).map((enlace) => enlace.texto)).toEqual(["Ingresar", "Crear cuenta"]);
  });

  test("todo enlace, hoja de estilo e imagen es relativo y existe", () => {
    const referencias = [...html.matchAll(/\s(?:href|src)\s*=\s*"([^"]*)"/gi)]
      .map((coincidencia) => coincidencia[1] ?? "")
      .filter((ruta) => ruta !== "" && !ruta.startsWith("data:"));
    expect(referencias.length).toBeGreaterThan(0);
    for (const ruta of referencias) {
      expect(ruta, ruta).not.toMatch(/^(\/|[a-z]+:)/i);
      expect(existsSync(resolve(raiz, ruta)), ruta).toBe(true);
    }
  });

  test("enlaza las hojas de estilo propias, incluida portada.css", () => {
    for (const hoja of ["base", "disposicion", "componentes", "vista-inmersiva", "portada"]) {
      expect(html).toContain(`src/styles/${hoja}.css`);
    }
  });
});

describe.each([
  ["login", RUTA_LOGIN, "Crear cuenta", "../registro/registro.html"],
  ["registro", RUTA_REGISTRO, "Ingresar", "../login/login.html"],
])("la marca de %s enlaza a la portada", (_nombre, ruta, textoOtroAcceso, hrefOtroAcceso) => {
  const html = leer(ruta);
  const enlaces = enlacesDe(html);

  test("la marca «Librería El Faro» es un enlace a index.html de la raíz", () => {
    const marca = enlaces.find((enlace) => enlace.texto === "Librería El Faro");
    expect(marca?.href).toBe(MARCA_HACIA_PORTADA);
  });

  test("el enlace de la marca no usa navegacion__enlace (la guarda lo quitaría)", () => {
    const marca = enlaces.find((enlace) => enlace.href === MARCA_HACIA_PORTADA);
    expect(marca).toBeDefined();
    expect(marca?.clase).not.toContain("navegacion__enlace");
  });

  test("el enlace de la marca está dentro de la marca del encabezado", () => {
    const marca = /<div class="encabezado__marca">([\s\S]*?)<\/div>/i.exec(html)?.[1] ?? "";
    expect(enlacesDe(marca).map((enlace) => enlace.href)).toEqual([MARCA_HACIA_PORTADA]);
  });

  test("conserva su acceso cruzado y su script de módulo", () => {
    const otro = enlaces.find((enlace) => enlace.texto === textoOtroAcceso && enlace.clase === "navegacion__enlace");
    expect(otro?.href).toBe(hrefOtroAcceso);
    expect(html).toMatch(/<script type="module" src="\.\/[a-z]+\.ts">/i);
  });
});
