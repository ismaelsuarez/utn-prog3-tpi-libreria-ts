# Imagen de producción del frontend: compila con Node y sirve con nginx.
# No lleva variables de entorno ni secretos: el destino de /api se configura al
# iniciar el contenedor (API_UPSTREAM). Ver despliegue/DESPLIEGUE.md.

# ---- Etapa 1: compilación (tsc estricto sobre src/ y tests/, luego vite build)
FROM node:22.23.4-alpine3.24 AS compilacion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: servidor sin privilegios (usuario nginx, uid 101, puerto 8080)
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24
# Se quitan las páginas de ejemplo de la imagen base: solo se sirve la compilación.
USER root
RUN rm -rf /usr/share/nginx/html/*
USER 101
COPY --from=compilacion /app/dist /usr/share/nginx/html
COPY despliegue/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY despliegue/nginx/cabeceras-seguridad.conf /etc/nginx/cabeceras-seguridad.conf
# Destino de /api (en la red interna de Easypanel; alternativa pública:
# API_UPSTREAM=https://api.ismaelsuarez.me). Se cambia al iniciar, sin reconstruir.
ENV API_UPSTREAM=http://libreria_api:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_ENVSUBST_FILTER='^(API_UPSTREAM|NGINX_LOCAL_RESOLVERS)$'
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
