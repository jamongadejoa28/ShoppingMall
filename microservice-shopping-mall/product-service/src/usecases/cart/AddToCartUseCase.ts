// ========================================
// 장바구니에 상품 추가 유스케이스 (API 연동)
// client/src/usecases/cart/AddToCartUseCase.ts
// ========================================

import {
  CartRepository,
  AddToCartRequest,
  CartResponse,
  Result,
} from './types';
import { CartApiAdapter } from '../../adapters/api/CartApiAdapter';

export class AddToCartUseCase {
  private cartApiAdapter: CartApiAdapter;

  constructor(private cartRepository: CartRepository) {
    this.cartApiAdapter = new CartApiAdapter();
  }

  async execute(request: AddToCartRequest): Promise<Result<CartResponse>> {
    try {
      // 1. 입력 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // 2. Cart Service API 호출하여 장바구니에 상품 추가
      const cart = await this.cartApiAdapter.addToCart(
        request.productId,
        request.quantity
      );

      // 3. 로컬 저장소에도 저장 (선택사항)
      try {
        await this.cartRepository.save(cart as any);
      } catch (localError) {
        console.warn('로컬 저장소 업데이트 실패:', localError);
      }

      // 4. 응답 생성
      return {
        success: true,
        data: this.mapToApiResponse(cart),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : '장바구니 추가 중 오류가 발생했습니다';
      return { success: false, error: errorMessage };
    }
  }

  private validateInput(request: AddToCartRequest): string | null {
    if (!request.productId || request.productId.trim() === '') {
      return '상품 ID는 필수입니다';
    }

    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      return '수량은 1 이상의 정수여야 합니다';
    }

    return null;
  }

  private mapToApiResponse(cart: any): CartResponse {
    return {
      userId: cart.userId || 'anonymous',
      items:
        cart.items?.map((item: any) => ({
          productId: item.product?.id || item.productId,
          productName: item.product?.name || item.productName || 'Unknown',
          price: item.product?.price || item.price || 0,
          quantity: item.quantity || 0,
          availableQuantity: item.product?.inventory?.availableQuantity || 0,
          totalPrice:
            (item.product?.price || item.price || 0) * (item.quantity || 0),
        })) || [],
      itemCount: cart.items?.length || 0,
      totalQuantity: cart.totalQuantity || 0,
      totalPrice: cart.totalAmount || 0,
      updatedAt: cart.updatedAt || new Date().toISOString(),
    };
  }
}
