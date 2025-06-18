// src/entities/__tests__/Order.test.ts
import { Order, OrderStatus } from "../Order";
import { OrderItem } from "../OrderItem";

describe("Order Entity", () => {
  it("주문 생성 시 총액이 정확히 계산되어야 한다", () => {
    // Given: 2개의 상품 정보
    const items = [
      new OrderItem({ productId: "prod-001", quantity: 2, price: 1000 }), // 2000원
      new OrderItem({ productId: "prod-002", quantity: 1, price: 5000 }), // 5000원
    ];

    // When: 주문을 생성하면
    const order = new Order({
      userId: "user-123",
      items,
    });

    // Then: 총액은 7000원이 되어야 함
    expect(order.totalAmount).toBe(7000);
  });

  it('주문 생성 시 초기 상태는 "상품 준비중"이어야 한다', () => {
    // Given
    const items = [
      new OrderItem({ productId: "prod-001", quantity: 1, price: 1000 }),
    ];

    // When
    const order = new Order({ userId: "user-123", items });

    // Then
    expect(order.status).toBe(OrderStatus.PREPARING);
  });

  it("주문 상태는 정의된 순서대로 변경되어야 한다", () => {
    // Given
    const order = new Order({
      userId: "user-123",
      items: [
        new OrderItem({ productId: "prod-001", quantity: 1, price: 1000 }),
      ],
    });

    // When & Then
    order.updateStatus(OrderStatus.SHIPPED);
    expect(order.status).toBe(OrderStatus.SHIPPED);

    order.updateStatus(OrderStatus.DELIVERING);
    expect(order.status).toBe(OrderStatus.DELIVERING);

    order.updateStatus(OrderStatus.DELIVERED);
    expect(order.status).toBe(OrderStatus.DELIVERED);
  });

  it("잘못된 순서로 주문 상태를 변경하려 하면 에러를 발생시켜야 한다", () => {
    // Given: "상품 준비중" 상태의 주문
    const order = new Order({
      userId: "user-123",
      items: [
        new OrderItem({ productId: "prod-001", quantity: 1, price: 1000 }),
      ],
    });

    // When & Then: "배송 완료"로 바로 변경 시도 시 에러 발생
    expect(() => order.updateStatus(OrderStatus.DELIVERED)).toThrow(
      "Invalid status transition"
    );
  });
});
