import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // firestore.rules.test.ts requer o emulador Firebase (porta 8080).
    // Para rodar esses testes: firebase emulators:start --only firestore
    // depois: npx vitest run src/firestore.rules.test.ts
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/firestore.rules.test.ts',
    ],
  },
});
