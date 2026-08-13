import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// server が client/dist をそのまま静的配信する (Server.ts の sendFile) ので、
// base は '/' 固定・出力先は dist のまま動かさない。
export default defineConfig({
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 既定 (baseline-widely-available) だと minifier が
    // `@media (max-width: 48em)` を Media Queries Level 4 の range 構文
    // `@media (width<=48em)` に書き換える。range 構文を解釈できないエンジン
    // (iOS 16.4 未満など) は at-rule ごと中身を捨てるので、狭い画面向けの
    // 指定が丸ごと効かなくなる。CSS だけ古い記法に留める。
    cssTarget: 'safari15',
  },
  server: {
    // vite の dev server 単体では API が無いので、server (localhost:3000) へ回す。
    proxy: {
      '/diaries': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.ts'],
  },
})
