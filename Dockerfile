# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@12.14.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf \
  && mkdir -p /var/cache/nginx /usr/share/nginx/html \
  && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=3s --start-period=2s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1

ENTRYPOINT ["nginx", "-g", "daemon off;"]
