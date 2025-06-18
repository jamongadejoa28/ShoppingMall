// src/usecases/__tests__/CreateOrderUseCase.test.ts
import { Order } from "../../entities/Order";
import { OrderItem } from "../../entities/OrderItem";
import { OrderRepository } from "../../repositories/OrderRepository";
import { CreateOrderUseCase } from "../CreateOrderUseCase";

// Mock OrderRepository
const mockOrderRepository: OrderRepository = {
  create: jest.fn(),
  findByUserId: jest.fn(),
};

describe("CreateOrderUseCase", () => {
  it("올바른 주문 정보로 주문을 생성해야 한다", async () => {
    // Given: 유스케이스와 주문 정보
    const createOrderUseCase = new CreateOrderUseCase(mockOrderRepository);
    const orderInput = {
      userId: "user-123",
      items: [
        { productId: "prod-001", quantity: 2, price: 1000 },
        { productId: "prod-002", quantity: 1, price: 5000 },
      ],
    };

    // Mock: 리포지토리의 create 함수가 성공적으로 Order 객체를 반환하도록 설정
    const expectedOrder = new Order({
      ...orderInput,
      items: orderInput.items.map((item) => new OrderItem(item)),
    });
    (mockOrderRepository.create as jest.Mock).mockResolvedValue(expectedOrder);

    // When: 유스케이스를 실행하면
    const result = await createOrderUseCase.execute(orderInput);

    // Then:
    // 1. 리포지토리의 create 함수가 정확한 인자와 함께 호출되어야 함
    expect(mockOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        totalAmount: 7000,
      })
    );
    // 2. 결과로 생성된 주문 객체를 반환해야 함
    expect(result.userId).toBe(expectedOrder.userId);
    expect(result.totalAmount).toBe(expectedOrder.totalAmount);
  });
});
