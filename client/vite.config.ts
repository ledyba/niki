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
