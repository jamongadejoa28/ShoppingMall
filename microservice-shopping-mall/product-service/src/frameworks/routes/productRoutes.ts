// ========================================
// Product Routes - REST API 경로 설정
// src/frameworks/routes/productRoutes.ts
// ========================================

import { Router } from "express";
import { DIContainer } from "../../infrastructure/di/Container";
import { ProductController } from "../controllers/ProductController";
import { loggingMiddleware, requestIdMiddleware } from "../middlewares/common";
import {
  validateCreateProduct,
  validateGetProductDetail,
  validateGetProductList,
} from "../middlewares/validation";
import { TYPES } from "../../infrastructure/di/types";

/**
 * Product API Routes 설정
 *
 * 엔드포인트:
 * - POST   /api/v1/products        - 상품 생성
 * - GET    /api/v1/products/:id    - 상품 상세 조회
 * - GET    /api/v1/products        - 상품 목록 조회
 *
 * 미들웨어 체인:
 * 1. requestIdMiddleware - 요청 ID 생성
 * 2. loggingMiddleware - 요청/응답 로깅
 * 3. validation - 입력 검증
 * 4. controller - 비즈니스 로직 처리
 */
export function createProductRoutes(): Router {
  const router = Router();

  // DI Container에서 Controller 가져오기
  const container = DIContainer.getContainer();
  const productController = container.get<ProductController>(TYPES.ProductController);

  // 모든 요청에 공통 미들웨어 적용
  router.use(requestIdMiddleware);
  router.use(loggingMiddleware);

  /**
   * POST /api/v1/products - 상품 생성
   *
   * @description 새로운 상품과 초기 재고를 생성합니다
   * @body CreateProductRequest
   * @returns CreateProductResponse
   * @status 201 - 생성 성공
   * @status 400 - 잘못된 입력 데이터
   * @status 409 - SKU 중복
   * @status 404 - 카테고리를 찾을 수 없음
   */
  router.post(
    "/",
    validateCreateProduct,
    productController.createProduct.bind(productController)
  );

  /**
   * GET /api/v1/products/:id - 상품 상세 조회
   *
   * @description 특정 상품의 상세 정보를 조회합니다
   * @param id - 상품 UUID
   * @query includeInventory - 재고 정보 포함 여부 (기본값: true)
   * @returns GetProductDetailResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 상품 ID
   * @status 404 - 상품을 찾을 수 없음
   * @status 403 - 비활성화된 상품
   */
  router.get(
    "/:id",
    validateGetProductDetail,
    productController.getProductDetail.bind(productController)
  );

  /**
   * GET /api/v1/products - 상품 목록 조회
   *
   * @description 필터링, 검색, 정렬이 가능한 상품 목록을 조회합니다
   * @query page - 페이지 번호 (기본값: 1)
   * @query limit - 한 페이지당 항목 수 (기본값: 20, 최대: 100)
   * @query categoryId - 카테고리 ID 필터
   * @query brand - 브랜드 필터
   * @query minPrice - 최소 가격 필터
   * @query maxPrice - 최대 가격 필터
   * @query search - 검색어 (상품명, 설명, 태그 검색)
   * @query sortBy - 정렬 기준 (name|price|createdAt)
   * @query sortOrder - 정렬 순서 (asc|desc)
   * @query isActive - 활성화 상태 필터 (기본값: true)
   * @returns GetProductListResponse
   * @status 200 - 조회 성공
   * @status 400 - 잘못된 쿼리 파라미터
   */
  router.get(
    "/",
    validateGetProductList,
    productController.getProductList.bind(productController)
  );

  return router;
}
