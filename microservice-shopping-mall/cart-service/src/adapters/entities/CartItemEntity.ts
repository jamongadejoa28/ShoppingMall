// src/adapters/entities/CartItemEntity.ts (관계 매핑 수정)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CartItem } from "../../entities/CartItem";
import { CartEntity } from "./CartEntity"; // ✅ 직접 import

@Entity("cart_items")
export class CartItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "cart_id", type: "uuid" })
  cartId!: string;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  price!: number;

  @CreateDateColumn({ name: "added_at" })
  addedAt!: Date;

  // ✅ 관계 설정 개선 - 직접 타입 참조
  @ManyToOne(() => CartEntity, (cart) => cart.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "cart_id" })
  cart!: CartEntity;

  // Domain 객체로 변환
  toDomain(): CartItem {
    return new CartItem({
      id: this.id,
      cartId: this.cartId,
      productId: this.productId,
      quantity: this.quantity,
      price: Number(this.price), // ✅ decimal to number 변환
      addedAt: this.addedAt,
    });
  }

  // Domain 객체에서 변환
  static fromDomain(item: CartItem): CartItemEntity {
    const entity = new CartItemEntity();

    if (item.getId()) {
      entity.id = item.getId()!;
    }

    entity.cartId = item.getCartId();
    entity.productId = item.getProductId();
    entity.quantity = item.getQuantity();
    entity.price = item.getPrice();
    entity.addedAt = item.getAddedAt();

    return entity;
  }
}
