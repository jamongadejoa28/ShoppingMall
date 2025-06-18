// src/test-utils/TestUtils.ts
import { v4 as uuidv4 } from "uuid";

/**
 * 테스트 유틸리티 함수들
 */
export class TestUtils {
  /**
   * 테스트용 UUID 생성
   */
  static generateUUID(): string {
    return uuidv4();
  }

  /**
   * 테스트용 사용자 ID 생성 (실제 UUID)
   */
  static generateUserId(): string {
    return uuidv4();
  }

  /**
   * 테스트용 세션 ID 생성 (실제로는 문자열이지만 고유값)
   */
  static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 테스트용 상품 ID 생성 (실제 UUID)
   */
  static generateProductId(): string {
    return uuidv4();
  }

  /**
   * 랜덤 가격 생성
   */
  static generatePrice(min: number = 1000, max: number = 50000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 랜덤 수량 생성
   */
  static generateQuantity(min: number = 1, max: number = 10): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
