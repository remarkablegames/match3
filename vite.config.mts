import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      src: resolve(import.meta.dirname, './src'),
    },
  },

  test: {
    coverage: {
      thresholds: {
        100: true,
      },
      include: ['src/**/*.ts'],
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setupTests.ts'],
  },
});
