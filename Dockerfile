# syntax=docker/dockerfile:1

# Next.js (Cache Components/PPR) — multi-stage.
#
# Las NEXT_PUBLIC_* se hornean EN EL BUILD (son literales en el bundle):
#   NEXT_PUBLIC_API_URL=/api  → el cliente llama a /api (Caddy lo rutea)
#   NEXT_PUBLIC_SITE_URL      → metadataBase (OG/SEO); poner la URL pública
# El fetch del SERVIDOR (RSC) no puede usar /api relativo (Node fetch exige
# URL absoluta): usa SERVER_API_URL en runtime (http://api:8080 en Docker),
# ver src/lib/api/config.ts.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
# PageProps/LayoutProps son tipos globales que Next genera en .next/types;
# sin typegen previo el build falla en un checkout limpio (igual que en CI).
RUN npm run typegen && npm run build

# Solo dependencias de runtime (sin devDependencies) para la imagen final.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next ./.next
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json next.config.ts ./
COPY public/ ./public/
USER node
EXPOSE 3000
CMD ["npx", "next", "start"]
