FROM hub.xdog.icu/node:22-bullseye-slim


RUN mkdir -p /ws-server

COPY assets /ws-server/assets
COPY node_modules /ws-server/node_modules
COPY src /ws-server/src
COPY package.json /ws-server/package.json

WORKDIR /ws-server


EXPOSE 3000

ENTRYPOINT ["npm","run","start"]
