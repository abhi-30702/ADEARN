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
