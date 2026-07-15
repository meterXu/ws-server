FROM 172.16.150.3:8082/node:22-bullseye-slim

WORKDIR /ws-server

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY assets ./assets
COPY src ./src

VOLUME ["/ws-server/data"]
EXPOSE 3000

ENTRYPOINT ["npm","run","start"]
