import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/firestore.rules.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
