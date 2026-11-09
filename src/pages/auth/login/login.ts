// Página de login: valida que los campos no estén vacíos, comprueba las
// credenciales con el servicio de autenticación y pasa al destino del rol. Ante
// credenciales incorrectas muestra un único mensaje, sin revelar cuál dato falló.
// Si ya hay una sesión válida redirige sin mostrar el formulario.
import "../../../main";
import { autenticacion } from "../../../datos/proveedor";
import { esCuentaCreada } from "../../../logica/sesion";
import { validarIngreso } from "../../../logica/usuarios";
import { irAlDestinoDelRol, obtenerSesion } from "../../../utils/auth";
import {
  elementoPorId,
  limpiarErroresDeCampos,
  mostrarErroresDeCampos,
  mostrarMensaje,
  ocultarMensaje,
  textoDeError,
} from "../../../utils/dom";

const PREFIJO = "login";
const CAMPOS = ["email", "contrasena"] as const;
const MENSAJE_CREDENCIALES = "El email o la contraseña no son correctos.";

function iniciar(): void {
  const sesion = obtenerSesion();
  if (sesion !== null) {
    irAlDestinoDelRol(sesion);
    return;
  }
  elementoPorId("contenido-acceso", HTMLElement).hidden = false;

  const formulario = elementoPorId("form-login", HTMLFormElement);
  const resumen = elementoPorId("mensaje-error", HTMLElement);
  const estado = elementoPorId("mensaje-estado", HTMLElement);
  const email = elementoPorId("login-email", HTMLInputElement);
  const contrasena = elementoPorId("login-contrasena", HTMLInputElement);
  const boton = formulario.querySelector<HTMLButtonElement>('button[type="submit"]');

  if (esCuentaCreada(window.location.search)) {
    mostrarMensaje(estado, "Cuenta creada. Ingresá con tu email y contraseña.");
  }

  async function ingresar(): Promise<void> {
    limpiarErroresDeCampos(PREFIJO, CAMPOS, resumen);
    const credenciales = { email: email.value, contrasena: contrasena.value };
    const errores = validarIngreso(credenciales);
    if (errores.length > 0) {
      mostrarErroresDeCampos(PREFIJO, errores, resumen, "Revisá los campos marcados. No se inició sesión.");
      return;
    }
    const iniciada = await autenticacion.ingresar(credenciales);
    if (iniciada === null) {
      mostrarMensaje(resumen, MENSAJE_CREDENCIALES);
      contrasena.focus();
      return;
    }
    irAlDestinoDelRol(iniciada);
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    ocultarMensaje(estado);
    if (boton) boton.disabled = true;
    ingresar()
      .catch((error: unknown) => {
        mostrarMensaje(resumen, textoDeError(error));
      })
      .finally(() => {
        if (boton) boton.disabled = false;
      });
  });
}

iniciar();
