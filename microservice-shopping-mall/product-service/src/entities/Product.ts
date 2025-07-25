// ========================================
// Product Entity - Domain 계층
// src/entities/Product.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * Product 생성 데이터 인터페이스
 */
export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  brand: string;
  sku: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  discountPrice?: number;
}

/**
 * Product 복원 데이터 인터페이스
 */
export interface RestoreProductData extends CreateProductData {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product 업데이트 데이터 인터페이스
 */
export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  brand?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
}

/**
 * Product 요약 정보 인터페이스
 */
export interface ProductSummary {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  brand: string;
  isActive: boolean;
  hasDiscount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product Entity - 상품 도메인 객체
 *
 * 책임:
 * 1. 상품 정보 관리 (이름, 설명, 가격, 브랜드 등)
 * 2. 상품 상태 관리 (활성/비활성)
 * 3. 할인 가격 관리
 * 4. 상품 검색 및 필터링 지원
 * 5. 비즈니스 규칙 검증
 * 6. 도메인 로직 수행
 */
export class Product {
  private constructor(
    private readonly id: string,
    private name: string,
    private description: string,
    private price: number,
    private readonly categoryId: string,
    private brand: string,
    private readonly sku: string,
    private weight?: number,
    private dimensions?: {
      width: number;
      height: number;
      depth: number;
    },
    private tags: string[] = [],
    private _isActive: boolean = true,
    private discountPrice?: number,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 새로운 Product 생성
   */
  static create(data: CreateProductData): Product {
    // 1. 입력 데이터 검증
    Product.validateCreateData(data);

    // 2. Product 인스턴스 생성
    const now = new Date();
    return new Product(
      uuidv4(),
      data.name.trim(),
      data.description.trim(),
      data.price,
      data.categoryId.trim(),
      data.brand.trim(),
      data.sku.trim().toUpperCase(),
      data.weight,
      data.dimensions,
      data.tags || [],
      true, // 기본적으로 활성 상태 (_isActive)
      data.discountPrice,
      now,
      now
    );
  }

  /**
   * 기존 Product 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreProductData): Product {
    // 기본 검증만 수행 (DB 데이터는 이미 검증된 것으로 가정)
    if (!data.id || !data.name || !data.sku) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new Product(
      data.id,
      data.name,
      data.description,
      data.price,
      data.categoryId,
      data.brand,
      data.sku,
      data.weight,
      data.dimensions,
      data.tags || [],
      data.isActive,
      data.discountPrice,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(data: CreateProductData): void {
    // 상품명 검증
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("상품명은 필수입니다");
    }
    if (data.name.trim().length > 200) {
      throw new Error("상품명은 200자를 초과할 수 없습니다");
    }

    // 가격 검증
    if (!data.price || data.price <= 0) {
      throw new Error("가격은 0보다 커야 합니다");
    }

    // SKU 검증 (영문, 숫자, 하이픈만 허용)
    if (!data.sku || !data.sku.trim()) {
      throw new Error("SKU는 필수입니다");
    }
    const skuPattern = /^[A-Za-z0-9\-]+$/;
    if (!skuPattern.test(data.sku.trim())) {
      throw new Error("SKU는 영문, 숫자, 하이픈만 허용됩니다");
    }

    // 브랜드명 검증
    if (!data.brand || data.brand.trim().length === 0) {
      throw new Error("브랜드명은 필수입니다");
    }
    if (data.brand.trim().length > 100) {
      throw new Error("브랜드명은 100자를 초과할 수 없습니다");
    }

    // 카테고리 ID 검증
    if (!data.categoryId || data.categoryId.trim().length === 0) {
      throw new Error("카테고리 ID는 필수입니다");
    }

    // 설명 검증
    if (!data.description || data.description.trim().length === 0) {
      throw new Error("상품 설명은 필수입니다");
    }
  }

  // ========================================
  // Getter 메서드
  // ========================================

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPrice(): number {
    return this.price;
  }

  getCategoryId(): string {
    return this.categoryId;
  }

  getBrand(): string {
    return this.brand;
  }

  getSku(): string {
    return this.sku;
  }

  getWeight(): number | undefined {
    return this.weight;
  }

  getDimensions():
    | { width: number; height: number; depth: number }
    | undefined {
    return this.dimensions;
  }

  getTags(): string[] {
    return [...this.tags]; // 복사본 반환
  }

  isActive(): boolean {
    return this._isActive;
  }

  getDiscountPrice(): number | undefined {
    return this.discountPrice;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 비즈니스 로직 메서드
  // ========================================

  /**
   * 실제 판매 가격 반환 (할인가가 있으면 할인가, 없으면 정가)
   */
  getEffectivePrice(): number {
    return this.discountPrice ?? this.price;
  }

  /**
   * 할인 여부 확인
   */
  hasDiscount(): boolean {
    return this.discountPrice !== undefined && this.discountPrice < this.price;
  }

  /**
   * 상품 활성화
   */
  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * 상품 비활성화
   */
  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * 상품 정보 업데이트
   */
  updateDetails(data: UpdateProductData): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("상품명은 필수입니다");
      }
      if (data.name.trim().length > 200) {
        throw new Error("상품명은 200자를 초과할 수 없습니다");
      }
      this.name = data.name.trim();
    }

    if (data.description !== undefined) {
      if (data.description.trim().length === 0) {
        throw new Error("상품 설명은 필수입니다");
      }
      this.description = data.description.trim();
    }

    if (data.price !== undefined) {
      if (data.price <= 0) {
        throw new Error("가격은 0보다 커야 합니다");
      }
      this.price = data.price;
    }

    if (data.brand !== undefined) {
      if (data.brand.trim().length === 0) {
        throw new Error("브랜드명은 필수입니다");
      }
      if (data.brand.trim().length > 100) {
        throw new Error("브랜드명은 100자를 초과할 수 없습니다");
      }
      this.brand = data.brand.trim();
    }

    if (data.weight !== undefined) {
      this.weight = data.weight;
    }

    if (data.dimensions !== undefined) {
      this.dimensions = { ...data.dimensions };
    }

    if (data.tags !== undefined) {
      this.tags = [...data.tags];
    }

    this.updatedAt = new Date();
  }

  /**
   * 할인 가격 설정
   */
  setDiscountPrice(discountPrice: number): void {
    if (discountPrice >= this.price) {
      throw new Error("할인 가격은 원가보다 낮아야 합니다");
    }
    if (discountPrice <= 0) {
      throw new Error("할인 가격은 0보다 커야 합니다");
    }

    this.discountPrice = discountPrice;
    this.updatedAt = new Date();
  }

  /**
   * 할인 제거
   */
  removeDiscount(): void {
    this.discountPrice = undefined;
    this.updatedAt = new Date();
  }

  // ========================================
  // 검색 및 필터링 메서드
  // ========================================

  /**
   * 검색 쿼리 매치 여부 확인
   */
  matchesSearchQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const searchableText = [
      this.name.toLowerCase(),
      this.description.toLowerCase(),
      this.brand.toLowerCase(),
      ...this.tags.map((tag) => tag.toLowerCase()),
    ].join(" ");

    return searchableText.includes(lowerQuery);
  }

  /**
   * 가격 범위 필터링
   */
  isInPriceRange(minPrice: number, maxPrice: number): boolean {
    const effectivePrice = this.getEffectivePrice();
    return effectivePrice >= minPrice && effectivePrice <= maxPrice;
  }

  /**
   * 브랜드 매치 여부 확인
   */
  matchesBrand(brand: string): boolean {
    return this.brand.toLowerCase() === brand.toLowerCase();
  }

  // ========================================
  // 도메인 규칙 메서드
  // ========================================

  /**
   * 판매 가능 여부 확인
   */
  isAvailableForSale(): boolean {
    return this._isActive;
  }

  /**
   * SEO 친화적 슬러그 생성
   */
  generateSlug(): string {
    return this.name
      .toLowerCase()
      .replace(/[^\w\s가-힣-]/g, "") // 특수문자 제거 (한글 포함)
      .replace(/\s+/g, "-") // 공백을 하이픈으로
      .trim();
  }

  /**
   * 상품 요약 정보 반환
   */
  getSummary(): ProductSummary {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      effectivePrice: this.getEffectivePrice(),
      brand: this.brand,
      isActive: this._isActive,
      hasDiscount: this.hasDiscount(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ========================================
  // 도메인 이벤트 (향후 확장용)
  // ========================================

  /**
   * 상품이 생성될 때 발생하는 도메인 이벤트
   */
  getCreatedEvent() {
    return {
      type: "ProductCreated",
      productId: this.id,
      productName: this.name,
      categoryId: this.categoryId,
      price: this.price,
      brand: this.brand,
      createdAt: this.createdAt,
    };
  }

  /**
   * 상품 정보가 업데이트될 때 발생하는 도메인 이벤트
   */
  getUpdatedEvent() {
    return {
      type: "ProductUpdated",
      productId: this.id,
      productName: this.name,
      price: this.price,
      effectivePrice: this.getEffectivePrice(),
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 상품이 비활성화될 때 발생하는 도메인 이벤트
   */
  getDeactivatedEvent() {
    return {
      type: "ProductDeactivated",
      productId: this.id,
      productName: this.name,
      deactivatedAt: this.updatedAt,
    };
  }
}
