import "reflect-metadata";
import { AppDataSource } from "@frameworks/database/data-source";

// 테스트 환경 설정
process.env.NODE_ENV = "test";
process.env.DB_NAME = "shopping_mall_users_test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.CORS_ORIGIN = "http://localhost:3000";

// Jest 타임아웃 설정
jest.setTimeout(30000);

// 전역 테스트 설정
beforeAll(async () => {
  console.log("🚀 User Service test environment initialized");

  // 테스트용 데이터베이스 연결 (메모리 DB 또는 별도 테스트 DB)
  try {
    if (!AppDataSource.isInitialized) {
      // 테스트 환경에서는 sqlite 메모리 DB 사용
      const testDataSource = AppDataSource.setOptions({
        type: "sqlite",
        database: ":memory:",
        dropSchema: true,
        synchronize: true,
        logging: false,
      });

      await testDataSource.initialize();
    }
  } catch (error) {
    console.error("Test database setup failed:", error);
  }
});

afterAll(async () => {
  console.log("✅ User Service test cleanup completed");

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error("Test database cleanup failed:", error);
  }
});

// 각 테스트 전후 정리
beforeEach(async () => {
  // 각 테스트 전 데이터베이스 초기화
  if (AppDataSource.isInitialized) {
    await AppDataSource.synchronize(true); // 스키마 드롭 후 재생성
  }
});

afterEach(() => {
  // 각 테스트 후 정리
  jest.clearAllMocks();
});
