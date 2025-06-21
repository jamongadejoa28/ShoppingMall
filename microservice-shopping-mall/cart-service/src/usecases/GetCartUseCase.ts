// ========================================
// GetCartUseCase - 새로운 CacheService 구조 적용
// cart-service/src/usecases/GetCartUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  GetCartRequest,
  GetCartResponse,
  CartRepository,
  CacheService,
  InvalidRequestError,
} from "./types";
import { TYPES } from "../infrastructure/di/types";
import { Cart } from "../entities/Cart";

@injectable()
export class GetCartUseCase {
  constructor(
    @inject(TYPES.CartRepository) private cartRepository: CartRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService
  ) {}

  async execute(request: GetCartRequest): Promise<GetCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    try {
      let cart = null;
      let cacheKey = "";

      // 1. 캐시에서 먼저 조회 시도
      if (request.userId) {
        cacheKey = `user:${request.userId}`;
        const cachedCartId = await this.cacheService.get<string>(cacheKey);

        if (cachedCartId) {
          const cachedCart = await this.cacheService.get(
            `cart:${cachedCartId}`
          );
          if (cachedCart) {
            // 캐시에서 가져온 데이터를 Cart 인스턴스로 변환
            cart = new Cart(cachedCart as any);
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findByUserId(request.userId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.cacheService.set(`cart:${cart.getId()}`, cart, 1800); // 30분
            await this.cacheService.set(cacheKey, cart.getId(), 3600); // 1시간
          }
        }
      } else if (request.sessionId) {
        cacheKey = `session:${request.sessionId}`;
        const cachedCartId = await this.cacheService.get<string>(cacheKey);

        if (cachedCartId) {
          const cachedCart = await this.cacheService.get(
            `cart:${cachedCartId}`
          );
          if (cachedCart) {
            // 캐시에서 가져온 데이터를 Cart 인스턴스로 변환
            cart = new Cart(cachedCart as any);
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findBySessionId(request.sessionId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.cacheService.set(`cart:${cart.getId()}`, cart, 1800); // 30분
            await this.cacheService.set(cacheKey, cart.getId(), 300); // 5분
          }
        }
      }

      return {
        success: true,
        cart,
        message: cart ? "장바구니를 조회했습니다." : "장바구니가 비어있습니다.",
      };
    } catch (error) {
      // 타입 안전한 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`장바구니 조회 중 오류가 발생했습니다: ${errorMessage}`);
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
