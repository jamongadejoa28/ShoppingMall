// ========================================
// CategoryEntity - TypeORM Entity (Infrastructure 계층)
// src/adapters/entities/CategoryEntity.ts
// ========================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { ProductEntity } from "./ProductEntity";

/**
 * CategoryEntity - TypeORM Entity (Framework 계층)
 *
 * 역할: 카테고리 데이터베이스 테이블과 객체 매핑
 * 특징: 계층형 구조 지원 (부모-자식 관계)
 *
 * 계층형 데이터 모델:
 * - Self-referencing 관계로 트리 구조 구현
 * - depth 컬럼으로 계층 깊이 관리
 * - slug로 SEO 친화적 URL 지원
 */
@Entity("categories")
@Index(["slug"], { unique: true }) // URL 슬러그 고유 인덱스
@Index(["parentId"]) // 부모 카테고리별 조회 최적화
@Index(["depth"]) // 계층별 조회 최적화
@Index(["isActive", "depth"]) // 활성 카테고리 계층별 조회
export class CategoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    type: "varchar",
    length: 150,
    nullable: false,
    unique: true,
  })
  slug!: string;

  // 부모 카테고리 ID (루트 카테고리는 null)
  @Column({ type: "uuid", nullable: true })
  parentId?: string | null;

  // 계층 깊이 (루트: 0, 1차 하위: 1, 2차 하위: 2, ...)
  @Column({ type: "int", default: 0 })
  depth!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  // 상품 개수 (캐시용 - 성능 최적화)
  @Column({ type: "int", default: 0 })
  productCount!: number;

  @CreateDateColumn({
    type: process.env.NODE_ENV === "test" ? "datetime" : "timestamp",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: process.env.NODE_ENV === "test" ? "datetime" : "timestamp",
  })
  updatedAt!: Date;

  // ========================================
  // 관계 매핑 (Self-referencing + Products) - 순환 참조 해결
  // ========================================

  // 부모 카테고리
  @ManyToOne(() => CategoryEntity, (category) => category.children, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: "parentId" })
  parent?: CategoryEntity | null;

  // 하위 카테고리들
  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children?: CategoryEntity[];

  // 이 카테고리에 속한 상품들 - Lazy Loading으로 순환 참조 방지
  @OneToMany("ProductEntity", "categoryId", { lazy: true })
  products?: any[]; // any 타입으로 순환 참조 방지

  // ========================================
  // 생성자
  // ========================================

  constructor() {
    // TypeORM Entity는 빈 생성자 필요
  }

  // ========================================
  // Domain 객체와 상호 변환 메서드
  // ========================================

  /**
   * Domain Category 객체를 TypeORM Entity로 변환
   */
  static fromDomain(
    category: import("../../entities/Category").Category
  ): CategoryEntity {
    const entity = new CategoryEntity();

    // 필수 속성들
    if (category.getId()) entity.id = category.getId();
    entity.name = category.getName();
    entity.slug = category.getSlug();
    entity.depth = category.getDepth();
    entity.isActive = category.isActive();
    entity.productCount = category.getProductCount();
    entity.createdAt = category.getCreatedAt();
    entity.updatedAt = category.getUpdatedAt();

    // 선택적 속성들 - exactOptionalPropertyTypes 대응
    const description = category.getDescription();
    if (description !== undefined) {
      entity.description = description;
    }

    const parentId = category.getParentId();
    if (parentId !== undefined) {
      entity.parentId = parentId;
    }

    return entity;
  }

  /**
   * TypeORM Entity를 Domain Category 객체로 변환
   */
  toDomain(): import("../../entities/Category").Category {
    // 동적 import를 사용하여 순환 종속성 완전 방지
    const { Category } = require("../../entities/Category");

    // Repository에서는 이미 저장된 데이터를 복원
    const categoryData: any = {
      id: this.id,
      name: this.name,
      slug: this.slug,
      depth: this.depth,
      isActive: this.isActive,
      productCount: this.productCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    // 선택적 속성들 조건부 추가
    if (this.description !== undefined) {
      categoryData.description = this.description;
    }

    if (this.parentId !== undefined) {
      categoryData.parentId = this.parentId;
    }

    return Category.restore(categoryData);
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 루트 카테고리인지 확인
   */
  isRoot(): boolean {
    return this.parentId === null || this.parentId === undefined;
  }

  /**
   * 하위 카테고리가 있는지 확인
   */
  hasChildren(): boolean {
    return this.children !== undefined && this.children.length > 0;
  }

  /**
   * 리프 카테고리인지 확인 (최하위 카테고리)
   */
  isLeaf(): boolean {
    return !this.hasChildren();
  }

  /**
   * 상품이 등록된 카테고리인지 확인
   */
  hasProducts(): boolean {
    return this.productCount > 0;
  }

  /**
   * 카테고리 경로 생성 (breadcrumb용)
   * 예: "전자제품 > 컴퓨터 > 노트북"
   */
  getFullPath(): string {
    // 실제 구현에서는 부모 카테고리들을 재귀적으로 조회해야 함
    // 여기서는 현재 카테고리 이름만 반환
    return this.name;
  }

  /**
   * URL 경로 생성
   * 예: "/categories/electronics/computers/laptops"
   */
  getUrlPath(): string {
    // 실제 구현에서는 부모 카테고리들의 slug를 조합해야 함
    return `/categories/${this.slug}`;
  }

  /**
   * 카테고리 트리 정보 반환
   */
  getTreeInfo() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      depth: this.depth,
      isRoot: this.isRoot(),
      hasChildren: this.hasChildren(),
      isLeaf: this.isLeaf(),
      productCount: this.productCount,
      isActive: this.isActive,
    };
  }

  /**
   * 관리자용 상세 정보 반환
   */
  getAdminSummary() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      parentId: this.parentId,
      depth: this.depth,
      productCount: this.productCount,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      childrenCount: this.children?.length || 0,
    };
  }
}
