// ========================================
// ProductRepositoryImpl - Infrastructure 계층
// src/adapters/ProductRepositoryImpl.ts
// ========================================

import { Repository, DataSource, SelectQueryBuilder } from "typeorm";
import { Product } from "../entities/Product";
import { ProductEntity } from "./entities/ProductEntity";
import { ProductRepository } from "../usecases/types";

/**
 * ProductRepositoryImpl - PostgreSQL 기반 Product Repository 구현체
 *
 * 책임:
 * 1. Product Domain 객체와 ProductEntity 간 변환
 * 2. TypeORM을 활용한 데이터베이스 연산
 * 3. 복잡한 검색 및 필터링 쿼리 구현
 * 4. 페이징 및 정렬 지원
 * 5. 트랜잭션 지원
 * 6. 성능 최적화 (인덱스, 쿼리 최적화)
 *
 * Clean Architecture 원칙:
 * - Repository 인터페이스 구현 (의존성 역전)
 * - 도메인 로직 없음 (순수 데이터 접근)
 * - 에러 변환 (infrastructure → domain)
 */
export class ProductRepositoryImpl implements ProductRepository {
  private repository: Repository<ProductEntity>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ProductEntity);
  }

  // ========================================
  // 기본 CRUD 연산
  // ========================================

  /**
   * 상품 저장 (생성/수정)
   */
  async save(product: Product): Promise<Product> {
    try {
      // Domain → Entity 변환
      const entity = ProductEntity.fromDomain(product);

      // 데이터베이스 저장
      const savedEntity = await this.repository.save(entity);

      // Entity → Domain 변환 후 반환
      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "save");
      throw error; // TypeScript를 위한 unreachable
    }
  }

  /**
   * ID로 상품 조회
   */
  async findById(id: string): Promise<Product | null> {
    try {
      if (!id) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { id },
      });

      return entity ? entity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, "findById");
      throw error;
    }
  }

  /**
   * SKU로 상품 조회
   */
  async findBySku(sku: string): Promise<Product | null> {
    try {
      if (!sku) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { sku: sku.toUpperCase() },
      });

      return entity ? entity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, "findBySku");
      throw error;
    }
  }

  /**
   * 상품 삭제 (실제로는 비활성화)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.repository.update(id, {
        isActive: false,
        updatedAt: new Date(),
      });
    } catch (error) {
      this.handleDatabaseError(error, "delete");
      throw error;
    }
  }

  /**
   * 상품 업데이트
   */
  async update(product: Product): Promise<Product> {
    try {
      // Domain 객체를 직접 저장 (save 메서드와 동일한 로직)
      return await this.save(product);
    } catch (error) {
      this.handleDatabaseError(error, "update");
      throw error;
    }
  }

  // ========================================
  // 검색 및 필터링
  // ========================================

  /**
   * 카테고리별 상품 조회
   */
  async findByCategory(
    categoryId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const queryBuilder = this.repository.createQueryBuilder("product");

      // 기본 필터
      queryBuilder
        .where("product.categoryId = :categoryId", { categoryId })
        .andWhere("product.isActive = :isActive", { isActive: true });

      // 정렬
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const products = entities.map((entity) => entity.toDomain());

      return { products, total };
    } catch (error) {
      this.handleDatabaseError(error, "findByCategory");
      throw error;
    }
  }

  /**
   * 복합 검색 (이름, 설명, 브랜드, 태그)
   */
  async search(options: {
    search?: string;
    categoryId?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    tags?: string[];
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ products: Product[]; total: number }> {
    try {
      const {
        search,
        categoryId,
        brand,
        minPrice,
        maxPrice,
        tags,
        isActive = true,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = options;

      const queryBuilder = this.repository.createQueryBuilder("product");

      // 기본 활성 상태 필터
      queryBuilder.where("product.isActive = :isActive", { isActive });

      // 텍스트 검색 (상품명, 설명, 브랜드)
      if (search) {
        queryBuilder.andWhere(
          "(LOWER(product.name) LIKE LOWER(:search) OR " +
            "LOWER(product.description) LIKE LOWER(:search) OR " +
            "LOWER(product.brand) LIKE LOWER(:search))",
          { search: `%${search}%` }
        );
      }

      // 카테고리 필터
      if (categoryId) {
        queryBuilder.andWhere("product.categoryId = :categoryId", {
          categoryId,
        });
      }

      // 브랜드 필터
      if (brand) {
        queryBuilder.andWhere("LOWER(product.brand) = LOWER(:brand)", {
          brand,
        });
      }

      // 가격 범위 필터
      if (minPrice !== undefined) {
        queryBuilder.andWhere(
          "(CASE WHEN product.discountPrice IS NOT NULL THEN product.discountPrice ELSE product.price END) >= :minPrice",
          { minPrice }
        );
      }

      if (maxPrice !== undefined) {
        queryBuilder.andWhere(
          "(CASE WHEN product.discountPrice IS NOT NULL THEN product.discountPrice ELSE product.price END) <= :maxPrice",
          { maxPrice }
        );
      }

      // 태그 필터 (PostgreSQL JSON 연산 사용)
      if (tags && tags.length > 0) {
        const tagConditions = tags
          .map((_, index) => `product.tags::jsonb ? :tag${index}`)
          .join(" AND ");

        queryBuilder.andWhere(`(${tagConditions})`);

        // 파라미터 바인딩
        tags.forEach((tag, index) => {
          queryBuilder.setParameter(`tag${index}`, tag);
        });
      }

      // 정렬
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const products = entities.map((entity) => entity.toDomain());

      return { products, total };
    } catch (error) {
      this.handleDatabaseError(error, "search");
      throw error;
    }
  }

  /**
   * 브랜드별 상품 조회
   */
  async findByBrand(brand: string): Promise<Product[]> {
    try {
      const entities = await this.repository.find({
        where: {
          brand: brand,
          isActive: true,
        },
        order: { createdAt: "DESC" },
      });

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findByBrand");
      throw error;
    }
  }

  // ========================================
  // 집계 및 통계
  // ========================================

  /**
   * 카테고리별 상품 개수 조회
   */
  async countByCategory(categoryId: string): Promise<number> {
    try {
      return await this.repository.count({
        where: {
          categoryId,
          isActive: true,
        },
      });
    } catch (error) {
      this.handleDatabaseError(error, "countByCategory");
      throw error;
    }
  }

  /**
   * 브랜드 목록 조회 (활성 상품 기준)
   */
  async getActiveBrands(): Promise<string[]> {
    try {
      const result = await this.repository
        .createQueryBuilder("product")
        .select("DISTINCT product.brand", "brand")
        .where("product.isActive = :isActive", { isActive: true })
        .orderBy("product.brand", "ASC")
        .getRawMany();

      return result.map((row) => row.brand);
    } catch (error) {
      this.handleDatabaseError(error, "getActiveBrands");
      throw error;
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 정렬 조건 적용
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<ProductEntity>,
    sortBy: string,
    sortOrder: "asc" | "desc"
  ): void {
    const validSortFields = [
      "name",
      "price",
      "brand",
      "createdAt",
      "updatedAt",
    ];

    if (validSortFields.includes(sortBy)) {
      if (sortBy === "price") {
        // 할인가가 있으면 할인가로, 없으면 원가로 정렬
        queryBuilder.orderBy(
          "CASE WHEN product.discountPrice IS NOT NULL THEN product.discountPrice ELSE product.price END",
          sortOrder.toUpperCase() as "ASC" | "DESC"
        );
      } else {
        queryBuilder.orderBy(
          `product.${sortBy}`,
          sortOrder.toUpperCase() as "ASC" | "DESC"
        );
      }
    } else {
      // 기본 정렬
      queryBuilder.orderBy("product.createdAt", "DESC");
    }
  }

  /**
   * 데이터베이스 에러 처리 및 도메인 에러로 변환
   */
  private handleDatabaseError(error: any, operation: string): void {
    console.error(`[ProductRepository] ${operation} 오류:`, error);

    // PostgreSQL 에러 코드에 따른 도메인 에러 변환
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint?.includes("sku")) {
        throw new Error("이미 존재하는 SKU입니다");
      }
      throw new Error("중복된 데이터입니다");
    }

    if (error.code === "23503") {
      // Foreign key violation
      throw new Error("참조 데이터가 존재하지 않습니다");
    }

    if (error.code === "23514") {
      // Check constraint violation
      throw new Error("데이터 제약 조건을 위반했습니다");
    }

    // 기타 데이터베이스 에러
    throw new Error(`데이터베이스 오류가 발생했습니다: ${operation}`);
  }

  // ========================================
  // 트랜잭션 지원 메서드
  // ========================================

  /**
   * 트랜잭션 내에서 상품 저장
   */
  async saveInTransaction(
    product: Product,
    queryRunner?: any
  ): Promise<Product> {
    try {
      const repository = queryRunner
        ? queryRunner.manager.getRepository(ProductEntity)
        : this.repository;

      const entity = ProductEntity.fromDomain(product);
      const savedEntity = await repository.save(entity);

      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "saveInTransaction");
      throw error;
    }
  }
}
