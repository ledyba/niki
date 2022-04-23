FROM node:current-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install -g npm@latest \
 && (cd bridge && npm ci && npm run build) \
 && (cd client && npm ci && npm run build) \
 && (cd server && npm ci && npm run build)

EXPOSE 8888

WORKDIR /usr/src/app/server
ENTRYPOINT [ "node" ]
CMD ["dist/main.js"]

