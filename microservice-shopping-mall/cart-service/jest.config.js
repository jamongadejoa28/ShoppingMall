module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/__tests__/**",
    "!src/**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // ✅ 통합 테스트를 위한 설정
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testTimeout: 30000, // 30초 타임아웃 (DB 연결 시간 고려)

  // 테스트 분리: 단위 테스트와 통합 테스트
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/src/entities/__tests__/**/*.test.ts"],
      testTimeout: 5000,
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/src/adapters/__tests__/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
      testTimeout: 30000,
    },
  ],
};
