// cart-service/src/adapters/entities/CartItemEntity.ts (수정 버전)
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CartItem } from "../../entities/CartItem";

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

  // ✅ 순환 참조 해결: lazy loading 사용
  @ManyToOne(() => require("./CartEntity").CartEntity, "items", {
    onDelete: "CASCADE",
    lazy: true,
  })
  @JoinColumn({ name: "cart_id" })
  cart!: Promise<any> | any;

  // Domain 객체로 변환
  toDomain(): CartItem {
    return new CartItem({
      id: this.id,
      cartId: this.cartId,
      productId: this.productId,
      quantity: this.quantity,
      price: this.price,
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
