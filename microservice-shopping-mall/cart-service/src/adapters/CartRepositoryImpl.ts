// cart-service/src/adapters/CartRepositoryImpl.ts
// ========================================

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
    try {
      const entity = CartEntity.fromDomain(cart);
      const savedEntity = await this.cartRepository.save(entity);

      // 관계 데이터까지 포함해서 다시 조회
      const fullEntity = await this.cartRepository.findOne({
        where: { id: savedEntity.id },
        relations: ["items"],
      });

      return fullEntity!.toDomain();
    } catch (error: any) {
      throw new Error(`장바구니 저장 실패: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Cart | null> {
    try {
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
      await this.cartRepository.delete(id);
    } catch (error: any) {
      throw new Error(`장바구니 삭제 실패: ${error.message}`);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      await this.cartRepository.delete({ userId });
    } catch (error: any) {
      throw new Error(`사용자 장바구니 삭제 실패: ${error.message}`);
    }
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      await this.cartRepository.delete({ sessionId });
    } catch (error: any) {
      throw new Error(`세션 장바구니 삭제 실패: ${error.message}`);
    }
  }
}
