/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  moduleNameMapper: {
    '@helpers/(.*)': '<rootDir>/src/helpers/$1',
    '@/(.*)': '<rootDir>/src/$1',
  },
};
