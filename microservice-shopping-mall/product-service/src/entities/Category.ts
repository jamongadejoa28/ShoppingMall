// ========================================
// Category Entity - Domain 계층
// src/entities/Category.ts
// ========================================

import { v4 as uuidv4 } from "uuid";

/**
 * Category 생성 데이터 인터페이스 (루트 카테고리)
 */
export interface CreateRootCategoryData {
  name: string;
  description: string;
  slug: string;
}

/**
 * Category 생성 데이터 인터페이스 (하위 카테고리)
 */
export interface CreateChildCategoryData {
  name: string;
  description: string;
  slug: string;
  parentId: string;
}

/**
 * Category 복원 데이터 인터페이스
 */
export interface RestoreCategoryData {
  id: string;
  name: string;
  description: string;
  slug: string;
  parentId: string | null;
  depth: number;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category 업데이트 데이터 인터페이스
 */
export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

/**
 * Category 요약 정보 인터페이스
 */
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  productCount: number;
  isActive: boolean;
  isRoot: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SEO 정보 인터페이스
 */
export interface CategorySEOInfo {
  title: string;
  description: string;
  keywords: string;
  slug: string;
}

/**
 * Category Entity - 카테고리 도메인 객체
 *
 * 책임:
 * 1. 계층형 카테고리 구조 관리 (parent-child 관계)
 * 2. 카테고리 경로 및 깊이 관리
 * 3. 카테고리 상태 관리 (활성/비활성)
 * 4. 상품 개수 추적
 * 5. 검색 및 필터링 지원
 * 6. SEO 최적화 정보 제공
 * 7. 비즈니스 규칙 검증
 */
export class Category {
  private static readonly MAX_DEPTH = 4; // 최대 5단계 (0-4)
  private static readonly MAX_NAME_LENGTH = 100;
  private static readonly SLUG_PATTERN = /^[a-zA-Z0-9\-]+$/;

  private constructor(
    private readonly id: string,
    private name: string,
    private description: string,
    private readonly slug: string,
    private readonly parentId: string | null,
    private readonly depth: number,
    private _isActive: boolean = true,
    private productCount: number = 0,
    private readonly createdAt: Date = new Date(),
    private updatedAt: Date = new Date()
  ) {}

  // ========================================
  // 정적 팩토리 메서드
  // ========================================

  /**
   * 루트 카테고리 생성
   */
  static createRoot(data: CreateRootCategoryData): Category {
    // 1. 입력 데이터 검증
    Category.validateCreateData(data);

    // 2. 루트 카테고리 생성
    const now = new Date();
    return new Category(
      uuidv4(),
      data.name.trim(),
      data.description.trim(),
      data.slug.trim().toLowerCase(),
      null, // 루트 카테고리는 부모가 없음
      0, // 루트 카테고리 깊이는 0
      true,
      0,
      now,
      now
    );
  }

  /**
   * 하위 카테고리 생성
   */
  static createChild(
    data: CreateChildCategoryData,
    parentDepth: number = 0
  ): Category {
    // 1. 입력 데이터 검증
    Category.validateCreateData(data);

    // 2. 깊이 검증
    const childDepth = parentDepth + 1;
    if (childDepth > Category.MAX_DEPTH) {
      throw new Error(
        `카테고리 깊이는 ${Category.MAX_DEPTH}를 초과할 수 없습니다`
      );
    }

    // 3. 부모 ID 검증
    if (!data.parentId || data.parentId.trim().length === 0) {
      throw new Error("하위 카테고리는 부모 ID가 필요합니다");
    }

    // 4. 하위 카테고리 생성
    const now = new Date();
    return new Category(
      uuidv4(),
      data.name.trim(),
      data.description.trim(),
      data.slug.trim().toLowerCase(),
      data.parentId.trim(),
      childDepth,
      true,
      0,
      now,
      now
    );
  }

  /**
   * 기존 Category 복원 (DB에서 불러올 때)
   */
  static restore(data: RestoreCategoryData): Category {
    // 기본 검증만 수행
    if (!data.id || !data.name || !data.slug) {
      throw new Error("필수 필드가 누락되었습니다");
    }

    return new Category(
      data.id,
      data.name,
      data.description,
      data.slug,
      data.parentId,
      data.depth,
      data.isActive,
      data.productCount,
      data.createdAt,
      data.updatedAt
    );
  }

  // ========================================
  // 유효성 검증 메서드
  // ========================================

  private static validateCreateData(
    data: CreateRootCategoryData | CreateChildCategoryData
  ): void {
    // 카테고리명 검증
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("카테고리명은 필수입니다");
    }
    if (data.name.trim().length > Category.MAX_NAME_LENGTH) {
      throw new Error(
        `카테고리명은 ${Category.MAX_NAME_LENGTH}자를 초과할 수 없습니다`
      );
    }

    // 설명 검증
    if (!data.description || data.description.trim().length === 0) {
      throw new Error("카테고리 설명은 필수입니다");
    }

    // 슬러그 검증
    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error("슬러그는 필수입니다");
    }
    if (!Category.SLUG_PATTERN.test(data.slug.trim())) {
      throw new Error("슬러그는 영문, 숫자, 하이픈만 허용됩니다");
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

  getSlug(): string {
    return this.slug;
  }

  getParentId(): string | null {
    return this.parentId;
  }

  getDepth(): number {
    return this.depth;
  }

  isActive(): boolean {
    return this._isActive;
  }

  getProductCount(): number {
    return this.productCount;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // ========================================
  // 계층 구조 관리 메서드
  // ========================================

  /**
   * 루트 카테고리 여부 확인
   */
  isRoot(): boolean {
    return this.parentId === null && this.depth === 0;
  }

  /**
   * 리프 카테고리 여부 확인 (하위 카테고리가 없는 카테고리)
   */
  isLeaf(hasChildren: boolean): boolean {
    return !hasChildren;
  }

  /**
   * 특정 깊이에 있는지 확인
   */
  isAtDepth(targetDepth: number): boolean {
    return this.depth === targetDepth;
  }

  /**
   * 카테고리 경로 생성 (예: "전자제품 > 컴퓨터 > 노트북")
   */
  generatePath(categoryPath: Category[]): string {
    return categoryPath.map((cat) => cat.getName()).join(" > ");
  }

  /**
   * 전체 슬러그 경로 생성 (예: "electronics/computers/laptops")
   */
  generateFullSlug(parentSlugs: string[]): string {
    return [...parentSlugs, this.slug].join("/");
  }

  // ========================================
  // 상태 관리 메서드
  // ========================================

  /**
   * 카테고리 활성화
   */
  activate(): void {
    this._isActive = true;
    this.updatedAt = new Date();
  }

  /**
   * 카테고리 비활성화
   */
  deactivate(): void {
    this._isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * 카테고리 정보 업데이트
   */
  updateDetails(data: UpdateCategoryData): void {
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error("카테고리명은 필수입니다");
      }
      if (data.name.trim().length > Category.MAX_NAME_LENGTH) {
        throw new Error(
          `카테고리명은 ${Category.MAX_NAME_LENGTH}자를 초과할 수 없습니다`
        );
      }
      this.name = data.name.trim();
    }

    if (data.description !== undefined) {
      if (data.description.trim().length === 0) {
        throw new Error("카테고리 설명은 필수입니다");
      }
      this.description = data.description.trim();
    }

    this.updatedAt = new Date();
  }

  /**
   * 상품 개수 업데이트
   */
  updateProductCount(count: number): void {
    if (count < 0) {
      throw new Error("상품 개수는 0 이상이어야 합니다");
    }
    this.productCount = count;
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
      this.slug.toLowerCase(),
    ].join(" ");

    return searchableText.includes(lowerQuery);
  }

  // ========================================
  // 도메인 규칙 메서드
  // ========================================

  /**
   * 표시 가능 여부 확인 (활성 상태 + 기타 조건)
   */
  isDisplayable(): boolean {
    return this._isActive;
  }

  /**
   * SEO 정보 생성
   */
  generateSEOInfo(): CategorySEOInfo {
    return {
      title: `${this.name} - 카테고리`,
      description: this.description,
      keywords: `${this.name}, 카테고리, 상품`,
      slug: this.slug,
    };
  }

  /**
   * 카테고리 요약 정보 반환
   */
  getSummary(): CategorySummary {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      parentId: this.parentId,
      depth: this.depth,
      productCount: this.productCount,
      isActive: this._isActive,
      isRoot: this.isRoot(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // ========================================
  // 도메인 이벤트 (향후 확장용)
  // ========================================

  /**
   * 카테고리 생성 이벤트
   */
  getCreatedEvent() {
    return {
      type: "CategoryCreated",
      categoryId: this.id,
      categoryName: this.name,
      parentId: this.parentId,
      depth: this.depth,
      slug: this.slug,
      createdAt: this.createdAt,
    };
  }

  /**
   * 카테고리 업데이트 이벤트
   */
  getUpdatedEvent() {
    return {
      type: "CategoryUpdated",
      categoryId: this.id,
      categoryName: this.name,
      parentId: this.parentId,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 카테고리 비활성화 이벤트
   */
  getDeactivatedEvent() {
    return {
      type: "CategoryDeactivated",
      categoryId: this.id,
      categoryName: this.name,
      deactivatedAt: this.updatedAt,
    };
  }
}
