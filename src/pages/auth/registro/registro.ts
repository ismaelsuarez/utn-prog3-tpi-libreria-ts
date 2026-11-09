// Página de registro: arma el borrador, lo envía al servicio de autenticación y
// muestra los errores junto a cada campo. Si ya hay una sesión válida redirige
// según el rol sin mostrar el formulario. Los mensajes se insertan como texto.
import "../../../main";
import { autenticacion } from "../../../datos/proveedor";
import { rutaDe } from "../../../logica/sesion";
import { irAlDestinoDelRol, obtenerSesion } from "../../../utils/auth";
import {
  elementoPorId,
  limpiarErroresDeCampos,
  mostrarErroresDeCampos,
  mostrarMensaje,
  textoDeError,
} from "../../../utils/dom";
import { navegar } from "../../../utils/navigate";

const PREFIJO = "registro";
const CAMPOS = ["email", "contrasena", "repeticion"] as const;

function iniciar(): void {
  const sesion = obtenerSesion();
  if (sesion !== null) {
    irAlDestinoDelRol(sesion);
    return;
  }
  elementoPorId("contenido-acceso", HTMLElement).hidden = false;

  const formulario = elementoPorId("form-registro", HTMLFormElement);
  const resumen = elementoPorId("mensaje-error", HTMLElement);
  const boton = formulario.querySelector<HTMLButtonElement>('button[type="submit"]');

  async function registrar(): Promise<void> {
    limpiarErroresDeCampos(PREFIJO, CAMPOS, resumen);
    const errores = await autenticacion.registrar({
      email: elementoPorId("registro-email", HTMLInputElement).value,
      contrasena: elementoPorId("registro-contrasena", HTMLInputElement).value,
      repeticion: elementoPorId("registro-repeticion", HTMLInputElement).value,
    });
    if (errores.length > 0) {
      mostrarErroresDeCampos(
        PREFIJO,
        errores,
        resumen,
        "Revisá los campos marcados. No se creó la cuenta.",
      );
      return;
    }
    navegar(rutaDe("login", { cuentaCreada: true }));
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    // Derivar la huella tarda decenas de milisegundos: se evita un segundo envío.
    if (boton) boton.disabled = true;
    registrar()
      .catch((error: unknown) => {
        mostrarMensaje(resumen, textoDeError(error));
      })
      .finally(() => {
        if (boton) boton.disabled = false;
      });
  });
}

iniciar();
