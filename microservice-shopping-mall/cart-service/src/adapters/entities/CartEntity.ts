// cart-service/src/adapters/entities/CartEntity.ts (수정 버전)
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Cart } from "../../entities/Cart";
import { CartItem } from "../../entities/CartItem";

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

  // ✅ 순환 참조 해결: lazy loading 사용
  @OneToMany(() => require("./CartItemEntity").CartItemEntity, "cart", {
    cascade: true,
    lazy: true,
  })
  items!: Promise<any[]> | any[];

  // Domain 객체로 변환
  toDomain(): Cart {
    // items가 Promise인 경우와 배열인 경우 모두 처리
    const itemsArray = Array.isArray(this.items) ? this.items : [];
    const cartItems = itemsArray.map((item: any) => item.toDomain());

    return new Cart({
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
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

    // 아이템들은 Repository에서 별도 처리
    entity.items = [];

    return entity;
  }
}
