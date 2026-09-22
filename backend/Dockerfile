# Imagen del backend Express para Cloud Run.
#
# Dos etapas: la primera compila (necesita las devDependencies: typescript y el
# CLI de prisma), la segunda solo corre el resultado. Así la imagen final queda
# chica y sin herramientas de build.
#
# Prisma necesita OpenSSL en el sistema: sin eso el cliente falla al arrancar
# con "Unable to require libquery_engine". Por eso se instala en las dos etapas.

# ---------- Etapa 1: compilar ----------
FROM node:20-bookworm-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Se copian primero los manifiestos y el schema: si no cambian, Docker reutiliza
# la capa de npm ci y el build es mucho más rápido.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# `npm run build` = prisma generate && tsc -p tsconfig.json
RUN npm run build

# ---------- Etapa 2: ejecutar ----------
FROM node:20-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# El cliente de Prisma ya generado en la etapa anterior. Se copia en vez de
# volver a generarlo, porque el CLI de prisma es una devDependency y acá no está.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

# Cloud Run inyecta PORT (8080 por defecto) y el backend ya la lee en
# src/config/env.ts. No hay que fijarla a mano.
EXPOSE 8080

CMD ["node", "dist/index.js"]
