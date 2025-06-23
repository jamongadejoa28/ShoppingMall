// ========================================
// GetCartUseCase - 캐시 역직렬화 문제 근본 해결
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
import { CartItem } from "../entities/CartItem";

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
            // 🔧 수정: 캐시에서 가져온 일반 객체를 Domain 인스턴스로 변환
            cart = this.deserializeCartFromCache(cachedCart);
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findByUserId(request.userId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.saveCartToCache(cart);
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
            // 🔧 수정: 캐시에서 가져온 일반 객체를 Domain 인스턴스로 변환
            cart = this.deserializeCartFromCache(cachedCart);
          }
        }

        // 캐시에 없으면 DB에서 조회
        if (!cart) {
          cart = await this.cartRepository.findBySessionId(request.sessionId);

          // DB에서 찾은 경우 캐시에 저장
          if (cart) {
            await this.saveCartToCache(cart);
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

  // ========================================
  // 🔧 캐시 직렬화/역직렬화 헬퍼 메서드들 (근본 해결)
  // ========================================

  /**
   * 캐시에서 조회한 일반 객체를 Cart Domain 인스턴스로 변환
   */
  private deserializeCartFromCache(cachedData: any): Cart | null {
    try {
      if (!cachedData) {
        return null;
      }

      // 🔧 핵심: CartItem 일반 객체들을 CartItem 인스턴스로 변환
      const cartItems = (cachedData.items || []).map((itemData: any) => {
        return new CartItem({
          id: itemData.id,
          cartId: itemData.cartId,
          productId: itemData.productId,
          quantity: itemData.quantity,
          price: itemData.price,
          addedAt: new Date(itemData.addedAt),
        });
      });

      // 🔧 핵심: Cart 인스턴스 생성 (CartItem 인스턴스들과 함께)
      const cart = new Cart({
        id: cachedData.id,
        userId: cachedData.userId || undefined,
        sessionId: cachedData.sessionId || undefined,
        items: cartItems, // ✅ 올바른 CartItem 인스턴스들
        createdAt: new Date(cachedData.createdAt),
        updatedAt: new Date(cachedData.updatedAt),
      });

      // 저장 상태 표시
      cart.markAsPersisted();

      return cart;
    } catch (error) {
      console.error("[GetCartUseCase] 캐시 역직렬화 오류:", error);
      // 캐시 역직렬화 실패 시 null 반환 (DB에서 조회하도록)
      return null;
    }
  }

  /**
   * Cart 인스턴스를 캐시에 저장 (직렬화)
   */
  private async saveCartToCache(cart: Cart): Promise<void> {
    try {
      // 🔧 직렬화: Cart 인스턴스를 JSON 직렬화 가능한 객체로 변환
      const serializedCart = {
        id: cart.getId(),
        userId: cart.getUserId(),
        sessionId: cart.getSessionId(),
        items: cart.getItems().map((item) => ({
          id: item.getId(),
          cartId: item.getCartId(),
          productId: item.getProductId(),
          quantity: item.getQuantity(),
          price: item.getPrice(),
          addedAt: item.getAddedAt().toISOString(),
        })),
        createdAt: cart.getCreatedAt().toISOString(),
        updatedAt: cart.getUpdatedAt().toISOString(),
      };

      // 캐시에 저장 (30분 TTL)
      await this.cacheService.set(`cart:${cart.getId()}`, serializedCart, 1800);
    } catch (error) {
      console.error("[GetCartUseCase] 캐시 저장 오류:", error);
      // 캐시 저장 실패는 무시 (graceful degradation)
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
