// src/entities/Order.ts
import { OrderItem } from "./OrderItem";

export enum OrderStatus {
  PREPARING = "상품 준비중",
  SHIPPED = "배송 시작",
  DELIVERING = "배송중",
  DELIVERED = "배송 완료",
}

// 상태 전이 규칙
const StatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERING],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
};

export class Order {
  readonly id?: string;
  readonly userId: string;
  readonly items: OrderItem[];
  readonly totalAmount: number;
  status: OrderStatus;
  readonly createdAt?: Date;

  constructor(props: {
    id?: string;
    userId: string;
    items: OrderItem[];
    status?: OrderStatus;
    createdAt?: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.items = props.items;
    this.totalAmount = this.calculateTotal();
    this.status = props.status || OrderStatus.PREPARING;
    this.createdAt = props.createdAt || new Date();
  }

  private calculateTotal(): number {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  public updateStatus(newStatus: OrderStatus): void {
    const allowedTransitions = StatusTransitions[this.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error("Invalid status transition");
    }
    this.status = newStatus;
  }
}
