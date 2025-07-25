// ========================================
// CategoryRepositoryImpl - Infrastructure 계층 (수정됨)
// src/adapters/CategoryRepositoryImpl.ts
// ========================================
import { injectable, inject } from "inversify";
import { Repository, DataSource, IsNull } from "typeorm";
import { Category } from "../entities/Category";
import { CategoryEntity } from "./entities/CategoryEntity";
import { CategoryRepository } from "../usecases/types";
import { TYPES } from "../infrastructure/di/types";

/**
 * CategoryRepositoryImpl - PostgreSQL 기반 Category Repository 구현체
 *
 * 책임:
 * 1. Category Domain 객체와 CategoryEntity 간 변환
 * 2. 계층형 구조 쿼리 (부모-자식 관계)
 * 3. 트리 구조 조회 및 경로 추적
 * 4. 카테고리별 상품 개수 관리
 * 5. 깊이별 조회 및 필터링
 * 6. 성능 최적화 (CTE, 재귀 쿼리)
 *
 * 특징:
 * - Self-referencing 테이블 구조
 * - 깊이(depth) 기반 계층 관리
 * - 경로(path) 추적 기능
 * - 상품 개수 캐싱
 */
@injectable()
export class CategoryRepositoryImpl implements CategoryRepository {
  private repository: Repository<CategoryEntity>;

  constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
    this.repository = dataSource.getRepository(CategoryEntity);
  }

  // ========================================
  // 기본 CRUD 연산
  // ========================================

  /**
   * 카테고리 저장 (생성/수정)
   */
  async save(category: Category): Promise<Category> {
    try {
      // Domain → Entity 변환
      const entity = CategoryEntity.fromDomain(category);

      // 데이터베이스 저장
      const savedEntity = await this.repository.save(entity);

      // Entity → Domain 변환 후 반환
      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "save");
      throw error;
    }
  }

  /**
   * ID로 카테고리 조회
   */
  async findById(id: string): Promise<Category | null> {
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
   * 슬러그로 카테고리 조회
   */
  async findBySlug(slug: string): Promise<Category | null> {
    try {
      if (!slug) {
        return null;
      }

      const entity = await this.repository.findOne({
        where: { slug: slug.toLowerCase() },
      });

      return entity ? entity.toDomain() : null;
    } catch (error) {
      this.handleDatabaseError(error, "findBySlug");
      throw error;
    }
  }

  /**
   * 카테고리 업데이트 (인터페이스 요구사항)
   */
  async update(category: Category): Promise<Category> {
    try {
      // save 메서드와 동일한 로직 (TypeORM save는 create/update 모두 처리)
      return await this.save(category);
    } catch (error) {
      this.handleDatabaseError(error, "update");
      throw error;
    }
  }

  /**
   * 카테고리 삭제 (실제로는 비활성화)
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

  // ========================================
  // 계층형 구조 조회
  // ========================================

  /**
   * 루트 카테고리들 조회
   */
  async findRootCategories(): Promise<Category[]> {
    try {
      const entities = await this.repository.find({
        where: {
          parentId: IsNull(), // TypeORM의 IsNull() 연산자 사용
          isActive: true,
        },
        order: { name: "ASC" },
      });

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findRootCategories");
      throw error;
    }
  }

  /**
   * 특정 카테고리의 하위 카테고리들 조회
   */
  async findChildren(parentId: string): Promise<Category[]> {
    try {
      const entities = await this.repository.find({
        where: {
          parentId,
          isActive: true,
        },
        order: { name: "ASC" },
      });

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findChildren");
      throw error;
    }
  }

  /**
   * 카테고리 경로 조회 (인터페이스 요구사항)
   * 루트부터 해당 카테고리까지의 경로
   */
  async findPath(categoryId: string): Promise<Category[]> {
    try {
      // CTE를 사용한 상위 경로 추적
      const query = `
        WITH RECURSIVE category_path AS (
          -- 시작점: 현재 카테고리
          SELECT id, name, description, slug, parent_id, depth, is_active, product_count, created_at, updated_at, 0 as level
          FROM categories 
          WHERE id = $1
          
          UNION ALL
          
          -- 재귀적으로 상위 카테고리들
          SELECT c.id, c.name, c.description, c.slug, c.parent_id, c.depth, c.is_active, c.product_count, c.created_at, c.updated_at, cp.level + 1
          FROM categories c
          INNER JOIN category_path cp ON c.id = cp.parent_id
        )
        SELECT * FROM category_path 
        ORDER BY level DESC  -- 루트부터 현재까지 순서
      `;

      const entities = await this.repository.query(query, [categoryId]);

      return entities.map((raw: any) => {
        const entity = this.repository.create({
          id: raw.id,
          name: raw.name,
          description: raw.description,
          slug: raw.slug,
          parentId: raw.parent_id,
          depth: raw.depth,
          isActive: raw.is_active,
          productCount: raw.product_count,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
        });
        return entity.toDomain();
      });
    } catch (error) {
      this.handleDatabaseError(error, "findPath");
      throw error;
    }
  }

  /**
   * 전체 카테고리 조회 (인터페이스 요구사항)
   */
  async findAll(
    options: {
      parentId?: string;
      isActive?: boolean;
      depth?: number;
    } = {}
  ): Promise<Category[]> {
    try {
      const { parentId, isActive = true, depth } = options;

      const queryBuilder = this.repository.createQueryBuilder("category");

      // 활성 상태 필터
      queryBuilder.where("category.isActive = :isActive", { isActive });

      // 부모 ID 필터
      if (parentId !== undefined) {
        if (parentId === null) {
          queryBuilder.andWhere("category.parentId IS NULL");
        } else {
          queryBuilder.andWhere("category.parentId = :parentId", { parentId });
        }
      }

      // 깊이 필터
      if (depth !== undefined) {
        queryBuilder.andWhere("category.depth = :depth", { depth });
      }

      // 정렬
      queryBuilder
        .orderBy("category.depth", "ASC")
        .addOrderBy("category.name", "ASC");

      const entities = await queryBuilder.getMany();

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findAll");
      throw error;
    }
  }

  /**
   * 전체 카테고리 트리 조회 (루트부터 모든 하위까지)
   */
  async findCategoryTree(): Promise<Category[]> {
    try {
      // CTE(Common Table Expression)를 사용한 재귀 쿼리
      const query = `
        WITH RECURSIVE category_tree AS (
          -- 루트 카테고리들
          SELECT id, name, description, slug, parent_id, depth, is_active, product_count, created_at, updated_at
          FROM categories 
          WHERE parent_id IS NULL AND is_active = true
          
          UNION ALL
          
          -- 재귀적으로 하위 카테고리들
          SELECT c.id, c.name, c.description, c.slug, c.parent_id, c.depth, c.is_active, c.product_count, c.created_at, c.updated_at
          FROM categories c
          INNER JOIN category_tree ct ON c.parent_id = ct.id
          WHERE c.is_active = true
        )
        SELECT * FROM category_tree 
        ORDER BY depth, name
      `;

      const entities = await this.repository.query(query);

      // Raw 결과를 Entity로 변환 후 Domain으로 변환
      return entities.map((raw: any) => {
        const entity = this.repository.create({
          id: raw.id,
          name: raw.name,
          description: raw.description,
          slug: raw.slug,
          parentId: raw.parent_id,
          depth: raw.depth,
          isActive: raw.is_active,
          productCount: raw.product_count,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
        });
        return entity.toDomain();
      });
    } catch (error) {
      this.handleDatabaseError(error, "findCategoryTree");
      throw error;
    }
  }

  /**
   * 특정 깊이의 카테고리들 조회
   */
  async findByDepth(depth: number): Promise<Category[]> {
    try {
      const entities = await this.repository.find({
        where: {
          depth,
          isActive: true,
        },
        order: { name: "ASC" },
      });

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "findByDepth");
      throw error;
    }
  }

  // ========================================
  // 검색 및 필터링
  // ========================================

  /**
   * 카테고리 검색 (이름, 설명, 슬러그)
   */
  async search(query: string): Promise<Category[]> {
    try {
      if (!query) {
        return [];
      }

      const entities = await this.repository
        .createQueryBuilder("category")
        .where("category.isActive = :isActive", { isActive: true })
        .andWhere(
          "(LOWER(category.name) LIKE LOWER(:query) OR " +
            "LOWER(category.description) LIKE LOWER(:query) OR " +
            "LOWER(category.slug) LIKE LOWER(:query))",
          { query: `%${query}%` }
        )
        .orderBy("category.depth", "ASC")
        .addOrderBy("category.name", "ASC")
        .getMany();

      return entities.map((entity) => entity.toDomain());
    } catch (error) {
      this.handleDatabaseError(error, "search");
      throw error;
    }
  }

  /**
   * 활성 카테고리들 조회 (페이징)
   */
  async findActive(
    options: {
      page?: number;
      limit?: number;
      depth?: number;
    } = {}
  ): Promise<{ categories: Category[]; total: number }> {
    try {
      const { page = 1, limit = 50, depth } = options;

      const queryBuilder = this.repository.createQueryBuilder("category");

      // 기본 필터
      queryBuilder.where("category.isActive = :isActive", { isActive: true });

      // 깊이 필터
      if (depth !== undefined) {
        queryBuilder.andWhere("category.depth = :depth", { depth });
      }

      // 정렬
      queryBuilder
        .orderBy("category.depth", "ASC")
        .addOrderBy("category.name", "ASC");

      // 페이징
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // 실행
      const [entities, total] = await queryBuilder.getManyAndCount();

      // Domain 객체로 변환
      const categories = entities.map((entity) => entity.toDomain());

      return { categories, total };
    } catch (error) {
      this.handleDatabaseError(error, "findActive");
      throw error;
    }
  }

  // ========================================
  // 상품 개수 관리
  // ========================================

  /**
   * 카테고리별 상품 개수 업데이트
   */
  async updateProductCount(categoryId: string, count: number): Promise<void> {
    try {
      await this.repository.update(categoryId, {
        productCount: count,
        updatedAt: new Date(),
      });
    } catch (error) {
      this.handleDatabaseError(error, "updateProductCount");
      throw error;
    }
  }

  /**
   * 모든 카테고리의 상품 개수 재계산
   */
  async recalculateAllProductCounts(): Promise<void> {
    try {
      // 각 카테고리별 실제 상품 개수 조회 및 업데이트
      const query = `
        UPDATE categories 
        SET product_count = (
          SELECT COUNT(*) 
          FROM products 
          WHERE products.category_id = categories.id 
          AND products.is_active = true
        ),
        updated_at = CURRENT_TIMESTAMP
      `;

      await this.repository.query(query);
    } catch (error) {
      this.handleDatabaseError(error, "recalculateAllProductCounts");
      throw error;
    }
  }

  // ========================================
  // 집계 및 통계
  // ========================================

  /**
   * 카테고리 개수 조회 (깊이별)
   */
  async countByDepth(): Promise<{ depth: number; count: number }[]> {
    try {
      const result = await this.repository
        .createQueryBuilder("category")
        .select("category.depth", "depth")
        .addSelect("COUNT(*)", "count")
        .where("category.isActive = :isActive", { isActive: true })
        .groupBy("category.depth")
        .orderBy("category.depth", "ASC")
        .getRawMany();

      return result.map((row) => ({
        depth: parseInt(row.depth),
        count: parseInt(row.count),
      }));
    } catch (error) {
      this.handleDatabaseError(error, "countByDepth");
      throw error;
    }
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 데이터베이스 에러 처리 및 도메인 에러로 변환
   */
  private handleDatabaseError(error: any, operation: string): void {
    console.error(`[CategoryRepository] ${operation} 오류:`, error);

    // PostgreSQL 에러 코드에 따른 도메인 에러 변환
    if (error.code === "23505") {
      // Unique violation
      if (error.constraint?.includes("slug")) {
        throw new Error("이미 존재하는 슬러그입니다");
      }
      throw new Error("중복된 카테고리입니다");
    }

    if (error.code === "23503") {
      // Foreign key violation
      throw new Error("참조 무결성 오류: 관련된 데이터가 존재합니다");
    }

    if (error.code === "23514") {
      // Check constraint violation
      throw new Error("카테고리 데이터 제약 조건을 위반했습니다");
    }

    // 기타 데이터베이스 에러
    throw new Error(`카테고리 데이터베이스 오류가 발생했습니다: ${operation}`);
  }

  // ========================================
  // 트랜잭션 지원 메서드
  // ========================================

  /**
   * 트랜잭션 내에서 카테고리 저장
   */
  async saveInTransaction(
    category: Category,
    queryRunner?: any
  ): Promise<Category> {
    try {
      const repository = queryRunner
        ? queryRunner.manager.getRepository(CategoryEntity)
        : this.repository;

      const entity = CategoryEntity.fromDomain(category);
      const savedEntity = await repository.save(entity);

      return savedEntity.toDomain();
    } catch (error) {
      this.handleDatabaseError(error, "saveInTransaction");
      throw error;
    }
  }
}
