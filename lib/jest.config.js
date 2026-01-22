/** @type {import('jest').Config} */

export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/test"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
  moduleNameMapper: {
    "^npm-skeleton/(.*)$": "<rootDir>/src/$1",
    "^npm-skeleton$": "<rootDir>/src/index.ts",
  },
};
