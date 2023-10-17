FROM node:18.17

WORKDIR /app


RUN date

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/

RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3000

CMD npx prisma migrate deploy && npm run start
