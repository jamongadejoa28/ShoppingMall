// cart-service/src/__tests__/setup/integration-setup.ts
// ========================================

import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm"; // 🔧 수정: DataSourceOptions 추가
import { Redis } from "ioredis";

// 글로벌 테스트 변수
declare global {
  var testDataSource: DataSource;
  var testRedis: Redis;
}

// 각 테스트 파일 실행 전 설정
beforeAll(async () => {
  console.log("🔧 [Test Setup] 테스트 데이터베이스 연결 중...");

  // 🔧 수정: PostgreSQL 타입 명시적 지정
  const testDataSourceOptions: DataSourceOptions = {
    type: "postgres", // 🔧 수정: 타입 명시
    host: "localhost",
    port: 5433,
    database: "cart_service_test",
    username: "test_user",
    password: "test_password",
    synchronize: false, // 스키마는 이미 초기화됨
    dropSchema: false,
    entities: [
      // 🔧 수정: 엔티티 경로 추가
      "src/adapters/entities/*.ts",
    ],
    logging: false,
  };

  global.testDataSource = new DataSource(testDataSourceOptions);

  if (!global.testDataSource.isInitialized) {
    await global.testDataSource.initialize();
  }

  // Redis 테스트 연결
  global.testRedis = new Redis({
    host: "localhost",
    port: 6380,
    password: "",
    db: 0,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  await global.testRedis.connect();

  console.log("✅ [Test Setup] 테스트 환경 연결 완료");
});

// 각 테스트 파일 실행 후 정리
afterAll(async () => {
  console.log("🧹 [Test Cleanup] 테스트 환경 정리 중...");

  try {
    // Redis 연결 종료
    if (global.testRedis) {
      await global.testRedis.quit();
    }

    // DB 연결 종료
    if (global.testDataSource && global.testDataSource.isInitialized) {
      await global.testDataSource.destroy();
    }

    console.log("✅ [Test Cleanup] 정리 완료");
  } catch (error) {
    console.error("❌ [Test Cleanup] 정리 실패:", error);
  }
});

// 각 개별 테스트 전 데이터 정리
beforeEach(async () => {
  // Redis 캐시 전체 삭제
  if (global.testRedis) {
    await global.testRedis.flushdb();
  }

  // 테스트 데이터 정리 (CASCADE로 관련 데이터도 삭제)
  if (global.testDataSource) {
    await global.testDataSource.query("TRUNCATE TABLE cart_items CASCADE");
    await global.testDataSource.query("TRUNCATE TABLE carts CASCADE");
  }
});

// 타임아웃 설정
jest.setTimeout(30000); // 30초
