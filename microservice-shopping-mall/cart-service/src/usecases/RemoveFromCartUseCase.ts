// RemoveFromCartUseCase.ts
import {
  RemoveFromCartRequest,
  RemoveFromCartResponse,
  CartRepository,
  CartCache,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";

export class RemoveFromCartUseCase {
  constructor(
    private cartRepository: CartRepository,
    private cartCache: CartCache
  ) {}

  async execute(
    request: RemoveFromCartRequest
  ): Promise<RemoveFromCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    let cart = null;

    if (request.userId) {
      cart = await this.cartRepository.findByUserId(request.userId);
    } else if (request.sessionId) {
      cart = await this.cartRepository.findBySessionId(request.sessionId);
    }

    if (!cart) {
      throw new CartNotFoundError();
    }

    cart.removeItem(request.productId);
    const savedCart = await this.cartRepository.save(cart);
    await this.cartCache.setCart(savedCart.getId()!, savedCart);

    return {
      success: true,
      cart: savedCart,
      message: "상품이 장바구니에서 제거되었습니다.",
    };
  }
}
