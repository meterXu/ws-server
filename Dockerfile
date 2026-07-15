FROM 172.16.150.3:8082/node:22-bullseye-slim


RUN mkdir -p /ws-server

COPY assets /ws-server/assets
COPY node_modules /ws-server/node_modules
COPY src /ws-server/src
COPY package.json /ws-server/package.json

WORKDIR /ws-server

VOLUME ["/ws-server/data"]
EXPOSE 3000

ENTRYPOINT ["npm","run","start"]
