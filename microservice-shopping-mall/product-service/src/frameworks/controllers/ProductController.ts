// ========================================
// ProductController - REST API Controller
// src/frameworks/controllers/ProductController.ts
// ========================================

import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { TYPES } from "../../infrastructure/di/types";
import { CreateProductUseCase } from "../../usecases/CreateProductUseCase";
import { GetProductDetailUseCase } from "../../usecases/GetProductDetailUseCase";
import {
  GetProductListUseCase,
  GetProductListRequest,
} from "../../usecases/GetProductListUseCase"; // [수정] GetProductListRequest도 가져옵니다.
import { CreateProductRequest } from "../../usecases/types";
import { DomainError } from "../../shared/errors/DomainError";
import { validationResult } from "express-validator";

// 컨트롤러에서 사용할 표준 API 응답 타입을 정의합니다.
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: any[];
  timestamp: string;
  requestId: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 상품 고유 ID
 *           example: "660e8400-e29b-41d4-a716-446655440001"
 *         name:
 *           type: string
 *           description: 상품명
 *           example: "MacBook Pro 16인치 M3 Pro"
 *         description:
 *           type: string
 *           description: 상품 설명
 *           example: "Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북"
 *         price:
 *           type: string
 *           description: 정가
 *           example: "3299000.00"
 *         discountPrice:
 *           type: string
 *           nullable: true
 *           description: 할인가
 *           example: "2999000.00"
 *         sku:
 *           type: string
 *           description: 상품 코드
 *           example: "MBP16-M3PRO-18-512"
 *         brand:
 *           type: string
 *           description: 브랜드
 *           example: "Apple"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 상품 태그
 *           example: ["노트북", "맥북", "M3", "고성능"]
 *         slug:
 *           type: string
 *           description: SEO 친화적 URL
 *           example: "macbook-pro-16인치-m3-pro"
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *               example: "노트북"
 *             slug:
 *               type: string
 *               example: "노트북"
 *         inventory:
 *           type: object
 *           properties:
 *             availableQuantity:
 *               type: integer
 *               description: 사용 가능한 재고 수량
 *               example: 45
 *             status:
 *               type: string
 *               enum: [sufficient, low_stock, out_of_stock]
 *               description: 재고 상태
 *               example: "sufficient"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-13T02:12:10.266Z"
 *
 *     CreateProductRequest:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - categoryId
 *         - brand
 *         - sku
 *         - initialStock
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: 상품명
 *           example: "iPhone 15 Pro Max"
 *         description:
 *           type: string
 *           description: 상품 설명
 *           example: "A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰"
 *         price:
 *           type: number
 *           minimum: 0
 *           description: 상품 가격
 *           example: 1550000
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: 카테고리 ID
 *           example: "550e8400-e29b-41d4-a716-446655440122"
 *         brand:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: 브랜드명
 *           example: "Apple"
 *         sku:
 *           type: string
 *           pattern: "^[A-Z0-9-_]+$"
 *           description: 상품 코드 (대문자, 숫자, 하이픈, 언더스코어만 허용)
 *           example: "IPH-15-PM-256-NT"
 *         weight:
 *           type: number
 *           minimum: 0
 *           description: 무게(kg)
 *           example: 0.221
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *               description: 가로(cm)
 *               example: 7.69
 *             height:
 *               type: number
 *               description: 세로(cm)
 *               example: 15.95
 *             depth:
 *               type: number
 *               description: 깊이(cm)
 *               example: 0.83
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 상품 태그
 *           example: ["스마트폰", "아이폰", "A17Pro", "티타늄"]
 *         discountPrice:
 *           type: number
 *           minimum: 0
 *           description: 할인가
 *           example: 1450000
 *         initialStock:
 *           type: object
 *           required:
 *             - quantity
 *             - lowStockThreshold
 *             - location
 *           properties:
 *             quantity:
 *               type: integer
 *               minimum: 0
 *               description: 초기 재고 수량
 *               example: 100
 *             lowStockThreshold:
 *               type: integer
 *               minimum: 0
 *               description: 재고 부족 기준값
 *               example: 20
 *             location:
 *               type: string
 *               description: 재고 위치
 *               example: "WAREHOUSE-A"
 *
 *     ProductListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "상품 목록을 성공적으로 조회했습니다"
 *         data:
 *           type: object
 *           properties:
 *             products:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalItems:
 *                   type: integer
 *                   example: 9
 *                 hasNextPage:
 *                   type: boolean
 *                   example: false
 *                 hasPreviousPage:
 *                   type: boolean
 *                   example: false
 *             filters:
 *               type: object
 *               description: 적용된 필터 정보
 *         timestamp:
 *           type: string
 *           format: date-time
 *         requestId:
 *           type: string
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "입력 데이터가 올바르지 않습니다"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "name"
 *               message:
 *                 type: string
 *                 example: "상품명은 필수 항목입니다"
 *         data:
 *           type: object
 *           nullable: true
 *           example: null
 *         timestamp:
 *           type: string
 *           format: date-time
 *         requestId:
 *           type: string
 */

/**
 * ProductController - 상품 관련 REST API Controller
 */
@injectable()
export class ProductController {
  constructor(
    @inject(TYPES.CreateProductUseCase)
    private readonly createProductUseCase: CreateProductUseCase,

    @inject(TYPES.GetProductDetailUseCase)
    private readonly getProductDetailUseCase: GetProductDetailUseCase,

    @inject(TYPES.GetProductListUseCase)
    private readonly getProductListUseCase: GetProductListUseCase
  ) {}

  /**
   * @swagger
   * /api/v1/products:
   *   post:
   *     tags: [Products]
   *     summary: 새로운 상품 생성
   *     description: |
   *       새로운 상품과 초기 재고를 생성합니다.
   *
   *       **주요 기능:**
   *       - 상품 정보 등록 (이름, 설명, 가격, 브랜드 등)
   *       - 카테고리 연결
   *       - 초기 재고 설정
   *       - 자동 슬러그 생성 (SEO 최적화)
   *       - SKU 중복 검사
   *
   *       **비즈니스 규칙:**
   *       - SKU는 시스템 내에서 고유해야 함
   *       - 카테고리는 기존에 존재해야 함
   *       - 가격은 0 이상이어야 함
   *       - 재고 수량은 0 이상이어야 함
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProductRequest'
   *           examples:
   *             iPhone:
   *               summary: iPhone 15 Pro Max 예시
   *               value:
   *                 name: "iPhone 15 Pro Max"
   *                 description: "A17 Pro 칩과 티타늄 소재로 제작된 프리미엄 스마트폰"
   *                 price: 1550000
   *                 categoryId: "550e8400-e29b-41d4-a716-446655440122"
   *                 brand: "Apple"
   *                 sku: "IPH-15-PM-256-NT"
   *                 weight: 0.221
   *                 dimensions:
   *                   width: 7.69
   *                   height: 15.95
   *                   depth: 0.83
   *                 tags: ["스마트폰", "아이폰", "A17Pro", "티타늄"]
   *                 discountPrice: 1450000
   *                 initialStock:
   *                   quantity: 100
   *                   lowStockThreshold: 20
   *                   location: "WAREHOUSE-A"
   *             MacBook:
   *               summary: MacBook Pro 예시
   *               value:
   *                 name: "MacBook Pro 16인치 M3 Pro"
   *                 description: "Apple M3 Pro 칩, 18GB 통합 메모리, 512GB SSD"
   *                 price: 3299000
   *                 categoryId: "550e8400-e29b-41d4-a716-446655440111"
   *                 brand: "Apple"
   *                 sku: "MBP16-M3PRO-18-512"
   *                 weight: 2.1
   *                 dimensions:
   *                   width: 35.57
   *                   height: 24.81
   *                   depth: 1.68
   *                 tags: ["노트북", "맥북", "M3", "고성능"]
   *                 initialStock:
   *                   quantity: 50
   *                   lowStockThreshold: 10
   *                   location: "WAREHOUSE-A"
   *     responses:
   *       201:
   *         description: 상품이 성공적으로 생성되었습니다
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "상품이 성공적으로 생성되었습니다"
   *                 data:
   *                   type: object
   *                   properties:
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   *                     inventory:
   *                       type: object
   *                       description: 생성된 재고 정보
   *       400:
   *         description: 잘못된 입력 데이터
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             examples:
   *               validation_error:
   *                 summary: 유효성 검사 실패
   *                 value:
   *                   success: false
   *                   message: "입력 데이터가 올바르지 않습니다"
   *                   errors:
   *                     - field: "name"
   *                       message: "상품명은 필수 항목입니다"
   *                     - field: "price"
   *                       message: "가격은 0 이상이어야 합니다"
   *                   data: null
   *       404:
   *         description: 카테고리를 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: SKU 중복
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "이미 존재하는 SKU입니다"
   *               data: null
   */

  /**
   * POST /api/v1/products - 상품 생성
   */
  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "입력 데이터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const createRequest: CreateProductRequest = {
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        categoryId: req.body.categoryId,
        brand: req.body.brand,
        sku: req.body.sku,
        weight: req.body.weight,
        dimensions: req.body.dimensions,
        tags: req.body.tags || [],
        initialStock: {
          quantity: req.body.initialStock.quantity,
          location: req.body.initialStock.location || "MAIN_WAREHOUSE",
          lowStockThreshold: req.body.initialStock.lowStockThreshold || 10,
        },
      };

      const result = await this.createProductUseCase.execute(createRequest);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품이 성공적으로 생성되었습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(201).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products/{id}:
   *   get:
   *     tags: [Products]
   *     summary: 상품 상세 정보 조회
   *     description: |
   *       특정 상품의 상세 정보를 조회합니다.
   *
   *       **포함 정보:**
   *       - 상품 기본 정보 (이름, 설명, 가격 등)
   *       - 카테고리 정보
   *       - 현재 재고 상태
   *       - 할인 정보 (있는 경우)
   *       - 상품 태그
   *       - 물리적 정보 (무게, 크기)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 상품 고유 ID
   *         example: "660e8400-e29b-41d4-a716-446655440001"
   *       - in: query
   *         name: includeInventory
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 재고 정보 포함 여부
   *     responses:
   *       200:
   *         description: 상품 상세 정보 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "상품 상세 정보를 성공적으로 조회했습니다"
   *                 data:
   *                   type: object
   *                   properties:
   *                     product:
   *                       $ref: '#/components/schemas/Product'
   *             example:
   *               success: true
   *               message: "상품 상세 정보를 성공적으로 조회했습니다"
   *               data:
   *                 product:
   *                   id: "660e8400-e29b-41d4-a716-446655440001"
   *                   name: "MacBook Pro 16인치 M3 Pro"
   *                   description: "Apple의 최신 M3 Pro 칩을 탑재한 고성능 노트북"
   *                   price: "3299000.00"
   *                   discountPrice: "2999000.00"
   *                   sku: "MBP16-M3PRO-18-512"
   *                   brand: "Apple"
   *                   tags: ["노트북", "맥북", "M3", "고성능"]
   *                   category:
   *                     id: "550e8400-e29b-41d4-a716-446655440111"
   *                     name: "노트북"
   *                     slug: "노트북"
   *                   inventory:
   *                     availableQuantity: 45
   *                     status: "sufficient"
   *       400:
   *         description: 잘못된 상품 ID 형식
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: 상품을 찾을 수 없음
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "상품을 찾을 수 없습니다"
   *               data: null
   */

  /**
   * GET /api/v1/products/:id - 상품 상세 조회
   */
  async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "상품 ID가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      // [수정] GetProductDetailUseCase.ts의 execute는 productId(string)를 직접 인자로 받습니다.
      const result = await this.getProductDetailUseCase.execute(req.params.id!);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 상세 정보를 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * @swagger
   * /api/v1/products:
   *   get:
   *     tags: [Products]
   *     summary: 상품 목록 조회
   *     description: |
   *       필터링, 검색, 정렬이 가능한 상품 목록을 조회합니다.
   *
   *       **주요 기능:**
   *       - 페이지네이션 지원
   *       - 브랜드별 필터링
   *       - 가격 범위 필터링
   *       - 카테고리별 필터링
   *       - 키워드 검색 (상품명, 설명, 태그)
   *       - 다양한 정렬 옵션
   *
   *       **검색 옵션:**
   *       - 상품명 검색
   *       - 브랜드명 검색
   *       - 태그 검색
   *       - 상품 설명 검색
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 페이지 번호
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: 한 페이지당 항목 수
   *         example: 10
   *       - in: query
   *         name: categoryId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: 카테고리 ID로 필터링
   *         example: "550e8400-e29b-41d4-a716-446655440111"
   *       - in: query
   *         name: brand
   *         schema:
   *           type: string
   *         description: 브랜드명으로 필터링
   *         example: "Apple"
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: 최소 가격
   *         example: 1000000
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *           minimum: 0
   *         description: 최대 가격
   *         example: 5000000
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 검색어 (상품명, 설명, 태그 검색)
   *         example: "MacBook"
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [name, price, createdAt]
   *           default: createdAt
   *         description: 정렬 기준
   *         example: "price"
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: 정렬 순서
   *         example: "desc"
   *       - in: query
   *         name: isActive
   *         schema:
   *           type: boolean
   *           default: true
   *         description: 활성화된 상품만 조회
   *     responses:
   *       200:
   *         description: 상품 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ProductListResponse'
   *             examples:
   *               default:
   *                 summary: 기본 상품 목록
   *                 value:
   *                   success: true
   *                   message: "상품 목록을 성공적으로 조회했습니다"
   *                   data:
   *                     products:
   *                       - id: "660e8400-e29b-41d4-a716-446655440001"
   *                         name: "MacBook Pro 16인치 M3 Pro"
   *                         price: "3299000.00"
   *                         discountPrice: "2999000.00"
   *                         brand: "Apple"
   *                         category:
   *                           name: "노트북"
   *                         inventory:
   *                           availableQuantity: 45
   *                           status: "sufficient"
   *                       - id: "660e8400-e29b-41d4-a716-446655440003"
   *                         name: "iPhone 15 Pro Max"
   *                         price: "1550000.00"
   *                         brand: "Apple"
   *                         category:
   *                           name: "아이폰"
   *                         inventory:
   *                           availableQuantity: 95
   *                           status: "sufficient"
   *                     pagination:
   *                       currentPage: 1
   *                       totalPages: 1
   *                       totalItems: 9
   *                       hasNextPage: false
   *                       hasPreviousPage: false
   *                     filters: {}
   *               filtered:
   *                 summary: Apple 브랜드 필터링 결과
   *                 value:
   *                   success: true
   *                   message: "상품 목록을 성공적으로 조회했습니다"
   *                   data:
   *                     products:
   *                       - id: "660e8400-e29b-41d4-a716-446655440001"
   *                         name: "MacBook Pro 16인치 M3 Pro"
   *                         brand: "Apple"
   *                       - id: "660e8400-e29b-41d4-a716-446655440003"
   *                         name: "iPhone 15 Pro Max"
   *                         brand: "Apple"
   *                     pagination:
   *                       currentPage: 1
   *                       totalPages: 1
   *                       totalItems: 2
   *                       hasNextPage: false
   *                       hasPreviousPage: false
   *                     filters:
   *                       appliedBrand: "Apple"
   *       400:
   *         description: 잘못된 쿼리 파라미터
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *             example:
   *               success: false
   *               message: "쿼리 파라미터가 올바르지 않습니다"
   *               errors:
   *                 - field: "page"
   *                   message: "페이지 번호는 1 이상이어야 합니다"
   *                 - field: "limit"
   *                   message: "한 페이지당 항목 수는 1-100 사이여야 합니다"
   */

  /**
   * GET /api/v1/products - 상품 목록 조회
   */
  async getProductList(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse<null> = {
          success: false,
          message: "쿼리 파라미터가 올바르지 않습니다",
          errors: errors.array().map((err) => ({
            field: err.type === "field" ? err.path : "unknown",
            message: err.msg,
          })),
          data: null,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(400).json(response);
        return;
      }

      const {
        page,
        limit,
        categoryId,
        brand,
        minPrice,
        maxPrice,
        search,
        sortBy,
        sortOrder,
      } = req.query;

      // [수정] GetProductListUseCase.ts에 정의된 GetProductListRequest 타입에 맞게 객체를 구성합니다.
      const getRequest: GetProductListRequest = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      };

      if (categoryId) getRequest.categoryId = categoryId as string;
      if (brand) getRequest.brand = brand as string;
      if (minPrice) getRequest.minPrice = parseFloat(minPrice as string);
      if (maxPrice) getRequest.maxPrice = parseFloat(maxPrice as string);
      if (search) getRequest.search = search as string;

      // [수정] sortBy와 sortOrder를 조합하여 UseCase가 기대하는 단일 sortBy 필드를 생성합니다.
      if (sortBy && typeof sortBy === "string") {
        const order =
          sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc";
        if (sortBy === "price" || sortBy === "name") {
          getRequest.sortBy = `${sortBy}_${order}` as any;
        } else if (sortBy === "createdAt") {
          getRequest.sortBy = "created_desc"; // createdAt은 desc만 지원한다고 가정
        }
      }

      const result = await this.getProductListUseCase.execute(getRequest);

      if (result.success) {
        const response: ApiResponse<typeof result.data> = {
          success: true,
          message: "상품 목록을 성공적으로 조회했습니다",
          data: result.data!,
          timestamp: new Date().toISOString(),
          requestId: (req.headers["x-request-id"] as string) || "unknown",
        };
        res.status(200).json(response);
      } else {
        this.handleError(
          res,
          result.error!,
          req.headers["x-request-id"] as string
        );
      }
    } catch (error) {
      this.handleUnexpectedError(
        res,
        error,
        req.headers["x-request-id"] as string
      );
    }
  }

  /**
   * 에러 처리 - 도메인 에러를 HTTP 상태 코드로 변환
   */
  private handleError(
    res: Response,
    error: string | Error,
    requestId: string
  ): void {
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let message = "서버 내부 오류가 발생했습니다";

    if (error instanceof DomainError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    }

    // [수정] exactOptionalPropertyTypes 규칙을 준수하도록 error 객체를 구성합니다.
    const errorResponsePart: { code: string; details?: string } = {
      code: errorCode,
    };

    if (error instanceof Error && error.stack) {
      errorResponsePart.details = error.stack;
    }

    const response: ApiResponse<null> = {
      success: false,
      message,
      error: errorResponsePart,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(statusCode).json(response);
  }

  /**
   * 예상치 못한 에러 처리
   */
  private handleUnexpectedError(
    res: Response,
    error: any,
    requestId: string
  ): void {
    console.error("[ProductController] 예상치 못한 에러:", {
      error: error?.message || error,
      stack: error?.stack,
      requestId,
      timestamp: new Date().toISOString(),
    });

    const errorResponsePart: { code: string; details?: string } = {
      code: "INTERNAL_ERROR",
    };

    if (process.env.NODE_ENV === "development" && error?.stack) {
      errorResponsePart.details = error.stack;
    }

    const response: ApiResponse<null> = {
      success: false,
      message: "서버 내부 오류가 발생했습니다",
      error: errorResponsePart,
      data: null,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(500).json(response);
  }
}
