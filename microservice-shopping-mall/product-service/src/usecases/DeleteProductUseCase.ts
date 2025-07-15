// ========================================
// Delete Product UseCase - 비즈니스 로직 계층
// src/usecases/DeleteProductUseCase.ts
// ========================================

import { injectable, inject } from "inversify";
import { TYPES } from "../infrastructure/di/types";
import { ProductRepository } from "./types";

/**
 * 상품 삭제 요청 데이터
 */
export interface DeleteProductRequest {
  productId: string;
}

/**
 * 상품 삭제 응답 데이터
 */
export interface DeleteProductResponse {
  success: boolean;
}

/**
 * 상품 삭제 UseCase
 * 
 * 책임:
 * - 상품 삭제 비즈니스 로직 처리
 * - 상품 존재 여부 검증
 * - 소프트 삭제 처리 (물리적 삭제 대신 isActive = false)
 * - 관련 데이터 정리 (필요시)
 */
@injectable()
export class DeleteProductUseCase {
  constructor(
    @inject(TYPES.ProductRepository)
    private productRepository: ProductRepository
  ) {}

  /**
   * 상품 삭제 실행
   */
  async execute(request: DeleteProductRequest): Promise<DeleteProductResponse> {
    try {
      console.log('[DeleteProductUseCase] 상품 삭제 시작:', request.productId);

      // 상품 ID 유효성 검증
      if (!request.productId || request.productId.trim() === '') {
        throw new Error('상품 ID가 제공되지 않았습니다');
      }

      // 상품 존재 여부 확인
      const existingProduct = await this.productRepository.findById(request.productId);
      if (!existingProduct) {
        throw new Error('삭제할 상품을 찾을 수 없습니다');
      }

      // 이미 삭제된 상품인지 확인
      if (!existingProduct.isActive) {
        console.log('[DeleteProductUseCase] 이미 삭제된 상품:', request.productId);
        return { success: true };
      }

      // 삭제 가능 여부 검증
      await this.validateCanDelete(request.productId);

      // Repository를 통해 상품 삭제 (소프트 삭제)
      await this.productRepository.delete(request.productId);

      console.log('[DeleteProductUseCase] 상품 삭제 완료:', request.productId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('[DeleteProductUseCase] 상품 삭제 실패:', error);
      throw error; // 에러를 그대로 전파하여 Controller에서 적절한 HTTP 상태 코드 설정
    }
  }

  /**
   * 상품 삭제 가능 여부 검증
   * 
   * 비즈니스 규칙:
   * - 진행 중인 주문에 포함된 상품은 삭제할 수 없음
   * - 장바구니에 담긴 상품은 삭제 가능 (삭제 시 장바구니에서 자동 제거)
   * 
   * 주의: 현재는 Order Service와의 연동이 없으므로 기본 검증만 수행
   */
  private async validateCanDelete(productId: string): Promise<void> {
    try {
      // TODO: 향후 Order Service와 연동하여 주문 상태 확인
      // 예시:
      // const activeOrders = await this.orderService.getActiveOrdersByProductId(productId);
      // if (activeOrders.length > 0) {
      //   throw new Error('진행 중인 주문에 포함된 상품은 삭제할 수 없습니다');
      // }

      // 현재는 기본적인 검증만 수행
      console.log('[DeleteProductUseCase] 상품 삭제 가능 - 기본 검증 완료');
      
      // TODO: 향후 추가할 검증 로직:
      // 1. 주문 내역 확인
      // 2. 예약된 재고 확인
      // 3. 프로모션/이벤트 연결 상태 확인
      
    } catch (error) {
      // 외부 서비스 연동 에러는 경고 로그만 남기고 삭제 허용
      console.warn('[DeleteProductUseCase] 삭제 가능 여부 검증 중 경고:', error);
    }
  }
}