FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY Shared/package.json Shared/
COPY Socket/package.json Socket/
COPY Frontend/package.json Frontend/
RUN npm install --workspace=@tien-len/shared --workspace=@tien-len/socket --workspace=@tien-len/frontend

FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost/api
ARG NEXT_PUBLIC_WS_URL=http://localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY Shared Shared
COPY Socket Socket
COPY Frontend Frontend
RUN npm run build -w Shared && npm run build -w Socket
WORKDIR /app/Frontend
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/Frontend/.next/standalone ./
COPY --from=build /app/Frontend/.next/static ./Frontend/.next/static
COPY --from=build /app/Frontend/public ./Frontend/public
EXPOSE 3000
CMD ["node", "Frontend/server.js"]
