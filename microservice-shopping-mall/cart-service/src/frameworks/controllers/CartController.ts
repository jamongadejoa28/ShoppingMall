// ========================================
// CartController - Framework Layer (InversifyJS DI 적용)
// cart-service/src/frameworks/controllers/CartController.ts
// ========================================

import { Request, Response } from "express"; // express 명시적 임포트
import { injectable, inject } from "inversify"; // Inversify import

import { AddToCartUseCase } from "../../usecases/AddToCartUseCase";
import { RemoveFromCartUseCase } from "../../usecases/RemoveFromCartUseCase";
import { GetCartUseCase } from "../../usecases/GetCartUseCase";
import { UpdateCartItemUseCase } from "../../usecases/UpdateCartItemUseCase";
import { ClearCartUseCase } from "../../usecases/ClearCartUseCase";
import { TransferCartUseCase } from "../../usecases/TransferCartUseCase";

// 두 번째 코드의 장점인 커스텀 에러 클래스 임포트
import {
  ProductNotFoundError,
  InsufficientStockError,
  InvalidRequestError,
  CartNotFoundError,
} from "../../usecases/types"; // 유스케이스 계층의 커스텀 에러 타입 임포트

import { TYPES } from "../../infrastructure/di/types"; // TYPES 임포트 (Inversify 바인딩용)

/**
 * CartController - 장바구니 API 엔드포인트 처리
 *
 * 책임:
 * 1. HTTP 요청/응답 처리
 * 2. 요청 데이터 검증 및 변환
 * 3. 유스케이스 호출 및 결과 처리
 * 4. 적절한 HTTP 상태 코드 반환
 * 5. 에러 처리 및 클라이언트 친화적 메시지 변환
 *
 * SOLID 원칙:
 * - SRP: 컨트롤러는 HTTP 계층만 담당
 * - DIP: 추상화(인터페이스)에 의존
 */
@injectable() // InversifyJS 컨테이너에 의해 주입 가능하도록 설정
export class CartController {
  constructor(
    @inject(TYPES.AddToCartUseCase) // AddToCartUseCase 의존성 주입
    private readonly addToCartUseCase: AddToCartUseCase,

    @inject(TYPES.RemoveFromCartUseCase) // RemoveFromCartUseCase 의존성 주입
    private readonly removeFromCartUseCase: RemoveFromCartUseCase,

    @inject(TYPES.GetCartUseCase) // GetCartUseCase 의존성 주입
    private readonly getCartUseCase: GetCartUseCase,

    @inject(TYPES.UpdateCartItemUseCase) // UpdateCartItemUseCase 의존성 주입
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,

    @inject(TYPES.ClearCartUseCase) // ClearCartUseCase 의존성 주입
    private readonly clearCartUseCase: ClearCartUseCase,

    @inject(TYPES.TransferCartUseCase) // TransferCartUseCase 의존성 주입
    private readonly transferCartUseCase: TransferCartUseCase
  ) {}

  /**
   * 장바구니에 상품 추가
   * POST /api/cart/items
   */
  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity } = req.body;
      const userId = req.user?.id; // JWT에서 추출
      const sessionId = req.sessionId; // 세션 미들웨어에서 추출

      // 기본 유효성 검증 (두 번째 코드의 장점)
      if (!productId || !quantity) {
        res.status(400).json({
          success: false,
          error: "상품 ID와 수량은 필수입니다",
          code: "INVALID_REQUEST",
        });
        return;
      }

      if (quantity <= 0 || !Number.isInteger(quantity)) {
        res.status(400).json({
          success: false,
          error: "수량은 1 이상의 정수여야 합니다",
          code: "INVALID_QUANTITY",
        });
        return;
      }

      const response = await this.addToCartUseCase.execute({
        userId,
        sessionId,
        productId,
        quantity,
      });

      res.status(201).json({
        success: true,
        data: {
          cart: response.cart.toJSON(), // toJSON() 호출 유지
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 장바구니에서 상품 제거
   * DELETE /api/cart/items/:productId
   */
  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!productId) {
        res.status(400).json({
          success: false,
          error: "상품 ID는 필수입니다",
          code: "INVALID_REQUEST",
        });
        return;
      }

      const response = await this.removeFromCartUseCase.execute({
        userId,
        sessionId,
        productId,
      });

      res.status(200).json({
        success: true,
        data: {
          cart: response.cart.toJSON(),
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 장바구니 조회
   * GET /api/cart
   */
  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      const response = await this.getCartUseCase.execute({
        userId,
        sessionId,
      });

      res.status(200).json({
        success: true,
        data: {
          cart: response.cart?.toJSON() || null,
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 장바구니 아이템 수량 변경
   * PUT /api/cart/items/:productId
   */
  async updateCartItem(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!productId || quantity === undefined) {
        res.status(400).json({
          success: false,
          error: "상품 ID와 수량은 필수입니다",
          code: "INVALID_REQUEST",
        });
        return;
      }

      if (quantity <= 0 || !Number.isInteger(quantity)) {
        res.status(400).json({
          success: false,
          error: "수량은 1 이상의 정수여야 합니다",
          code: "INVALID_QUANTITY",
        });
        return;
      }

      const response = await this.updateCartItemUseCase.execute({
        userId,
        sessionId,
        productId,
        quantity,
      });

      res.status(200).json({
        success: true,
        data: {
          cart: response.cart.toJSON(),
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 장바구니 비우기
   * DELETE /api/cart
   */
  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      const response = await this.clearCartUseCase.execute({
        userId,
        sessionId,
      });

      res.status(200).json({
        success: true,
        data: {
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 장바구니 이전 (로그인 시 세션 → 사용자)
   * POST /api/cart/transfer
   */
  async transferCart(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.sessionId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "로그인이 필요합니다",
          code: "AUTHENTICATION_REQUIRED",
        });
        return;
      }

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: "세션 정보가 필요합니다",
          code: "SESSION_REQUIRED",
        });
        return;
      }

      const response = await this.transferCartUseCase.execute({
        userId,
        sessionId,
      });

      res.status(200).json({
        success: true,
        data: {
          cart: response.cart.toJSON(),
          message: response.message,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * 통합 에러 처리 (두 번째 코드의 instanceof 기반 에러 처리 유지)
   */
  private handleError(error: unknown, res: Response): void {
    // TODO: 프로덕션에서는 적절한 로깅 시스템 사용 (Winston, Pino 등)
    console.error("[CartController] Error:", error);

    if (error instanceof ProductNotFoundError) {
      res.status(404).json({
        success: false,
        error: "상품을 찾을 수 없습니다",
        code: "PRODUCT_NOT_FOUND",
      });
      return;
    }

    if (error instanceof InsufficientStockError) {
      res.status(409).json({
        success: false,
        error: error.message,
        code: "INSUFFICIENT_STOCK",
        availableQuantity: error.availableQuantity,
      });
      return;
    }

    if (error instanceof CartNotFoundError) {
      res.status(404).json({
        success: false,
        error: "장바구니를 찾을 수 없습니다",
        code: "CART_NOT_FOUND",
      });
      return;
    }

    if (error instanceof InvalidRequestError) {
      res.status(400).json({
        success: false,
        error: error.message,
        code: "INVALID_REQUEST",
      });
      return;
    }

    // 예상하지 못한 에러
    res.status(500).json({
      success: false,
      error: "서버 내부 오류가 발생했습니다",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
}

// Express Request 확장 타입 정의 (두 번째 코드의 장점 유지)
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      sessionId?: string;
    }
  }
}
