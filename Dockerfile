# ---- Stage 1: Build SvelteKit frontend ----
FROM 172.16.150.3:8082/node:22-bullseye-slim AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# ---- Stage 2: Production server ----
FROM 172.16.150.3:8082/node:22-bullseye-slim

WORKDIR /app

# 安装生产依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 复制构建输出和自定义 server 入口
COPY --from=web-builder /app/build ./build
COPY server.js ./
COPY src/lib/server ./src/lib/server

VOLUME ["/app/data"]
EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["node","server.js"]
