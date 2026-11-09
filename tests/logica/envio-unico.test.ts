import { describe, expect, test } from "vitest";
import { crearEnvioUnico } from "../../src/logica/envio-unico";

/** Promesa que se resuelve o rechaza a pedido de la prueba. */
function pendiente<T>(): { promesa: Promise<T>; resolver: (valor: T) => void; rechazar: (motivo: Error) => void } {
  let resolver!: (valor: T) => void;
  let rechazar!: (motivo: Error) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

describe("crearEnvioUnico", () => {
  test("avisa que la operación está en curso y, al terminar, que quedó libre", async () => {
    const avisos: boolean[] = [];
    const ejecutar = crearEnvioUnico((enCurso) => avisos.push(enCurso));
    const espera = pendiente<string>();

    const resultado = ejecutar(() => espera.promesa);
    expect(avisos).toEqual([true]);

    espera.resolver("listo");
    await expect(resultado).resolves.toBe("listo");
    expect(avisos).toEqual([true, false]);
  });

  test("un segundo envío durante la espera no invoca la tarea (doble clic o Enter)", async () => {
    const ejecutar = crearEnvioUnico(() => undefined);
    const espera = pendiente<string>();
    let llamadas = 0;
    const tarea = (): Promise<string> => {
      llamadas += 1;
      return espera.promesa;
    };

    const primero = ejecutar(tarea);
    const segundo = ejecutar(tarea);
    await expect(segundo).resolves.toBeUndefined();
    expect(llamadas).toBe(1);

    espera.resolver("listo");
    await primero;
    expect(llamadas).toBe(1);
  });

  test("tras un rechazo vuelve a quedar libre, sin ocultar el error, y admite otro envío", async () => {
    const avisos: boolean[] = [];
    const ejecutar = crearEnvioUnico((enCurso) => avisos.push(enCurso));
    const espera = pendiente<string>();

    const fallido = ejecutar(() => espera.promesa);
    espera.rechazar(new Error("rechazado"));
    await expect(fallido).rejects.toThrow("rechazado");
    expect(avisos).toEqual([true, false]);

    await expect(ejecutar(() => Promise.resolve("de nuevo"))).resolves.toBe("de nuevo");
    expect(avisos).toEqual([true, false, true, false]);
  });

  test("una tarea que lanza de inmediato también libera el envío", async () => {
    const avisos: boolean[] = [];
    const ejecutar = crearEnvioUnico((enCurso) => avisos.push(enCurso));
    await expect(
      ejecutar(() => {
        throw new Error("falla síncrona");
      }),
    ).rejects.toThrow("falla síncrona");
    expect(avisos).toEqual([true, false]);
  });
});
