import { describe, expect, test } from "vitest";

describe("fetch global en las pruebas", () => {
  test("rechaza con un mensaje que explica que la suite no sale a la red", async () => {
    // Dirección de loopback: si el bloqueo no existiera, no saldría de la máquina.
    await expect(globalThis.fetch("http://127.0.0.1:9/no-inyectado")).rejects.toThrow(
      /sin red.*inyect/i,
    );
  });

  test("el rechazo no depende del método ni de la dirección", async () => {
    await expect(
      globalThis.fetch("/api/clientes/", { method: "POST", body: "{}" }),
    ).rejects.toThrow(/sin red.*inyect/i);
  });
});
