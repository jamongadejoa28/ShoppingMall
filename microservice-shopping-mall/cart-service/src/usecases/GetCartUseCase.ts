// GetCartUseCase.ts
import {
  GetCartRequest,
  GetCartResponse,
  CartRepository,
  InvalidRequestError,
} from "./types";

export class GetCartUseCase {
  constructor(private cartRepository: CartRepository) {}

  async execute(request: GetCartRequest): Promise<GetCartResponse> {
    if (!request.userId && !request.sessionId) {
      throw new InvalidRequestError("사용자 ID 또는 세션 ID가 필요합니다");
    }

    let cart = null;

    if (request.userId) {
      cart = await this.cartRepository.findByUserId(request.userId);
    } else if (request.sessionId) {
      cart = await this.cartRepository.findBySessionId(request.sessionId);
    }

    return {
      success: true,
      cart,
      message: cart ? "장바구니를 조회했습니다." : "장바구니가 비어있습니다.",
    };
  }
}
