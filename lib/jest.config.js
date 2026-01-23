/** @type {import('jest').Config} */

export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/test"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
  moduleNameMapper: {
    "^markdown/(.*)$": "<rootDir>/src/$1",
    "^markdown$": "<rootDir>/src/index.ts",
  },
};
