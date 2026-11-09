#!/bin/sh
# Comprobación de solo lectura del servidor de producción del frontend.
#
# Uso:  sh despliegue/comprobar.sh <base>
#       sh despliegue/comprobar.sh http://127.0.0.1:8080
#       sh despliegue/comprobar.sh https://libreria.ismaelsuarez.me
#
# Solo envía GET y HEAD (curl sin -X ni -d): sirve igual contra un contenedor
# local y contra el sitio publicado. Imprime una línea por caso y termina con
# código distinto de 0 si algún caso falla.

set -u

if [ "$#" -ne 1 ]; then
  echo "Uso: sh despliegue/comprobar.sh <base>   (por ejemplo http://127.0.0.1:8080)" >&2
  exit 2
fi

BASE=${1%/}
TOTAL=0
FALLAS=0
CSP_ESPERADA_1="default-src 'self'"
CSP_ESPERADA_2="frame-ancestors 'none'"

# Imprime el resultado de un caso: caso <nombre> <0 si pasa>.
caso() {
  TOTAL=$((TOTAL + 1))
  if [ "$2" -eq 0 ]; then
    echo "ok     $1"
  else
    FALLAS=$((FALLAS + 1))
    echo "FALLA  $1${3:+ ($3)}"
  fi
}

# Cabeceras de una solicitud GET (sin seguir redirecciones): cabeceras <ruta> [opciones de curl]
cabeceras() {
  ruta=$1
  shift
  curl -sS --max-time 15 -o /dev/null -D - "$@" "$BASE$ruta" 2>/dev/null | tr -d '\r'
}

# estado <cabeceras>
estado() {
  printf '%s\n' "$1" | sed -n '1s/^HTTP\/[0-9.]* \([0-9][0-9]*\).*/\1/p'
}

# valor <cabeceras> <nombre>: valor de la primera cabecera con ese nombre.
valor() {
  printf '%s\n' "$1" | grep -i "^$2:" | head -n 1 | sed 's/^[^:]*: *//'
}

# Comprueba el estado y, opcionalmente, una cabecera: espera_estado <nombre> <cabeceras> <estado>
espera_estado() {
  obtenido=$(estado "$2")
  [ "$obtenido" = "$3" ]
  caso "$1" $? "estado ${obtenido:-sin respuesta}, se esperaba $3"
}

# espera_valor <nombre> <cabeceras> <cabecera> <valor exacto>
espera_valor() {
  obtenido=$(valor "$2" "$3")
  [ "$obtenido" = "$4" ]
  caso "$1" $? "$3: '${obtenido}', se esperaba '$4'"
}

# espera_contiene <nombre> <cabeceras> <cabecera> <fragmento>
espera_contiene() {
  obtenido=$(valor "$2" "$3")
  case "$obtenido" in
    *"$4"*) ok=0 ;;
    *) ok=1 ;;
  esac
  caso "$1" "$ok" "$3: '${obtenido}', falta '$4'"
}

# Las cuatro cabeceras de seguridad que toda respuesta debe llevar.
espera_seguridad() {
  espera_contiene "$1: CSP default-src" "$2" content-security-policy "$CSP_ESPERADA_1"
  espera_contiene "$1: CSP frame-ancestors" "$2" content-security-policy "$CSP_ESPERADA_2"
  espera_valor "$1: nosniff" "$2" x-content-type-options nosniff
  espera_valor "$1: referrer" "$2" referrer-policy no-referrer
}

# ---------------------------------------------------------------------------
# Servicio estático, salud, entrada, caché y cabeceras
# ---------------------------------------------------------------------------
estaticos() {
  h=$(cabeceras /healthz)
  espera_estado "/healthz responde 200" "$h" 200
  cuerpo=$(curl -sS --max-time 15 "$BASE/healthz" 2>/dev/null)
  [ "$cuerpo" = "ok" ]
  caso "/healthz cuerpo 'ok'" $? "cuerpo '$(printf '%s' "$cuerpo" | head -c 40 | tr '\n' ' ')'"
  espera_seguridad "/healthz" "$h"

  for entrada in / /index.html; do
    h=$(cabeceras "$entrada")
    espera_estado "$entrada redirige 302" "$h" 302
    espera_valor "$entrada Location relativo al login" "$h" location /src/pages/auth/login/login.html
  done

  login=/src/pages/auth/login/login.html
  h=$(cabeceras "$login")
  espera_estado "login 200" "$h" 200
  espera_contiene "login text/html" "$h" content-type text/html
  espera_valor "login Cache-Control no-cache" "$h" cache-control no-cache
  espera_seguridad "login" "$h"
  servidor=$(valor "$h" server)
  case "$servidor" in
    nginx) ok=0 ;;
    *) ok=1 ;;
  esac
  caso "login Server sin versión" "$ok" "Server: '$servidor'"

  # Un recurso con huella de assets/, tomado del HTML del login: el módulo común
  # (main-<huella>.js), el único script del login con más de 1 KiB (umbral de gzip).
  recurso=$(curl -sS --max-time 15 "$BASE$login" 2>/dev/null | grep -o 'assets/main-[A-Za-z0-9._-]*\.js' | head -n 1)
  if [ -z "$recurso" ]; then
    caso "login referencia el script común de assets/" 1 "no se encontró"
    return
  fi
  caso "login referencia el script común de assets/" 0
  h=$(cabeceras "/$recurso" -H 'Accept-Encoding: gzip')
  espera_estado "/$recurso 200" "$h" 200
  espera_valor "assets Cache-Control inmutable" "$h" cache-control "public, max-age=31536000, immutable"
  espera_seguridad "assets" "$h"
  espera_valor "assets gzip" "$h" content-encoding gzip
  espera_contiene "assets Vary" "$h" vary Accept-Encoding

  h=$(cabeceras /no-existe.html)
  espera_estado "/no-existe.html 404" "$h" 404
  espera_seguridad "404" "$h"
}

estaticos

echo
echo "$((TOTAL - FALLAS)) de $TOTAL casos correctos contra $BASE"
[ "$FALLAS" -eq 0 ]
