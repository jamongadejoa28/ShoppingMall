import { OrderRepositoryImpl } from "../OrderRepositoryImpl";
import { Order } from "../../entities/Order";
import { OrderItem } from "../../entities/OrderItem";
import { AppDataSource } from "../../__tests__/setup";
import { OrderEntity } from "../entities/OrderEntity";
import { OrderItemEntity } from "../entities/OrderItemEntity"; // 추가

describe("OrderRepositoryImpl Integration Test", () => {
  let orderRepository: OrderRepositoryImpl;

  beforeAll(() => {
    orderRepository = new OrderRepositoryImpl(
      AppDataSource.getRepository(OrderEntity)
    );
  });

  beforeEach(async () => {
    // 'orders' 테이블을 정리하면서, 이 테이블을 참조하는 'order_items' 같은
    // 자식 테이블의 데이터까지 연쇄적으로 모두 삭제하는 CASCADE 옵션을 사용합니다.
    // 이 방법이 순서를 신경 쓸 필요 없이 가장 확실합니다.
    await AppDataSource.query(
      'TRUNCATE TABLE "orders" RESTART IDENTITY CASCADE;'
    );
  });

  it("주문을 생성하고 데이터베이스에 저장해야 한다", async () => {
    const order = new Order({
      userId: "user-001",
      items: [
        new OrderItem({ productId: "prod-001", quantity: 1, price: 15000 }),
      ],
    });

    const savedOrder = await orderRepository.create(order);

    expect(savedOrder.id).toBeDefined();
    expect(savedOrder.totalAmount).toBe(15000);

    const foundOrder = await AppDataSource.getRepository(OrderEntity).findOneBy(
      { id: savedOrder.id }
    );
    expect(foundOrder).toBeDefined();
    expect(foundOrder?.userId).toBe("user-001");
  });
});
