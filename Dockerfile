FROM node:18.17 AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM base AS postgres

WORKDIR /app

COPY --from=base /app/ ./

RUN ls

COPY prisma ./prisma/
COPY ./env.postgres .

RUN npm run prisma:generate:postgres

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3000


CMD npx prisma migrate deploy --schema=./prisma/postgres/schema.prisma && npm run start

FROM base AS sqlserver

COPY prisma ./prisma/
COPY ./env.sqlserver .

RUN npm run prisma:generate:sqlserver

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3000

CMD npx prisma migrate deploy --schema=./prisma/sqlserver/schema.prisma && npm run start
