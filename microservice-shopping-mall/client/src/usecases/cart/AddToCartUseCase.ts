// ========================================
// 장바구니에 상품 추가 유스케이스
// client/src/usecases/cart/AddToCartUseCase.ts
// ========================================

import {
  CartRepository,
  AddToCartRequest,
  CartResponse,
  Result,
} from './types';
import { CartEntity } from '../../entities/cart/CartEntity';
import { ProductInfo } from '../../entities/cart/CartItem';

export class AddToCartUseCase {
  constructor(private cartRepository: CartRepository) {}

  async execute(request: AddToCartRequest): Promise<Result<CartResponse>> {
    try {
      // 1. 입력 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // 2. 기존 장바구니 조회 또는 새로 생성
      let cart = await this.cartRepository.findByUserId(request.userId);
      if (!cart) {
        cart = new CartEntity(request.userId);
      }

      // 3. 상품 정보 구성
      const product: ProductInfo = {
        id: request.productId,
        name: request.productName,
        price: request.price,
        availableQuantity: request.availableQuantity,
      };

      // 4. 장바구니에 상품 추가
      cart.addItem(product, request.quantity);

      // 5. 장바구니 저장
      await this.cartRepository.save(cart);

      // 6. 응답 생성
      return {
        success: true,
        data: this.mapToResponse(cart),
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
    if (!request.userId || request.userId.trim() === '') {
      return '사용자 ID는 필수입니다';
    }

    if (!request.productId || request.productId.trim() === '') {
      return '상품 ID는 필수입니다';
    }

    if (!request.productName || request.productName.trim() === '') {
      return '상품명은 필수입니다';
    }

    if (request.price < 0) {
      return '상품 가격은 0 이상이어야 합니다';
    }

    if (!Number.isInteger(request.quantity) || request.quantity < 1) {
      return '수량은 1 이상의 정수여야 합니다';
    }

    if (request.availableQuantity < 0) {
      return '재고 수량은 0 이상이어야 합니다';
    }

    if (request.quantity > request.availableQuantity) {
      return '재고가 부족합니다';
    }

    return null;
  }

  private mapToResponse(cart: CartEntity): CartResponse {
    return {
      userId: cart.userId,
      items: cart.getItems().map(item => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        availableQuantity: item.availableQuantity,
        totalPrice: item.totalPrice,
      })),
      itemCount: cart.getItemCount(),
      totalQuantity: cart.getTotalQuantity(),
      totalPrice: cart.getTotalPrice(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
