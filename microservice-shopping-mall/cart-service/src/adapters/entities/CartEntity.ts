// src/adapters/entities/CartEntity.ts (최종 수정 버전)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Cart } from "../../entities/Cart";
import { CartItemEntity } from "./CartItemEntity"; // ✅ 직접 import

@Entity("carts")
export class CartEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId?: string;

  @Column({ name: "session_id", type: "varchar", length: 255, nullable: true })
  sessionId?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // ✅ 관계 설정 개선 - eager loading으로 변경
  @OneToMany(() => CartItemEntity, (item) => item.cart, {
    cascade: true,
    eager: true, // ✅ lazy에서 eager로 변경
  })
  items!: CartItemEntity[];

  // ✅ Domain 객체로 변환 (동기적 처리)
  toDomain(): Cart {
    const cartItems = this.items?.map((item) => item.toDomain()) || [];

    return new Cart({
      id: this.id,
      // ✅ null을 undefined로 변환
      userId: this.userId || undefined,
      sessionId: this.sessionId || undefined,
      items: cartItems,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  // Domain 객체에서 변환
  static fromDomain(cart: Cart): CartEntity {
    const entity = new CartEntity();

    if (cart.getId()) {
      entity.id = cart.getId();
    }

    entity.userId = cart.getUserId();
    entity.sessionId = cart.getSessionId();
    entity.createdAt = cart.getCreatedAt();
    entity.updatedAt = cart.getUpdatedAt();

    // ✅ 아이템들은 Repository에서 별도 처리
    entity.items = [];

    return entity;
  }
}
