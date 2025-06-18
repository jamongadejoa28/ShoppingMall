import { Order } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { OrderRepository } from "../repositories/OrderRepository";

interface CreateOrderInput {
  userId: string;
  items: {
    productId: string;
    quantity: number;
    price: number; // 실제로는 product-service에서 조회해야 함
  }[];
}

export class CreateOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const orderItems = input.items.map((item) => new OrderItem(item));
    const order = new Order({
      userId: input.userId,
      items: orderItems,
    });

    // 실제 구현 시, 이 곳에 product-service를 호출하여
    // 상품 가격 및 재고를 확인하는 로직이 추가됩니다.

    const createdOrder = await this.orderRepository.create(order);
    return createdOrder;
  }
}
