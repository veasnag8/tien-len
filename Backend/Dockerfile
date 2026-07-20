FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY Shared/package.json Shared/
COPY Socket/package.json Socket/
COPY Backend/package.json Backend/
RUN npm install --workspace=@tien-len/shared --workspace=@tien-len/socket --workspace=@tien-len/backend

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY Shared Shared
COPY Socket Socket
COPY Backend Backend
COPY Database Database
RUN npm run build -w Shared && npm run build -w Socket
WORKDIR /app/Backend
RUN npx prisma generate --schema=../Database/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/Shared ./Shared
COPY --from=build /app/Socket ./Socket
COPY --from=build /app/Backend/dist ./Backend/dist
COPY --from=build /app/Backend/package.json ./Backend/package.json
COPY --from=build /app/Database ./Database
COPY --from=build /app/Backend/prisma ./Backend/prisma
WORKDIR /app/Backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=../Database/schema.prisma && node dist/main.js"]
