// ========================================
// ClearCartUseCase - 새로운 CacheService 구조 적용
// cart-service/src/usecases/ClearCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  ClearCartRequest,
  ClearCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class ClearCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: ClearCartRequest): Promise<ClearCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    try {
      let cart = null;

      // 1. 장바구니 조회
      if (request.userId) {
        cart = await this.cartRepository.findByUserId(request.userId);
      } else if (request.sessionId) {
        cart = await this.cartRepository.findBySessionId(request.sessionId);
      }

      if (!cart) {
        throw new CartNotFoundError();
      }

      // 2. 장바구니 비우기
      cart.clear();

      // 3. 장바구니 저장
      const savedCart = await this.cartRepository.save(cart);

      // 4. 캐시 업데이트
      await this.updateCache(request.userId, request.sessionId, savedCart);

      return {
        success: true,
        message: "장바구니가 비워졌습니다.",
      };
    } catch (error) {
      // 비즈니스 로직 에러는 그대로 전파
      if (
        error instanceof InvalidRequestError ||
        error instanceof CartNotFoundError
      ) {
        throw error;
      }

      // 타입 안전한 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(
        `장바구니 비우기 중 오류가 발생했습니다: ${errorMessage}`
      );
    }
  }

  /**
   * 캐시 업데이트 (빈 장바구니 반영)
   */
  private async updateCache(
    userId?: string,
    sessionId?: string,
    cart?: any
  ): Promise<void> {
    try {
      if (cart) {
        // 빈 장바구니 데이터 캐시 (짧은 TTL)
        await this.cacheService.set(`cart:${cart.getId()}`, cart, 300); // 5분

        // 사용자/세션 매핑은 유지 (사용자가 다시 상품을 담을 수 있도록)
        if (userId) {
          await this.cacheService.set(`user:${userId}`, cart.getId(), 3600); // 1시간
        }
        if (sessionId) {
          await this.cacheService.set(
            `session:${sessionId}`,
            cart.getId(),
            300
          ); // 5분
        }
      }
    } catch (error) {
      console.error("[ClearCartUseCase] 캐시 업데이트 오류:", error);
      // 캐시 오류는 무시 (graceful degradation)
    }
  }

  // 타입 안전한 에러 메시지 추출
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "알 수 없는 오류가 발생했습니다";
  }
}
