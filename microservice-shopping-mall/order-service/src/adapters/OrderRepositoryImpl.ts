import { Repository } from "typeorm";
import { OrderRepository } from "../repositories/OrderRepository";
import { Order, OrderStatus } from "../entities/Order";
import { OrderItem } from "../entities/OrderItem";
import { OrderEntity } from "./entities/OrderEntity";
import { OrderItemEntity } from "./entities/OrderItemEntity";

export class OrderRepositoryImpl implements OrderRepository {
  constructor(private readonly ormRepository: Repository<OrderEntity>) {}

  private toDomain(entity: OrderEntity): Order {
    const domainItems =
      entity.items?.map(
        (item) =>
          new OrderItem({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })
      ) || [];

    return new Order({
      id: entity.id,
      userId: entity.userId,
      items: domainItems,
      // totalAmount: entity.totalAmount, // 이 줄을 삭제합니다.
      status: entity.status as OrderStatus,
      createdAt: entity.createdAt,
    });
  }

  async create(order: Order): Promise<Order> {
    const orderEntity = this.ormRepository.create({
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items.map((item: OrderItem) => {
        const itemEntity = new OrderItemEntity();
        itemEntity.productId = item.productId;
        itemEntity.quantity = item.quantity;
        itemEntity.price = item.price;
        return itemEntity;
      }),
    });

    const savedEntity = await this.ormRepository.save(orderEntity);
    return this.toDomain(savedEntity);
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const orderEntities = await this.ormRepository.find({
      where: { userId },
      relations: ["items"],
      order: { createdAt: "DESC" },
    });
    return orderEntities.map(this.toDomain);
  }
}
