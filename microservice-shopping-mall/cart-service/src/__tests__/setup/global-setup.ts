// cart-service/src/__tests__/setup/global-setup.ts
// ========================================

import { execSync } from "child_process"; // 🔧 수정: import 추가
import { DataSource, DataSourceOptions } from "typeorm"; // 🔧 수정: DataSourceOptions 추가
// import { Client } from "pg";

export default async (): Promise<void> => {
  console.log("🚀 [Global Setup] 통합 테스트 환경 초기화 시작...");

  try {
    // 1. Docker Compose로 테스트 환경 시작
    console.log("📦 [Docker] 테스트 컨테이너 시작 중...");
    execSync(
      "docker-compose -f docker-compose.test.yml up -d postgres-test redis-test",
      {
        stdio: "inherit",
        timeout: 60000, // 60초 타임아웃
      }
    );

    // 2. DB 연결 대기 (헬스체크)
    console.log("⏳ [Database] PostgreSQL 준비 대기 중...");
    // await waitForService("localhost", 5433, 30000);
    // await waitForPostgresReady();
    await waitForPostgresHealthy();

    // 3. Redis 연결 대기
    console.log("⏳ [Cache] Redis 준비 대기 중...");
    // await waitForService("localhost", 6380, 30000);
    // await waitForPostgresReady();
    await waitForPostgresHealthy();

    // 4. 데이터베이스 스키마 초기화
    console.log("🗄️ [Database] 스키마 초기화 중...");
    await initializeTestDatabase();

    console.log("✅ [Global Setup] 테스트 환경 준비 완료!");
  } catch (error) {
    console.error("❌ [Global Setup] 초기화 실패:", error);
    throw error;
  }
};

/**
 * 서비스 준비 상태 대기
 */
// async function waitForService(
//   host: string,
//   port: number,
//   timeout: number
// ): Promise<void> {
//   const net = require("net");
//   const startTime = Date.now();

//   return new Promise((resolve, reject) => {
//     const checkConnection = () => {
//       const socket = new net.Socket();

//       socket.setTimeout(1000);
//       socket.on("connect", () => {
//         socket.destroy();
//         resolve();
//       });

//       socket.on("timeout", () => {
//         socket.destroy();
//         checkAgain();
//       });

//       socket.on("error", () => {
//         checkAgain();
//       });

//       socket.connect(port, host);
//     };

//     const checkAgain = () => {
//       if (Date.now() - startTime > timeout) {
//         reject(
//           new Error(`Service ${host}:${port} not ready within ${timeout}ms`)
//         );
//       } else {
//         setTimeout(checkConnection, 1000);
//       }
//     };

//     checkConnection();
//   });
// }

// async function waitForPostgresReady(retries = 10, delay = 1000): Promise<void> {
//   const client = new Client({
//     host: "localhost",
//     port: 5433,
//     user: "test_user",
//     password: "test_password",
//     database: "cart_service_test",
//   });

//   for (let i = 1; i <= retries; i++) {
//     try {
//       await client.connect();
//       await client.end();
//       console.log(`✅ [Database] PostgreSQL 응답 확인 완료 (시도 ${i})`);
//       return;
//     } catch (e) {
//       console.log(`⏳ [Database] PostgreSQL 연결 시도 중... (시도 ${i})`);
//       await new Promise((res) => setTimeout(res, delay));
//     }
//   }

//   throw new Error("❌ [Database] PostgreSQL이 완전히 준비되지 않았습니다.");
// }

async function waitForPostgresHealthy(
  retries = 10,
  delay = 2000
): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const result = execSync(
        `docker inspect --format="{{.State.Health.Status}}" cart-service-postgres-test`
      )
        .toString()
        .trim();

      if (result === "healthy") {
        console.log(`✅ [Database] PostgreSQL 헬시 상태 확인됨 (시도 ${i})`);
        return;
      }

      console.log(
        `⏳ [Database] PostgreSQL 상태: ${result.trim()} (시도 ${i})`
      );
    } catch (err) {
      console.log(`❗ [Database] docker inspect 실패 (시도 ${i})`);
    }

    await new Promise((res) => setTimeout(res, delay));
  }

  throw new Error("❌ [Database] PostgreSQL 헬시 상태가 아님");
}

/**
 * 테스트 데이터베이스 스키마 초기화
 */
async function initializeTestDatabase(): Promise<void> {
  try {
    // 🔧 수정: PostgreSQL 타입 명시적 지정
    const testDataSourceOptions: DataSourceOptions = {
      type: "postgres", // 🔧 수정: 타입 명시
      host: "localhost",
      port: 5433,
      database: "cart_service_test",
      username: "test_user",
      password: "test_password",
      synchronize: true, // 테스트에서는 자동 스키마 동기화
      dropSchema: true, // 매번 깨끗한 상태로 시작
      entities: [
        // 🔧 수정: 엔티티 경로 추가
        "src/adapters/entities/*.ts",
      ],
      logging: false, // 테스트 중 SQL 로그 비활성화
    };

    const testDataSource = new DataSource(testDataSourceOptions);

    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }

    console.log("✅ [Database] 테스트 스키마 초기화 완료");

    // 연결 종료 (각 테스트에서 새로 연결)
    await testDataSource.destroy();
  } catch (error) {
    console.error("❌ [Database] 스키마 초기화 실패:", error);
    throw error;
  }
}
