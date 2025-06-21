// ========================================
// 장바구니 API 통합 테스트
// cart-service/src/__tests__/integration/api/cart.api.test.ts
// ========================================

import { Express } from "express";
import { Container } from "inversify";
import { ApiTestClient } from "../../utils/ApiTestClient";
import { TestDataBuilder } from "../../utils/TestDataBuilder";
import { DatabaseCleaner } from "../../utils/DatabaseCleaner";
import { RedisTestClient } from "../../utils/RedisTestClient";
import { DIContainer } from "../../../infrastructure/di/Container";
import { CartController } from "../../../frameworks/controllers/CartController";
import { MockProductServiceClient } from "../../../adapters/MockProductServiceClient";
import { TYPES } from "../../../infrastructure/di/types";
import { delay, measureExecutionTime } from "../../utils/TestHelpers";
import { createTestApp } from "../../utils/TestAppBuilder";

describe("Cart API Integration Tests", () => {
  let app: Express;
  let apiClient: ApiTestClient;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisTestClient;
  let container: Container;
  let mockProductService: MockProductServiceClient;

  // ========================================
  // 테스트 환경 설정
  // ========================================

  beforeAll(async () => {
    console.log("🔧 [Cart API Test] 테스트 환경 초기화 중...");

    try {
      // DI Container 초기화
      container = await DIContainer.create();

      // Mock Product Service 설정
      mockProductService = container.get<MockProductServiceClient>(
        TYPES.ProductServiceClient
      );

      // 🔧 수정: 테스트용 Express 앱 생성
      app = await createTestApp(container);

      // 테스트 클라이언트들 초기화
      apiClient = new ApiTestClient(app);
      dbCleaner = new DatabaseCleaner(global.testDataSource);
      redisCleaner = new RedisTestClient(global.testRedis);

      console.log("✅ [Cart API Test] 초기화 완료");
    } catch (error) {
      console.error("❌ [Cart API Test] 초기화 실패:", error);
      throw error;
    }
  });

  beforeEach(async () => {
    // 각 테스트 전 데이터 정리
    await dbCleaner.cleanAll();
    await redisCleaner.flushAll();

    // Mock 데이터 리셋
    mockProductService.resetMockData();
  });

  afterAll(async () => {
    await DIContainer.cleanup();
  });

  // ========================================
  // 🛒 기본 장바구니 CRUD 테스트
  // ========================================

  describe("기본 장바구니 CRUD", () => {
    test("장바구니 추가 → 조회 → 수정 → 삭제 전체 플로우", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      // Mock 상품 서비스 설정
      mockProductService.setMockProduct(productData.id, productData);

      // 1️⃣ 장바구니에 상품 추가
      const addRequest = TestDataBuilder.createAddToCartRequest({
        userId,
        productId: productData.id,
        quantity: 2,
      });

      const addResponse = await apiClient.addToCart(addRequest);
      expect(addResponse.status).toBe(201);
      apiClient.expectSuccessResponse(addResponse);

      const addedCart = addResponse.body.data.cart;
      expect(addedCart.items).toHaveLength(1);
      expect(addedCart.items[0].quantity).toBe(2);
      expect(addedCart.totalAmount).toBe(productData.price * 2);

      // 2️⃣ 장바구니 조회 (캐시에서 조회되는지 확인)
      const { result: getResponse1, executionTime: getTime1 } =
        await measureExecutionTime(() => apiClient.getCart({ userId }));

      expect(getResponse1.status).toBe(200);
      apiClient.expectSuccessResponse(getResponse1);
      expect(getResponse1.body.data.cart.items).toHaveLength(1);

      // 캐시에서 조회하는 두 번째 요청 (더 빨라야 함)
      const { result: getResponse2, executionTime: getTime2 } =
        await measureExecutionTime(() => apiClient.getCart({ userId }));

      expect(getResponse2.status).toBe(200);
      expect(getTime2).toBeLessThan(getTime1); // 캐시 효과 확인

      // 3️⃣ 장바구니 아이템 수량 수정
      const updateRequest = TestDataBuilder.createUpdateCartRequest({
        userId,
        productId: productData.id,
        quantity: 5,
      });

      const updateResponse = await apiClient.updateCartItem(updateRequest);
      expect(updateResponse.status).toBe(200);
      apiClient.expectSuccessResponse(updateResponse);

      const updatedCart = updateResponse.body.data.cart;
      expect(updatedCart.items[0].quantity).toBe(5);
      expect(updatedCart.totalAmount).toBe(productData.price * 5);

      // 4️⃣ 장바구니에서 상품 제거
      const removeResponse = await apiClient.removeFromCart({
        userId,
        productId: productData.id,
      });

      expect(removeResponse.status).toBe(200);
      apiClient.expectSuccessResponse(removeResponse);

      const finalCart = removeResponse.body.data.cart;
      expect(finalCart.items).toHaveLength(0);
      expect(finalCart.totalAmount).toBe(0);
    });

    test("빈 장바구니 조회", async () => {
      const userId = TestDataBuilder.generateUserId();

      const response = await apiClient.getCart({ userId });

      expect(response.status).toBe(200);
      apiClient.expectSuccessResponse(response);
      expect(response.body.data.cart).toBeNull();
    });
  });

  // ========================================
  // 🔍 헬스체크 테스트
  // ========================================

  describe("헬스체크", () => {
    test("서비스 헬스체크 성공", async () => {
      const response = await apiClient.healthCheck();

      expect(response.status).toBe(200);
      apiClient.expectSuccessResponse(response);
      expect(response.body.data.status).toBe("healthy");
    });

    test("서비스 정보 조회 성공", async () => {
      const response = await apiClient.getServiceInfo();

      expect(response.status).toBe(200);
      apiClient.expectSuccessResponse(response);
      expect(response.body.data.service).toBe("cart-service");
      expect(response.body.data.version).toContain("test");
    });
  });

  // ========================================
  // 👤 사용자/세션 기반 장바구니 테스트
  // ========================================

  describe("사용자/세션 기반 장바구니", () => {
    test("세션 장바구니에서 사용자 장바구니로 이전", async () => {
      const sessionId = TestDataBuilder.generateSessionId();
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      mockProductService.setMockProduct(productData.id, productData);

      // 1️⃣ 세션 기반 장바구니에 상품 추가
      const sessionAddResponse = await apiClient.addToCart({
        sessionId,
        productId: productData.id,
        quantity: 3,
      });

      expect(sessionAddResponse.status).toBe(201);
      expect(sessionAddResponse.body.data.cart.items).toHaveLength(1);

      // 2️⃣ 장바구니 이전 (세션 → 사용자)
      const transferResponse = await apiClient.transferCart({
        userId,
        sessionId,
      });

      expect(transferResponse.status).toBe(200);
      apiClient.expectSuccessResponse(transferResponse);

      const transferredCart = transferResponse.body.data.cart;
      expect(transferredCart.userId).toBe(userId);
      expect(transferredCart.sessionId).toBeUndefined();
      expect(transferredCart.items).toHaveLength(1);

      // 3️⃣ 이전 후 사용자 ID로 조회 가능한지 확인
      const userGetResponse = await apiClient.getCart({ userId });
      expect(userGetResponse.status).toBe(200);
      expect(userGetResponse.body.data.cart.items).toHaveLength(1);

      // 4️⃣ 세션 ID로는 더 이상 조회되지 않음
      const sessionGetResponse = await apiClient.getCart({ sessionId });
      expect(sessionGetResponse.status).toBe(200);
      expect(sessionGetResponse.body.data.cart).toBeNull();
    });

    test("기존 사용자 장바구니와 세션 장바구니 병합", async () => {
      const userId = TestDataBuilder.generateUserId();
      const sessionId = TestDataBuilder.generateSessionId();
      const product1 = TestDataBuilder.createProductData();
      const product2 = TestDataBuilder.createLowStockProduct();

      mockProductService.setMockProduct(product1.id, product1);
      mockProductService.setMockProduct(product2.id, product2);

      // 1️⃣ 사용자 장바구니에 상품1 추가
      await apiClient.addToCart({
        userId,
        productId: product1.id,
        quantity: 2,
      });

      // 2️⃣ 세션 장바구니에 상품1(중복) + 상품2 추가
      await apiClient.addToCart({
        sessionId,
        productId: product1.id, // 중복 상품
        quantity: 1,
      });

      await apiClient.addToCart({
        sessionId,
        productId: product2.id, // 새 상품
        quantity: 1,
      });

      // 3️⃣ 장바구니 이전 (병합 발생)
      const transferResponse = await apiClient.transferCart({
        userId,
        sessionId,
      });

      expect(transferResponse.status).toBe(200);

      const mergedCart = transferResponse.body.data.cart;
      expect(mergedCart.items).toHaveLength(2); // 상품 2개

      // 중복 상품의 수량이 합쳐졌는지 확인
      const product1Item = mergedCart.items.find(
        (item: any) => item.productId === product1.id
      );
      expect(product1Item.quantity).toBe(3); // 2 + 1

      const product2Item = mergedCart.items.find(
        (item: any) => item.productId === product2.id
      );
      expect(product2Item.quantity).toBe(1);
    });
  });

  // ========================================
  // ❌ 에러 시나리오 테스트
  // ========================================

  describe("에러 시나리오", () => {
    test("존재하지 않는 상품 추가 시도", async () => {
      const userId = TestDataBuilder.generateUserId();
      const nonExistentProductId = "non-existent-product";

      const response = await apiClient.addToCart({
        userId,
        productId: nonExistentProductId,
        quantity: 1,
      });

      expect(response.status).toBe(404);
      apiClient.expectErrorResponse(response, 404, "상품을 찾을 수 없습니다");
    });

    test("재고 부족 상품 추가 시도", async () => {
      const userId = TestDataBuilder.generateUserId();
      const outOfStockProduct = TestDataBuilder.createOutOfStockProduct();

      mockProductService.setMockProduct(
        outOfStockProduct.id,
        outOfStockProduct
      );

      const response = await apiClient.addToCart({
        userId,
        productId: outOfStockProduct.id,
        quantity: 1,
      });

      expect(response.status).toBe(400);
      apiClient.expectErrorResponse(response, 400, "재고가 부족합니다");
    });

    test("잘못된 수량으로 상품 추가 시도", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      const response = await apiClient.addToCart({
        userId,
        productId: productData.id,
        quantity: 0, // 잘못된 수량
      });

      expect(response.status).toBe(400);
      apiClient.expectErrorResponse(
        response,
        400,
        "수량은 1 이상이어야 합니다"
      );
    });

    test("사용자 ID와 세션 ID 모두 없는 요청", async () => {
      const productData = TestDataBuilder.createProductData();

      const response = await apiClient.addToCart({
        // userId도 sessionId도 없음
        productId: productData.id,
        quantity: 1,
      });

      expect(response.status).toBe(400);
      apiClient.expectErrorResponse(
        response,
        400,
        "사용자 ID 또는 세션 ID가 필요합니다"
      );
    });

    test("존재하지 않는 장바구니에서 상품 제거 시도", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productId = TestDataBuilder.generateProductId();

      const response = await apiClient.removeFromCart({
        userId,
        productId,
      });

      expect(response.status).toBe(404);
      apiClient.expectErrorResponse(
        response,
        404,
        "장바구니를 찾을 수 없습니다"
      );
    });
  });

  // ========================================
  // 🗑️ 장바구니 비우기 테스트
  // ========================================

  describe("장바구니 비우기", () => {
    test("장바구니 전체 비우기", async () => {
      const userId = TestDataBuilder.generateUserId();
      const product1 = TestDataBuilder.createProductData();
      const product2 = TestDataBuilder.createLowStockProduct();

      mockProductService.setMockProduct(product1.id, product1);
      mockProductService.setMockProduct(product2.id, product2);

      // 1️⃣ 여러 상품 추가
      await apiClient.addToCart({
        userId,
        productId: product1.id,
        quantity: 2,
      });

      await apiClient.addToCart({
        userId,
        productId: product2.id,
        quantity: 1,
      });

      // 2️⃣ 장바구니 조회로 상품 확인
      const beforeClear = await apiClient.getCart({ userId });
      expect(beforeClear.body.data.cart.items).toHaveLength(2);

      // 3️⃣ 장바구니 비우기
      const clearResponse = await apiClient.clearCart({ userId });
      expect(clearResponse.status).toBe(200);
      apiClient.expectSuccessResponse(clearResponse);

      // 4️⃣ 비워진 장바구니 확인
      const afterClear = await apiClient.getCart({ userId });
      expect(afterClear.body.data.cart.items).toHaveLength(0);
      expect(afterClear.body.data.cart.totalAmount).toBe(0);
    });
  });

  // ========================================
  // ⚡ 캐시 동작 테스트
  // ========================================

  describe("캐시 동작 검증", () => {
    test("장바구니 추가 후 캐시 확인", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      mockProductService.setMockProduct(productData.id, productData);

      // 장바구니에 상품 추가
      await apiClient.addToCart({
        userId,
        productId: productData.id,
        quantity: 1,
      });

      // 캐시 상태 확인
      const cacheStats = await redisCleaner.getCacheStats();
      expect(cacheStats.cartKeys).toBeGreaterThan(0);
      expect(cacheStats.userKeys).toBeGreaterThan(0);

      // 사용자 매핑 캐시 존재 확인
      const userCacheExists = await redisCleaner.exists(
        `cart-service:user:${userId}`
      );
      expect(userCacheExists).toBe(true);
    });

    test("캐시 TTL 확인", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      mockProductService.setMockProduct(productData.id, productData);

      await apiClient.addToCart({
        userId,
        productId: productData.id,
        quantity: 1,
      });

      // 사용자 매핑 캐시의 TTL 확인 (1시간 = 3600초)
      const userCacheTTL = await redisCleaner.getTTL(
        `cart-service:user:${userId}`
      );
      expect(userCacheTTL).toBeGreaterThan(3500); // 약간의 여유분 고려
      expect(userCacheTTL).toBeLessThanOrEqual(3600);
    });
  });

  // ========================================
  // 🏃‍♂️ 동시성 테스트
  // ========================================

  describe("동시성 처리", () => {
    test("동일 장바구니에 여러 상품 동시 추가", async () => {
      const userId = TestDataBuilder.generateUserId();
      const products = [
        TestDataBuilder.createProductData(),
        TestDataBuilder.createLowStockProduct(),
        TestDataBuilder.createProductData({
          id: "product-3",
          name: "상품3",
          price: 50000,
        }),
      ];

      // Mock 상품들 설정
      products.forEach((product) => {
        mockProductService.setMockProduct(product.id, product);
      });

      // 동시에 여러 상품 추가
      const addPromises = products.map((product, index) =>
        apiClient.addToCart({
          userId,
          productId: product.id,
          quantity: index + 1,
        })
      );

      const responses = await Promise.all(addPromises);

      // 모든 요청이 성공했는지 확인
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // 최종 장바구니 상태 확인
      const finalCart = await apiClient.getCart({ userId });
      expect(finalCart.body.data.cart.items).toHaveLength(3);
    });

    test("동일 상품 동시 수량 변경", async () => {
      const userId = TestDataBuilder.generateUserId();
      const productData = TestDataBuilder.createProductData();

      mockProductService.setMockProduct(productData.id, productData);

      // 먼저 상품 추가
      await apiClient.addToCart({
        userId,
        productId: productData.id,
        quantity: 1,
      });

      // 동시에 여러 번 수량 변경 시도
      const updatePromises = [2, 3, 4, 5].map((quantity) =>
        apiClient.updateCartItem({
          userId,
          productId: productData.id,
          quantity,
        })
      );

      const responses = await Promise.all(updatePromises);

      // 최소 하나는 성공해야 함
      const successfulResponses = responses.filter((r) => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // 최종 상태 확인
      const finalCart = await apiClient.getCart({ userId });
      expect(finalCart.body.data.cart.items).toHaveLength(1);
      expect(finalCart.body.data.cart.items[0].quantity).toBeGreaterThan(1);
    });
  });
});
