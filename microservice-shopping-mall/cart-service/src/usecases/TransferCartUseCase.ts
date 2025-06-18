// cart-service/src/usecases/TransferCartUseCase.ts
// ========================================

import { Cart } from "../entities/Cart";
import {
  TransferCartRequest,
  TransferCartResponse,
  CartRepository,
  CartCache,
  InvalidRequestError,
} from "./types";

export class TransferCartUseCase {
  constructor(
    private cartRepository: CartRepository,
    private cartCache: CartCache
  ) {}

  async execute(request: TransferCartRequest): Promise<TransferCartResponse> {
    // 1. 입력값 검증
    this.validateRequest(request);

    try {
      // 2. sessionId 기반 장바구니 조회
      const sessionCart = await this.cartRepository.findBySessionId(
        request.sessionId
      );

      if (!sessionCart) {
        // 세션 장바구니가 없으면 빈 사용자 장바구니 생성
        const newUserCart = Cart.createForUser(request.userId);
        const savedCart = await this.cartRepository.save(newUserCart);

        return {
          success: true,
          cart: savedCart,
          message: "새로운 장바구니가 생성되었습니다.",
        };
      }

      // 3. userId 기반 기존 장바구니 조회
      const userCart = await this.cartRepository.findByUserId(request.userId);

      if (userCart) {
        // 4. 두 장바구니 병합 (같은 상품은 수량 증가)
        await this.mergeCart(userCart, sessionCart);
        await this.cartRepository.delete(sessionCart.getId()!); // 세션 장바구니 삭제

        const savedCart = await this.cartRepository.save(userCart);
        await this.updateCache(request.userId, savedCart);

        return {
          success: true,
          cart: savedCart,
          message: "장바구니가 병합되었습니다.",
        };
      } else {
        // 5. 세션 장바구니를 사용자 장바구니로 이전
        sessionCart.transferToUser(request.userId);
        const savedCart = await this.cartRepository.save(sessionCart);
        await this.updateCache(request.userId, savedCart);

        return {
          success: true,
          cart: savedCart,
          message: "장바구니가 이전되었습니다.",
        };
      }
    } catch (error) {
      // ✅ 타입 안전한 에러 처리
      if (error instanceof InvalidRequestError) {
        throw error; // 비즈니스 로직 에러는 그대로 전파
      }

      // ✅ unknown 타입 에러 처리
      const errorMessage = this.getErrorMessage(error);
      throw new Error(`장바구니 이전 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }

  private validateRequest(request: TransferCartRequest): void {
    if (!request.userId) {
      throw new InvalidRequestError("사용자 ID는 필수입니다");
    }

    if (!request.sessionId) {
      throw new InvalidRequestError("세션 ID는 필수입니다");
    }
  }

  private async mergeCart(targetCart: Cart, sourceCart: Cart): Promise<void> {
    targetCart.mergeWith(sourceCart);
  }

  private async updateCache(userId: string, cart: Cart): Promise<void> {
    await this.cartCache.setCart(cart.getId()!, cart);
    await this.cartCache.setUserCartId(userId, cart.getId()!);
  }

  // ✅ 타입 안전한 에러 메시지 추출
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
