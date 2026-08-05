import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
  {
    ignores: ['dist/**', 'public/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  js.configs.recommended,
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.{js,ts}', 'tests/unit/**/*.spec.{js,ts}'],
    languageOptions: {
      globals: globals.mocha,
    },
  },
)
