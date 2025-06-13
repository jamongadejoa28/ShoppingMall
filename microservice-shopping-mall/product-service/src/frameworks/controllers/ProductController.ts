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
