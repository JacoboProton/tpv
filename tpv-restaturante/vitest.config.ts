import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, 'e2e/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        'lib/types/**',
        // Infra / I-O (netgo/DB/env). Cubiertas por tests de integración/e2e,
        // no por unit-test del reporte de lógica pura.
        'lib/api.ts',
        'lib/auth-deprecated.ts',
        'lib/backup.ts',
        'lib/drizzle.ts',
        'lib/env.ts',
        'lib/events.ts',
        'lib/fiskaly.ts',
        'lib/logger.ts',
        'lib/modifiers.ts',
        'lib/payment-logger.ts',
        'lib/rbac.ts',
        'lib/realtime.ts',
        'lib/run-migrations.ts',
        'lib/session.ts',
        'lib/settings-cache.ts',
        'lib/sound.ts',
        'lib/tenant.ts',
        'lib/ticket-template.ts',
        'lib/verify-webhook.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
