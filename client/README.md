# client

A Vite + Vue 3 SPA. It imports the shared type definitions from `server/protocol`,
so **build `server` first** to emit `server/dist/protocol.d.ts` — without it the
typecheck fails with `TS2307`.

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```
Requests to `/diaries` are proxied to `http://localhost:3000` (the server).
To work on the whole repository at once, use `make dev` (`_scripts/dev.sh`).

### Compiles and minifies for production
```
npm run build
```
Typechecks with `vue-tsc --noEmit`, then emits to `dist/` with `vite build`.

### Type check only
```
npm run typecheck
```

### Run your unit tests
```
npm run test:unit
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Vite Configuration Reference](https://vite.dev/config/).
