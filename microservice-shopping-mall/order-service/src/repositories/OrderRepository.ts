import { Order } from "../entities/Order";

// OrderRepository는 인터페이스(규격) 역할만 합니다.
export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findByUserId(userId: string): Promise<Order[]>;
}
