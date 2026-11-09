// Se ejecuta antes de cada archivo de prueba: ninguna prueba sale a la red. Las
// pruebas de acceso a datos inyectan su propia función de solicitud; la que
// olvide hacerlo falla aquí en lugar de llegar a la API.
globalThis.fetch = (): Promise<Response> =>
  Promise.reject(
    new Error("Prueba sin red: inyectá una función de solicitud en lugar de usar el fetch global."),
  );
