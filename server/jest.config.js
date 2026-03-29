module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
};