/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  globalSetup: '<rootDir>/tests/support/globalSetup.ts',
  // Integration tests share one emulator database, so they run one at a time.
  maxWorkers: 1,
  testTimeout: 20000,
};
