module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: false,
        tsconfig: {
          types: ["node", "jest"],
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/frameworks/database/migrations/**/*",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@entities/(.*)$": "<rootDir>/src/entities/$1",
    "^@usecases/(.*)$": "<rootDir>/src/usecases/$1",
    "^@adapters/(.*)$": "<rootDir>/src/adapters/$1",
    "^@frameworks/(.*)$": "<rootDir>/src/frameworks/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@tests/(.*)$": "<rootDir>/src/__tests__/$1",
    "^@shopping-mall/shared$": "<rootDir>/../shared/src/index.ts",
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
  reporters: ["default"],
};
