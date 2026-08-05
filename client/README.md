# client

Vite + Vue 3 の SPA。共有の型定義を `server/protocol` から import しているので、
**先に `server` をビルドして `server/dist/protocol.d.ts` を用意しておくこと**
(無いと型検査が TS2307 で落ちる)。

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```
`/diaries` へのリクエストは `http://localhost:3000` (server) にプロキシされる。
リポジトリ全体の開発は `make dev` (`_scripts/dev.sh`) を使う。

### Compiles and minifies for production
```
npm run build
```
`vue-tsc --noEmit` で型検査してから `vite build` で `dist/` に出力する。

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
