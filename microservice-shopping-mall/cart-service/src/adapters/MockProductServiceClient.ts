// Mock ProductServiceClient (테스트용)
// cart-service/src/adapters/MockProductServiceClient.ts
// ========================================

import { injectable, inject } from "inversify";
import {
  ProductServiceClient,
  ProductInfo,
  InventoryCheckResult,
} from "../usecases/types";

@injectable()
export class MockProductServiceClient implements ProductServiceClient {
  // 테스트용 상품 데이터
  private mockProducts: Map<string, ProductInfo> = new Map([
    [
      "660e8400-e29b-41d4-a716-446655440001",
      {
        id: "660e8400-e29b-41d4-a716-446655440001",
        name: "MacBook Pro 16인치 M3 Pro",
        price: 3299000,
        inventory: {
          quantity: 10,
          status: "in_stock" as const,
        },
        isActive: true,
      },
    ],
    [
      "660e8400-e29b-41d4-a716-446655440002",
      {
        id: "660e8400-e29b-41d4-a716-446655440002",
        name: "LG 그램 17인치 2024",
        price: 1899000,
        inventory: {
          quantity: 5,
          status: "low_stock" as const,
        },
        isActive: true,
      },
    ],
    [
      "660e8400-e29b-41d4-a716-446655440003",
      {
        id: "660e8400-e29b-41d4-a716-446655440003",
        name: "iPhone 15 Pro Max",
        price: 1690000,
        inventory: {
          quantity: 0,
          status: "out_of_stock" as const,
        },
        isActive: true,
      },
    ],
  ]);

  async getProduct(productId: string): Promise<ProductInfo | null> {
    // 실제 환경에서는 Product Service API 호출
    await this.delay(100); // 네트워크 지연 시뮬레이션
    return this.mockProducts.get(productId) || null;
  }

  async checkInventory(
    productId: string,
    quantity: number
  ): Promise<InventoryCheckResult> {
    const product = await this.getProduct(productId);

    if (!product) {
      return {
        productId,
        requestedQuantity: quantity,
        availableQuantity: 0,
        isAvailable: false,
        message: "상품을 찾을 수 없습니다",
      };
    }

    const isAvailable = product.inventory.quantity >= quantity;

    return {
      productId,
      requestedQuantity: quantity,
      availableQuantity: product.inventory.quantity,
      isAvailable,
      message: isAvailable ? "재고 확인 완료" : "재고가 부족합니다",
    };
  }

  async reserveInventory(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    // 실제 환경에서는 Product Service의 재고 예약 API 호출
    const checkResult = await this.checkInventory(productId, quantity);

    if (checkResult.isAvailable) {
      // Mock으로 재고 감소 시뮬레이션
      const product = this.mockProducts.get(productId);
      if (product) {
        product.inventory.quantity -= quantity;
        if (product.inventory.quantity <= 0) {
          product.inventory.status = "out_of_stock";
        } else if (product.inventory.quantity <= 5) {
          product.inventory.status = "low_stock";
        }
      }
      return true;
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 테스트용 헬퍼 메서드
  setMockProduct(productId: string, product: ProductInfo): void {
    this.mockProducts.set(productId, product);
  }

  resetMockData(): void {
    // 초기 데이터로 리셋
    this.mockProducts.clear();
    this.mockProducts.set("660e8400-e29b-41d4-a716-446655440001", {
      id: "660e8400-e29b-41d4-a716-446655440001",
      name: "MacBook Pro 16인치 M3 Pro",
      price: 3299000,
      inventory: { quantity: 10, status: "in_stock" },
      isActive: true,
    });
  }
}
