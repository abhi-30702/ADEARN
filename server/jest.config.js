// Load server/.env into process.env before Jest reads any config or spawns
// workers (which inherit it). Without this, DATABASE_URL/REDIS_URL are unset and
// every test falls back to the default 5432/6379 — but docker-compose maps
// Postgres to 5433 and Redis to 6380, so integration tests silently SKIP.
require('dotenv').config();

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@adearn/shared$': '<rootDir>/../packages/shared/src/index.ts',
  },
  testTimeout: 30000,
  // globalSetup probes DB + Redis once before any test file is loaded and sets
  // process.env.INFRA_AVAILABLE so integration tests can decide to skip.
  globalSetup: '<rootDir>/tests/integration/setup.ts',
};
