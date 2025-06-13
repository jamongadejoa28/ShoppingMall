// ========================================
// Swagger API Documentation Configuration
// src/frameworks/web/docs/swagger.ts
// ========================================

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

/**
 * Swagger 설정 및 초기화
 */
export function setupSwagger(app: Express): void {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Product Service API",
        version: "1.0.0",
        description: "Clean Architecture 기반 상품 관리 마이크로서비스 API",
        contact: {
          name: "Development Team",
          email: "dev@shoppingmall.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: process.env.API_BASE_URL || "http://localhost:3003",
          description: "Development server",
        },
        {
          url: "https://api.shoppingmall.com",
          description: "Production server",
        },
      ],
      components: {
        schemas: {
          // 공통 응답 스키마
          ApiResponse: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                description: "요청 성공 여부",
                example: true,
              },
              message: {
                type: "string",
                description: "응답 메시지",
                example: "요청이 성공적으로 처리되었습니다",
              },
              data: {
                type: "object",
                description: "응답 데이터",
              },
              timestamp: {
                type: "string",
                format: "date-time",
                description: "응답 생성 시간",
                example: "2024-01-15T10:30:00.000Z",
              },
              requestId: {
                type: "string",
                description: "요청 추적 ID",
                example: "req-123e4567-e89b-12d3-a456-426614174000",
              },
            },
            required: ["success", "message", "timestamp", "requestId"],
          },

          // 에러 응답 스키마
          ApiErrorResponse: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: false,
              },
              message: {
                type: "string",
                example: "요청 처리 중 오류가 발생했습니다",
              },
              error: {
                type: "object",
                properties: {
                  code: {
                    type: "string",
                    example: "VALIDATION_ERROR",
                  },
                  details: {
                    type: "string",
                    description: "상세 에러 정보 (개발 환경에만 노출)",
                  },
                },
              },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: {
                      type: "string",
                      example: "name",
                    },
                    message: {
                      type: "string",
                      example: "상품명은 필수입니다",
                    },
                  },
                },
                description: "필드별 검증 에러",
              },
              data: {
                type: "null",
                example: null,
              },
              timestamp: {
                type: "string",
                format: "date-time",
              },
              requestId: {
                type: "string",
              },
            },
            required: ["success", "message", "timestamp", "requestId"],
          },

          // 상품 관련 스키마
          Product: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "상품 고유 ID",
                example: "550e8400-e29b-41d4-a716-446655440001",
              },
              name: {
                type: "string",
                description: "상품명",
                example: "iPhone 15 Pro",
              },
              description: {
                type: "string",
                description: "상품 설명",
                example: "최신 iPhone 15 Pro 모델입니다",
              },
              price: {
                type: "number",
                description: "가격",
                example: 1290000,
              },
              effectivePrice: {
                type: "number",
                description: "할인 적용된 실제 가격",
                example: 1161000,
              },
              categoryId: {
                type: "string",
                format: "uuid",
                description: "카테고리 ID",
              },
              categoryName: {
                type: "string",
                description: "카테고리명",
                example: "스마트폰",
              },
              categoryPath: {
                type: "string",
                description: "카테고리 경로",
                example: "전자제품 > 스마트폰 > 아이폰",
              },
              brand: {
                type: "string",
                description: "브랜드",
                example: "Apple",
              },
              sku: {
                type: "string",
                description: "SKU",
                example: "IPH15-PRO-256-SLV",
              },
              weight: {
                type: "number",
                description: "무게 (g)",
                example: 187,
              },
              dimensions: {
                type: "object",
                properties: {
                  width: { type: "number", example: 76.7 },
                  height: { type: "number", example: 159.9 },
                  depth: { type: "number", example: 8.25 },
                },
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "태그 목록",
                example: ["smartphone", "apple", "premium"],
              },
              isActive: {
                type: "boolean",
                description: "활성화 상태",
                example: true,
              },
              hasDiscount: {
                type: "boolean",
                description: "할인 여부",
                example: true,
              },
              discountPrice: {
                type: "number",
                description: "할인 금액",
                example: 129000,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                description: "생성일시",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                description: "수정일시",
              },
            },
          },

          // 재고 정보 스키마
          Inventory: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "재고 ID",
              },
              productId: {
                type: "string",
                format: "uuid",
                description: "상품 ID",
              },
              quantity: {
                type: "integer",
                description: "총 재고 수량",
                example: 100,
              },
              availableQuantity: {
                type: "integer",
                description: "사용 가능한 재고 수량",
                example: 85,
              },
              reservedQuantity: {
                type: "integer",
                description: "예약된 재고 수량",
                example: 15,
              },
              status: {
                type: "string",
                enum: ["sufficient", "low_stock", "out_of_stock"],
                description: "재고 상태",
                example: "sufficient",
              },
              isLowStock: {
                type: "boolean",
                description: "재고 부족 여부",
                example: false,
              },
              isOutOfStock: {
                type: "boolean",
                description: "품절 여부",
                example: false,
              },
              location: {
                type: "string",
                description: "창고 위치",
                example: "MAIN_WAREHOUSE",
              },
              lowStockThreshold: {
                type: "integer",
                description: "최소 재고 임계값",
                example: 10,
              },
              lastRestockedAt: {
                type: "string",
                format: "date-time",
                description: "마지막 입고일시",
                nullable: true,
              },
            },
          },

          // 상품 생성 요청 스키마
          CreateProductRequest: {
            type: "object",
            required: [
              "name",
              "description",
              "price",
              "categoryId",
              "brand",
              "sku",
              "initialStock",
            ],
            properties: {
              name: {
                type: "string",
                minLength: 1,
                maxLength: 200,
                description: "상품명",
                example: "iPhone 15 Pro",
              },
              description: {
                type: "string",
                minLength: 1,
                maxLength: 2000,
                description: "상품 설명",
                example: "최신 iPhone 15 Pro 모델입니다",
              },
              price: {
                type: "number",
                minimum: 0,
                description: "가격",
                example: 1290000,
              },
              categoryId: {
                type: "string",
                format: "uuid",
                description: "카테고리 ID",
                example: "550e8400-e29b-41d4-a716-446655440011",
              },
              brand: {
                type: "string",
                minLength: 1,
                maxLength: 100,
                description: "브랜드",
                example: "Apple",
              },
              sku: {
                type: "string",
                pattern: "^[A-Z0-9\\-_]+$",
                minLength: 1,
                maxLength: 50,
                description: "SKU",
                example: "IPH15-PRO-256-SLV",
              },
              weight: {
                type: "number",
                minimum: 0,
                description: "무게 (g)",
                example: 187,
              },
              dimensions: {
                type: "object",
                properties: {
                  width: { type: "number", minimum: 0, example: 76.7 },
                  height: { type: "number", minimum: 0, example: 159.9 },
                  depth: { type: "number", minimum: 0, example: 8.25 },
                },
              },
              tags: {
                type: "array",
                items: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                description: "태그 목록",
                example: ["smartphone", "apple", "premium"],
              },
              initialStock: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: {
                    type: "integer",
                    minimum: 0,
                    description: "초기 재고 수량",
                    example: 100,
                  },
                  location: {
                    type: "string",
                    maxLength: 100,
                    description: "창고 위치",
                    default: "MAIN_WAREHOUSE",
                    example: "MAIN_WAREHOUSE",
                  },
                  lowStockThreshold: {
                    type: "integer",
                    minimum: 0,
                    description: "최소 재고 임계값",
                    default: 10,
                    example: 10,
                  },
                },
              },
            },
          },

          // 페이지네이션 스키마
          PaginationMeta: {
            type: "object",
            properties: {
              currentPage: {
                type: "integer",
                description: "현재 페이지",
                example: 1,
              },
              perPage: {
                type: "integer",
                description: "페이지당 항목 수",
                example: 20,
              },
              totalItems: {
                type: "integer",
                description: "전체 항목 수",
                example: 150,
              },
              totalPages: {
                type: "integer",
                description: "전체 페이지 수",
                example: 8,
              },
              hasPreviousPage: {
                type: "boolean",
                description: "이전 페이지 존재 여부",
                example: false,
              },
              hasNextPage: {
                type: "boolean",
                description: "다음 페이지 존재 여부",
                example: true,
              },
            },
          },
        },

        // 보안 스키마 (향후 인증 구현 시 사용)
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT 토큰을 사용한 인증",
          },
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
            description: "API 키를 사용한 인증",
          },
        },
      },

      // 태그 분류
      tags: [
        {
          name: "Products",
          description: "상품 관리 API",
        },
        {
          name: "Health",
          description: "서비스 상태 확인 API",
        },
      ],

      // 전역 보안 설정 (향후 인증 구현 시 활성화)
      // security: [
      //   {
      //     bearerAuth: [],
      //   },
      // ],
    },
    apis: [
      "./src/frameworks/web/routes/*.ts",
      "./src/frameworks/web/controllers/*.ts",
    ],
  };

  const specs = swaggerJsdoc(options);

  // Swagger UI 설정
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activated: true,
        theme: "arta",
      },
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 10px; border-radius: 4px; }
    `,
    customSiteTitle: "Product Service API Documentation",
  };

  // Swagger UI 라우트 설정
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, swaggerUiOptions)
  );

  // Swagger JSON 스펙 제공
  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  console.log("✅ [ProductService] Swagger 문서 설정 완료");
  console.log(
    `📚 [ProductService] API 문서: http://localhost:${process.env.PORT || 3003}/api/docs`
  );
}

export default setupSwagger;
