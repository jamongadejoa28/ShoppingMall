// UpdateCartItemUseCase.ts
import {
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  CartRepository,
  CartCache,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";

export class UpdateCartItemUseCase {
  constructor(
    private cartRepository: CartRepository,
    private cartCache: CartCache
  ) {}

  async execute(
    request: UpdateCartItemRequest
  ): Promise<UpdateCartItemResponse> {
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

    cart.updateItemQuantity(request.productId, request.quantity);
    const savedCart = await this.cartRepository.save(cart);
    await this.cartCache.setCart(savedCart.getId()!, savedCart);

    return {
      success: true,
      cart: savedCart,
      message: "상품 수량이 변경되었습니다.",
    };
  }
}
