import { Order } from '@entities/order/Order';
import {
  IOrderRepository,
  CreateOrderData,
} from '@entities/order/IOrderRepository';
import { IProductRepository } from '@entities/product/IProductRepository';

export class CreateOrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async execute(orderData: CreateOrderData): Promise<Order> {
    await this.validateOrderData(orderData);

    try {
      return await this.orderRepository.createOrder(orderData);
    } catch (error: any) {
      throw new Error(error.message || '주문 생성에 실패했습니다');
    }
  }

  private async validateOrderData(orderData: CreateOrderData): Promise<void> {
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('주문할 상품이 없습니다');
    }

    if (!orderData.shippingAddress) {
      throw new Error('배송 주소가 필요합니다');
    }

    // 각 상품의 재고 확인
    for (const item of orderData.items) {
      const product = await this.productRepository.getProductById(
        item.productId
      );

      if (!product.isAvailableForQuantity(item.quantity)) {
        throw new Error(`${product.name}의 재고가 부족합니다`);
      }
    }
  }
}
