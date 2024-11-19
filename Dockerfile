FROM node:22 AS builder

WORKDIR /app

COPY protocol/ /app/protocol
COPY client/ /app/client
COPY server/ /app/server

RUN npm install -g npm@latest \
  && (cd protocol && npm ci && npm run build) \
  && (cd client && npm ci && npm run build) \
  && (cd server && npm ci && npm run build)

FROM gcr.io/distroless/nodejs22-debian12:latest

COPY --chown=nonroot:nonroot --from=builder /app /app

EXPOSE 8888

WORKDIR /app/server
USER nonroot
CMD [ "dist/main.js" ]
