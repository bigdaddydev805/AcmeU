# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_GRAPHQL_URL=/graphql
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm ci --ignore-scripts

COPY apps/web apps/web
RUN npm run build --workspace @acmeu/web

FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

RUN printf '%s\n' \
  'server {' \
  '    listen 80;' \
  '    server_name _;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    server_tokens off;' \
  '' \
  '    gzip on;' \
  '    gzip_types text/css application/javascript application/json image/svg+xml;' \
  '    gzip_min_length 1024;' \
  '' \
  '    location /assets/ {' \
  '        expires 1y;' \
  '        add_header Cache-Control "public, immutable";' \
  '        try_files $uri =404;' \
  '    }' \
  '' \
  '    location = /healthz {' \
  '        access_log off;' \
  '        return 200 "ok\\n";' \
  '    }' \
  '' \
  '    location / {' \
  '        try_files $uri /index.html;' \
  '    }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
