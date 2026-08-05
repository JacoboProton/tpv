import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}', 'modules/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'app/api/**/route.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
