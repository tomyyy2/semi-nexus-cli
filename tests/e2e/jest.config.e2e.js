module.exports = {
  rootDir: '../../',
  testMatch: ['**/tests/e2e/**/*.e2e.test.ts'],
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: false,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};
