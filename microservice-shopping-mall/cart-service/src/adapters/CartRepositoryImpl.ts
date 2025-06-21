// ========================================
// 완전 수동 처리 CartRepositoryImpl.ts - TypeORM 관계 매핑 제거
// cart-service/src/adapters/CartRepositoryImpl.ts
// ========================================

import { Repository, DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";
import { CartRepository } from "../usecases/types";
import { CartEntity } from "./entities/CartEntity";
import { CartItemEntity } from "./entities/CartItemEntity";
import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";

@injectable()
export class CartRepositoryImpl implements CartRepository {
  private cartRepository: Repository<CartEntity>;
  private itemRepository: Repository<CartItemEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.cartRepository = dataSource.getRepository(CartEntity);
    this.itemRepository = dataSource.getRepository(CartItemEntity);
  }

  async save(cart: Cart): Promise<Cart> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ✅ 1단계: Cart만 저장 (아이템 제외)
      const cartEntity = CartEntity.fromDomain(cart);

      // ✅ transferToUser 시 sessionId를 명시적으로 null 처리
      if (cart.isPersisted() && cart.getUserId() && !cart.getSessionId()) {
        await queryRunner.manager.query(
          "UPDATE carts SET user_id = $1, session_id = NULL, updated_at = NOW() WHERE id = $2",
          [cart.getUserId(), cart.getId()]
        );
      }

      const savedCartEntity = await queryRunner.manager.save(
        CartEntity,
        cartEntity
      );

      // ✅ 2단계: 기존 아이템들 삭제 (업데이트인 경우)
      if (cart.isPersisted()) {
        await queryRunner.manager.query(
          "DELETE FROM cart_items WHERE cart_id = $1",
          [savedCartEntity.id]
        );
      }

      // ✅ 3단계: 새로운 아이템들을 raw SQL로 삽입
      const items = cart.getItems();
      for (const item of items) {
        await queryRunner.manager.query(
          `
          INSERT INTO cart_items (id, cart_id, product_id, quantity, price, added_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [
            uuidv4(),
            savedCartEntity.id,
            item.getProductId(),
            item.getQuantity(),
            item.getPrice(),
            item.getAddedAt(),
          ]
        );
      }

      await queryRunner.commitTransaction();

      // ✅ 4단계: 저장된 데이터 다시 조회해서 반환
      const result = await this.findById(savedCartEntity.id);
      if (result) {
        result.markAsPersisted();
        return result;
      }

      cart.markAsPersisted();
      return cart;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ [CartRepository] 저장 오류:", error);
      throw new Error(`장바구니 저장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Cart | null> {
    try {
      if (!id || !this.isValidUUID(id)) {
        return null;
      }

      // ✅ Cart와 CartItem을 별도로 조회
      const cartEntity = await this.cartRepository.findOne({
        where: { id },
      });

      if (!cartEntity) {
        return null;
      }

      // ✅ 아이템들을 별도 쿼리로 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: id },
      });

      // ✅ Domain 객체로 변환
      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 조회 오류:", error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    try {
      if (!userId || !this.isValidUUID(userId)) {
        return null;
      }

      const cartEntity = await this.cartRepository.findOne({
        where: { userId },
        order: { updatedAt: "DESC" },
      });

      if (!cartEntity) {
        return null;
      }

      // 아이템들 별도 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: cartEntity.id },
      });

      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 사용자 조회 오류:", error);
      return null;
    }
  }

  async findBySessionId(sessionId: string): Promise<Cart | null> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        return null;
      }

      const cartEntity = await this.cartRepository.findOne({
        where: { sessionId },
        order: { updatedAt: "DESC" },
      });

      if (!cartEntity) {
        return null;
      }

      // 아이템들 별도 조회
      const itemEntities = await this.itemRepository.find({
        where: { cartId: cartEntity.id },
      });

      const cartItems = itemEntities.map((item) => item.toDomain());

      return new Cart({
        id: cartEntity.id,
        userId: cartEntity.userId || undefined,
        sessionId: cartEntity.sessionId || undefined,
        items: cartItems,
        createdAt: cartEntity.createdAt,
        updatedAt: cartEntity.updatedAt,
      });
    } catch (error: any) {
      console.error("❌ [CartRepository] 세션 조회 오류:", error);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id || !this.isValidUUID(id)) {
        return;
      }
      // CASCADE 설정으로 인해 cart_items도 자동 삭제됨
      await this.cartRepository.delete(id);
    } catch (error: any) {
      console.error("❌ [CartRepository] 삭제 오류:", error);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      if (!userId || !this.isValidUUID(userId)) {
        return;
      }
      await this.cartRepository.delete({ userId });
    } catch (error: any) {
      console.error("❌ [CartRepository] 사용자 삭제 오류:", error);
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      if (!sessionId || sessionId.trim().length === 0) {
        return;
      }
      await this.cartRepository.delete({ sessionId });
    } catch (error: any) {
      console.error("❌ [CartRepository] 세션 삭제 오류:", error);
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
