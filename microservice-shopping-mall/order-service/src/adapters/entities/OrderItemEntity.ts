import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { OrderEntity } from "./OrderEntity";

@Entity("order_items")
export class OrderItemEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: string;

  @Column()
  quantity!: number;

  @Column()
  price!: number;

  @ManyToOne(() => OrderEntity, (order) => order.items)
  order!: OrderEntity;
}
