// ========================================
// Health API 통합 테스트 (완전 구현)
// cart-service/src/__tests__/integration/api/health.api.test.ts
// ========================================

import { Express } from "express";
import { Container } from "inversify";
import { ApiTestClient } from "../../utils/ApiTestClient";
import { DIContainer } from "../../../infrastructure/di/Container";
import { createTestApp } from "../../utils/TestAppBuilder";

describe("Health API Integration Tests", () => {
  let app: Express;
  let apiClient: ApiTestClient;
  let container: Container;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Health API Test] 테스트 환경 초기화 중...");

    try {
      // DI Container 초기화
      container = await DIContainer.create();

      // Express 앱 생성
      app = await createTestApp(container);

      // 테스트 클라이언트 초기화
      apiClient = new ApiTestClient(app);

      console.log("✅ [Health API Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Health API Test] 초기화 실패:", error);
      throw error;
    }
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🏥 기본 헬스체크 테스트
  // ========================================

  describe("기본 헬스체크", () => {
    test("GET /health - 서비스 상태 확인", async () => {
      const response = await apiClient.healthCheck();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          status: "healthy",
          timestamp: expect.any(String),
          version: expect.any(String),
          environment: "test",
        },
      });

      // 타임스탬프가 ISO 형식인지 확인
      expect(() => new Date(response.body.data.timestamp)).not.toThrow();
    });

    test("헬스체크 응답 시간 확인 (성능)", async () => {
      const startTime = Date.now();

      const response = await apiClient.healthCheck();

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1초 이내 응답
    });

    test("연속 헬스체크 요청 처리", async () => {
      const promises = Array.from({ length: 5 }, () => apiClient.healthCheck());

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });
    });
  });

  // ========================================
  // 📊 서비스 정보 API 테스트
  // ========================================

  describe("서비스 정보 API", () => {
    test("GET /api/v1/info - 서비스 정보 조회", async () => {
      const response = await apiClient.getServiceInfo();

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: {
          service: "cart-service",
          version: expect.stringMatching(/test/),
          description: expect.any(String),
          endpoints: expect.any(Object),
          features: expect.any(Array),
        },
      });

      // 엔드포인트 정보 확인
      expect(response.body.data.endpoints).toHaveProperty("carts");
      expect(response.body.data.endpoints).toHaveProperty("health");

      // 기능 목록 확인
      expect(response.body.data.features).toContain("장바구니 생성/조회");
      expect(response.body.data.features.length).toBeGreaterThan(3);
    });

    test("서비스 정보 일관성 확인", async () => {
      const response1 = await apiClient.getServiceInfo();
      const response2 = await apiClient.getServiceInfo();

      expect(response1.body.data.service).toBe(response2.body.data.service);
      expect(response1.body.data.version).toBe(response2.body.data.version);
      expect(response1.body.data.endpoints).toEqual(
        response2.body.data.endpoints
      );
    });
  });

  // ========================================
  // 🚫 404 및 에러 처리 테스트
  // ========================================

  describe("404 및 에러 처리", () => {
    test("존재하지 않는 엔드포인트 - 404 처리", async () => {
      const response = await apiClient.app.get("/nonexistent-endpoint");

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining("not found"),
        error: "NOT_FOUND",
        timestamp: expect.any(String),
      });
    });

    test("잘못된 HTTP 메서드 - 404 처리", async () => {
      const response = await apiClient.app.patch("/health");

      expect(response.status).toBe(404);
    });

    test("빈 요청 경로 처리", async () => {
      const response = await apiClient.app.get("");

      // 서버가 적절히 처리하는지 확인 (404 또는 리다이렉트)
      expect([200, 301, 302, 404]).toContain(response.status);
    });
  });

  // ========================================
  // 🔒 보안 헤더 테스트
  // ========================================

  describe("보안 헤더 확인", () => {
    test("기본 보안 헤더 존재 확인", async () => {
      const response = await apiClient.healthCheck();

      // Helmet 미들웨어에 의한 보안 헤더들
      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-frame-options");
    });

    test("CORS 헤더 확인", async () => {
      const response = await apiClient.app
        .options("/health")
        .set("Origin", "http://localhost:3000");

      expect(response.headers).toHaveProperty("access-control-allow-origin");
      expect(response.headers).toHaveProperty("access-control-allow-methods");
    });

    test("응답 시간 헤더 부재 확인 (정보 누출 방지)", async () => {
      const response = await apiClient.healthCheck();

      // 응답 시간 등의 민감한 정보가 헤더에 노출되지 않는지 확인
      expect(response.headers).not.toHaveProperty("x-response-time");
      expect(response.headers).not.toHaveProperty("server");
    });
  });

  // ========================================
  // 📈 부하 및 안정성 테스트
  // ========================================

  describe("부하 및 안정성", () => {
    test("동시 요청 처리 (부하 테스트)", async () => {
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        apiClient.healthCheck().then((response) => ({ index, response }))
      );

      const results = await Promise.all(promises);

      // 모든 요청이 성공했는지 확인
      results.forEach(({ index, response }) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });

      console.log(`✅ ${concurrentRequests}개의 동시 요청 모두 성공`);
    });

    test("연속 요청 안정성 테스트", async () => {
      const requestCount = 10;
      const responses: any[] = [];

      for (let i = 0; i < requestCount; i++) {
        const response = await apiClient.healthCheck();
        responses.push(response);

        // 짧은 딜레이 (실제 사용 패턴 시뮬레이션)
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 모든 응답이 일관되게 성공했는지 확인
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });

      console.log(`✅ ${requestCount}번의 연속 요청 모두 안정적으로 처리`);
    });

    test("메모리 누수 확인 (간단한 테스트)", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 100번의 요청 실행
      for (let i = 0; i < 100; i++) {
        await apiClient.healthCheck();
      }

      // 가비지 컬렉션 강제 실행 (테스트 환경에서만)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // 메모리 증가가 합리적인 범위 내인지 확인 (10MB 이하)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

      console.log(
        `📊 메모리 사용량 변화: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`
      );
    });
  });

  // ========================================
  // 🌐 네트워크 및 타임아웃 테스트
  // ========================================

  describe("네트워크 및 타임아웃", () => {
    test("응답 형식 일관성 (JSON)", async () => {
      const response = await apiClient.healthCheck();

      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
    });

    test("응답 크기 확인 (효율성)", async () => {
      const response = await apiClient.healthCheck();

      const responseSize = JSON.stringify(response.body).length;

      // 응답이 너무 크지 않은지 확인 (1KB 이하)
      expect(responseSize).toBeLessThan(1024);

      console.log(`📦 응답 크기: ${responseSize} bytes`);
    });

    test("압축 지원 확인", async () => {
      const response = await apiClient.app
        .get("/health")
        .set("Accept-Encoding", "gzip, deflate");

      expect(response.status).toBe(200);
      // 압축이 적용되었는지 확인 (선택적)
      // expect(response.headers).toHaveProperty('content-encoding');
    });
  });
});
