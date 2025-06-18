// ClearCartUseCase.ts
import {
  ClearCartRequest,
  ClearCartResponse,
  CartRepository,
  CartCache,
  InvalidRequestError,
  CartNotFoundError,
} from "./types";

export class ClearCartUseCase {
  constructor(
    private cartRepository: CartRepository,
    private cartCache: CartCache
  ) {}

  async execute(request: ClearCartRequest): Promise<ClearCartResponse> {
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

    cart.clear();
    const savedCart = await this.cartRepository.save(cart);
    await this.cartCache.setCart(savedCart.getId()!, savedCart);

    return {
      success: true,
      message: "장바구니가 비워졌습니다.",
    };
  }
}
