import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

export default [
  ...expoConfig,
  prettier,
  {
    rules: {
      'react-native/no-inline-styles': 'off',
    },
  },
  {
    ignores: [
      '.expo/**',
      'dist/**',
      'node_modules/**',
      '*.js',
      '*.cjs',
    ],
  },
];
