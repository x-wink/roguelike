import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@xwink/engine': path.resolve(__dirname, '../engine/src/index.ts'),
      '@xwink/rpg': path.resolve(__dirname, 'src/index.ts'),
    },
  },
})
