// ========================================
// 테스트 데이터 빌더
// cart-service/src/__tests__/utils/TestDataBuilder.ts
// ========================================

import { Cart } from "../../entities/Cart";
import { CartItem } from "../../entities/CartItem";

export class TestDataBuilder {
  // ========================================
  // 상품 테스트 데이터
  // ========================================

  static createProductData(overrides: Partial<any> = {}) {
    return {
      id: "660e8400-e29b-41d4-a716-446655440001",
      name: "MacBook Pro 16인치 M3 Pro",
      price: 3299000,
      inventory: {
        quantity: 10,
        status: "in_stock" as const,
      },
      isActive: true,
      ...overrides,
    };
  }

  static createLowStockProduct() {
    return this.createProductData({
      id: "660e8400-e29b-41d4-a716-446655440002",
      name: "LG 그램 17인치 2024",
      price: 1899000,
      inventory: {
        quantity: 2,
        status: "low_stock" as const,
      },
    });
  }

  static createOutOfStockProduct() {
    return this.createProductData({
      id: "660e8400-e29b-41d4-a716-446655440003",
      name: "iPhone 15 Pro Max",
      price: 1690000,
      inventory: {
        quantity: 0,
        status: "out_of_stock" as const,
      },
    });
  }

  // ========================================
  // 장바구니 테스트 데이터
  // ========================================

  static createUserCart(userId: string, withItems: boolean = false): Cart {
    const cart = Cart.createForUser(userId);

    if (withItems) {
      cart.addItem("product-1", 2, 25000);
      cart.addItem("product-2", 1, 15000);
    }

    return cart;
  }

  static createSessionCart(
    sessionId: string,
    withItems: boolean = false
  ): Cart {
    const cart = Cart.createForSession(sessionId);

    if (withItems) {
      cart.addItem("product-3", 1, 35000);
    }

    return cart;
  }

  // ========================================
  // API 요청 데이터
  // ========================================

  static createAddToCartRequest(overrides: Partial<any> = {}) {
    return {
      userId: "user-123",
      productId: "660e8400-e29b-41d4-a716-446655440001",
      quantity: 1,
      ...overrides,
    };
  }

  static createUpdateCartRequest(overrides: Partial<any> = {}) {
    return {
      userId: "user-123",
      productId: "660e8400-e29b-41d4-a716-446655440001",
      quantity: 3,
      ...overrides,
    };
  }

  // ========================================
  // 테스트 사용자 데이터
  // ========================================

  static generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateProductId(): string {
    return `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
