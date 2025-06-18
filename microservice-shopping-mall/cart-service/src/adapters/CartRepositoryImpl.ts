// src/adapters/CartRepositoryImpl.ts (수정 버전)
import { Repository, DataSource } from "typeorm";
import { Cart } from "../entities/Cart";
import { CartRepository } from "../usecases/types";
import { CartEntity } from "./entities/CartEntity";
import { CartItemEntity } from "./entities/CartItemEntity";

export class CartRepositoryImpl implements CartRepository {
  private cartRepository: Repository<CartEntity>;
  private itemRepository: Repository<CartItemEntity>;

  constructor(private dataSource: DataSource) {
    this.cartRepository = dataSource.getRepository(CartEntity);
    this.itemRepository = dataSource.getRepository(CartItemEntity);
  }

  async save(cart: Cart): Promise<Cart> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 장바구니 저장/업데이트
      const cartEntity = CartEntity.fromDomain(cart);
      const savedCart = await queryRunner.manager.save(CartEntity, cartEntity);

      // 2. 기존 아이템들 삭제 (업데이트인 경우)
      if (cart.getId()) {
        await queryRunner.manager.delete(CartItemEntity, {
          cartId: cart.getId(),
        });
      }

      // 3. 새로운 아이템들 저장 (✅ 수정된 부분)
      const items = cart.getItems();
      if (items.length > 0) {
        const itemEntities = items.map((item) => {
          // ✅ 직접 CartItemEntity 생성하여 cartId 보장
          const itemEntity = new CartItemEntity();

          if (item.getId()) {
            itemEntity.id = item.getId()!;
          }
          itemEntity.cartId = savedCart.id; // ✅ 저장된 장바구니 ID 직접 설정
          itemEntity.productId = item.getProductId();
          itemEntity.quantity = item.getQuantity();
          itemEntity.price = item.getPrice();
          itemEntity.addedAt = item.getAddedAt();

          return itemEntity;
        });

        await queryRunner.manager.save(CartItemEntity, itemEntities);
      }

      await queryRunner.commitTransaction();

      // 4. 완전한 데이터로 다시 조회
      return (await this.findById(savedCart.id)) || cart;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      throw new Error(`장바구니 저장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<Cart | null> {
    try {
      // UUID 형식 검증
      if (!this.isValidUUID(id)) {
        return null;
      }

      const entity = await this.cartRepository.findOne({
        where: { id },
        relations: ["items"],
      });

      return entity ? entity.toDomain() : null;
    } catch (error: any) {
      throw new Error(`장바구니 조회 실패: ${error.message}`);
    }
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    try {
      // UUID 형식 검증
      if (!this.isValidUUID(userId)) {
        return null;
      }

      const entity = await this.cartRepository.findOne({
        where: { userId },
        relations: ["items"],
        order: { updatedAt: "DESC" }, // 최신 장바구니
      });

      return entity ? entity.toDomain() : null;
    } catch (error: any) {
      throw new Error(`사용자 장바구니 조회 실패: ${error.message}`);
    }
  }

  async findBySessionId(sessionId: string): Promise<Cart | null> {
    try {
      if (!sessionId) {
        return null;
      }

      const entity = await this.cartRepository.findOne({
        where: { sessionId },
        relations: ["items"],
        order: { updatedAt: "DESC" }, // 최신 장바구니
      });

      return entity ? entity.toDomain() : null;
    } catch (error: any) {
      throw new Error(`세션 장바구니 조회 실패: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      // UUID 형식 검증
      if (!this.isValidUUID(id)) {
        return; // 잘못된 ID면 조용히 무시
      }

      await this.cartRepository.delete(id);
    } catch (error: any) {
      throw new Error(`장바구니 삭제 실패: ${error.message}`);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      // UUID 형식 검증
      if (!this.isValidUUID(userId)) {
        return;
      }

      await this.cartRepository.delete({ userId });
    } catch (error: any) {
      throw new Error(`사용자 장바구니 삭제 실패: ${error.message}`);
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      if (!sessionId) {
        return;
      }

      await this.cartRepository.delete({ sessionId });
    } catch (error: any) {
      throw new Error(`세션 장바구니 삭제 실패: ${error.message}`);
    }
  }

  // UUID 형식 검증 헬퍼 메서드
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
