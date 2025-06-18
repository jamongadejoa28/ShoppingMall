// ========================================
// Cart Entity 수정 버전 - UUID 자동 생성
// cart-service/src/entities/Cart.ts
// ========================================

import { CartItem } from "./CartItem";
import { v4 as uuidv4 } from "uuid";

/**
 * Cart Domain Entity (수정 버전)
 *
 * 주요 변경사항:
 * - Cart 생성시 자동으로 UUID 생성
 * - addItem시 항상 유효한 cartId 보장
 */

export interface CartData {
  id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export class Cart {
  private id: string; // ✅ Optional 제거, 항상 존재
  private userId?: string;
  private sessionId?: string;
  private items: CartItem[];
  private createdAt: Date;
  private updatedAt: Date;

  constructor(data: CartData) {
    // 도메인 규칙: userId 또는 sessionId 중 하나는 반드시 있어야 함
    if (!data.userId && !data.sessionId) {
      throw new Error("userId 또는 sessionId 중 하나는 반드시 있어야 합니다");
    }

    // ✅ ID가 없으면 자동 생성
    this.id = data.id || uuidv4();
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.items = data.items || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // ========================================
  // Factory Methods (수정 버전)
  // ========================================

  /**
   * 비로그인 사용자용 장바구니 생성
   */
  static createForSession(sessionId: string): Cart {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("세션 ID는 필수입니다");
    }

    return new Cart({
      id: uuidv4(), // ✅ 명시적으로 UUID 생성
      sessionId: sessionId.trim(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * 로그인 사용자용 장바구니 생성
   */
  static createForUser(userId: string): Cart {
    if (!userId || userId.trim() === "") {
      throw new Error("사용자 ID는 필수입니다");
    }

    return new Cart({
      id: uuidv4(), // ✅ 명시적으로 UUID 생성
      userId: userId.trim(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ========================================
  // Core Business Logic - 상품 관리 (수정 버전)
  // ========================================

  /**
   * 상품을 장바구니에 추가
   * 같은 상품이 있으면 수량 증가, 없으면 새로 추가
   */
  addItem(productId: string, quantity: number, price: number): void {
    this.validateProductInput(productId, quantity, price);

    const existingItem = this.findItem(productId);

    if (existingItem) {
      // 기존 상품 수량 증가
      existingItem.increaseQuantity(quantity);
    } else {
      // ✅ 새로운 상품 추가 - 이제 cartId가 항상 존재
      const newItem = new CartItem({
        cartId: this.id, // ✅ 항상 유효한 UUID
        productId,
        quantity,
        price,
        addedAt: new Date(),
      });
      this.items.push(newItem);
    }

    this.touch(); // 업데이트 시간 갱신
  }

  /**
   * 장바구니에서 상품 제거
   */
  removeItem(productId: string): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    const itemIndex = this.items.findIndex(
      (item) => item.getProductId() === productId
    );

    if (itemIndex === -1) {
      throw new Error("해당 상품이 장바구니에 없습니다");
    }

    this.items.splice(itemIndex, 1);
    this.touch();
  }

  /**
   * 상품 수량 변경
   * 수량이 0이면 상품 제거
   */
  updateItemQuantity(productId: string, quantity: number): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    if (quantity < 0) {
      throw new Error("수량은 0 이상이어야 합니다");
    }

    // 수량이 0이면 상품 제거
    if (quantity === 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.findItem(productId);
    if (!item) {
      throw new Error("해당 상품이 장바구니에 없습니다");
    }

    item.updateQuantity(quantity);
    this.touch();
  }

  // ========================================
  // 장바구니 이전 및 병합 (기존과 동일)
  // ========================================

  /**
   * 세션 장바구니를 사용자 장바구니로 이전 (로그인 시)
   */
  transferToUser(userId: string): void {
    if (!userId || userId.trim() === "") {
      throw new Error("사용자 ID는 필수입니다");
    }

    if (this.userId) {
      throw new Error("이미 사용자 장바구니입니다");
    }

    this.userId = userId.trim();
    this.sessionId = undefined;
    this.touch();
  }

  /**
   * 다른 장바구니와 병합
   * 같은 상품은 수량 증가, 새로운 상품은 추가
   */
  mergeWith(otherCart: Cart): void {
    for (const otherItem of otherCart.getItems()) {
      const existingItem = this.findItem(otherItem.getProductId());

      if (existingItem) {
        // 기존 상품 수량 증가
        existingItem.increaseQuantity(otherItem.getQuantity());
      } else {
        // ✅ 새로운 상품 추가 - cartId 업데이트
        const newItem = new CartItem({
          cartId: this.id, // ✅ 현재 장바구니의 ID 사용
          productId: otherItem.getProductId(),
          quantity: otherItem.getQuantity(),
          price: otherItem.getPrice(),
          addedAt: new Date(),
        });
        this.items.push(newItem);
      }
    }

    this.touch();
  }

  /**
   * 장바구니 비우기
   */
  clear(): void {
    this.items = [];
    this.touch();
  }

  // ========================================
  // Query Methods - 조회 로직 (기존과 동일)
  // ========================================

  /**
   * 특정 상품 아이템 찾기
   */
  findItem(productId: string): CartItem | undefined {
    return this.items.find((item) => item.getProductId() === productId);
  }

  /**
   * 특정 상품이 장바구니에 있는지 확인
   */
  hasItem(productId: string): boolean {
    return this.findItem(productId) !== undefined;
  }

  /**
   * 특정 상품의 수량 조회
   */
  getItemQuantity(productId: string): number {
    const item = this.findItem(productId);
    return item ? item.getQuantity() : 0;
  }

  /**
   * 장바구니 총 금액 계산
   */
  getTotalAmount(): number {
    return this.items.reduce((total, item) => total + item.getSubtotal(), 0);
  }

  /**
   * 장바구니 총 아이템 수량 계산
   */
  getTotalItems(): number {
    return this.items.reduce((total, item) => total + item.getQuantity(), 0);
  }

  /**
   * 장바구니 상품 종류 수
   */
  getUniqueItemCount(): number {
    return this.items.length;
  }

  /**
   * 장바구니가 비어있는지 확인
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // ========================================
  // Getters (수정 버전)
  // ========================================

  getId(): string {
    // ✅ Optional 제거
    return this.id;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getItems(): CartItem[] {
    return [...this.items]; // 불변성 보장
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.updatedAt);
  }

  // ========================================
  // Internal Helpers (기존과 동일)
  // ========================================

  /**
   * 상품 입력값 검증
   */
  private validateProductInput(
    productId: string,
    quantity: number,
    price: number
  ): void {
    if (!productId || productId.trim() === "") {
      throw new Error("상품 ID는 필수입니다");
    }

    if (quantity <= 0) {
      throw new Error("수량은 1 이상이어야 합니다");
    }

    if (price <= 0) {
      throw new Error("가격은 0보다 커야 합니다");
    }
  }

  /**
   * 업데이트 시간 갱신
   */
  private touch(): void {
    this.updatedAt = new Date();
  }

  // ========================================
  // Domain Events (기존과 동일)
  // ========================================

  /**
   * 장바구니 요약 정보 생성 (로깅, 이벤트용)
   */
  getSummary(): {
    id: string; // ✅ Optional 제거
    userId?: string;
    sessionId?: string;
    totalItems: number;
    totalAmount: number;
    uniqueItemCount: number;
    isEmpty: boolean;
  } {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      totalItems: this.getTotalItems(),
      totalAmount: this.getTotalAmount(),
      uniqueItemCount: this.getUniqueItemCount(),
      isEmpty: this.isEmpty(),
    };
  }

  /**
   * 장바구니 데이터 직렬화 (API 응답용)
   */
  toJSON(): CartData & {
    totalItems: number;
    totalAmount: number;
    uniqueItemCount: number;
    isEmpty: boolean;
  } {
    return {
      id: this.id,
      userId: this.userId,
      sessionId: this.sessionId,
      items: this.items,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      totalItems: this.getTotalItems(),
      totalAmount: this.getTotalAmount(),
      uniqueItemCount: this.getUniqueItemCount(),
      isEmpty: this.isEmpty(),
    };
  }
}
