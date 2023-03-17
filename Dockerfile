FROM node:18-bullseye-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y chromium --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app \
    && chown -Rh node: /usr/src/app
WORKDIR /usr/src/app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm install
COPY --chown=node:node . .

CMD npm start
EXPOSE 3000
