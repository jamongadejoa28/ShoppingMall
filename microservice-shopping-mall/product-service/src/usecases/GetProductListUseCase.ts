// src/usecases/GetProductListUseCase.ts

import { injectable, inject } from "inversify";
import { Product } from "../entities/Product";
import { Category } from "../entities/Category";
import { Inventory } from "../entities/Inventory";
// ✅ 수정: shared/types/Result 클래스 사용
import { Result } from "../shared/types/Result";
// ✅ 수정: Repository는 usecases/types에서 import
import {
  ProductRepository,
  CategoryRepository,
  InventoryRepository,
  CacheService
} from "./types";
import { DomainError } from "../shared/errors/DomainError";
import { TYPES } from "../infrastructure/di/types";

// 상품 목록 조회 요청 DTO
export interface GetProductListRequest {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?:
    | "price_asc"
    | "price_desc"
    | "name_asc"
    | "name_desc"
    | "created_desc";
}

// 상품 목록 응답 DTO - exactOptionalPropertyTypes 대응
export interface ProductListResponse {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number | undefined; // ✅ 명시적 undefined 타입
    sku: string;
    brand: string;
    tags: string[];
    slug: string;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    inventory: {
      availableQuantity: number;
      status: string;
    };
    createdAt: Date;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    appliedCategory?: string | undefined;
    appliedSearch?: string | undefined;
    appliedBrand?: string | undefined;
    appliedPriceRange?:
      | {
          min?: number | undefined;
          max?: number | undefined;
        }
      | undefined;
    appliedSortBy?: string | undefined;
  };
}

// 내부 필터 인터페이스
interface SearchFilters {
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
}

@injectable()
export class GetProductListUseCase {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;
  private readonly CACHE_TTL = 300; // 5분
  private readonly CACHE_KEY_PREFIX = "product_list:";

  constructor(
    @inject(TYPES.ProductRepository)
    private readonly productRepository: ProductRepository,
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepository,
    @inject(TYPES.InventoryRepository)
    private readonly inventoryRepository: InventoryRepository,
    @inject(TYPES.CacheService) private readonly cacheService: CacheService
  ) {}

  async execute(
    request: GetProductListRequest
  ): Promise<Result<ProductListResponse>> {
    try {
      // 1. 입력값 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        // ✅ 수정: DomainError 객체 전달
        return Result.fail(new DomainError(validationError, "INVALID_INPUT"));
      }

      // 2. 정규화된 파라미터 생성
      const normalizedParams = this.normalizeParameters(request);

      // 3. 캐시 확인 시도
      const cacheKey = this.buildCacheKey(normalizedParams);
      try {
        const cachedResult =
          await this.cacheService.get<ProductListResponse>(cacheKey);
        if (cachedResult) {
          return Result.ok(cachedResult);
        }
      } catch (cacheError) {
        // 캐시 오류는 무시하고 계속 진행
        console.warn("캐시 조회 실패:", cacheError);
      }

      // 4. 데이터베이스에서 상품 조회 - ✅ undefined 값 필터링
      const searchOptions: any = {
        page: normalizedParams.page,
        limit: normalizedParams.limit,
        sortBy: normalizedParams.sortBy,
        sortOrder: this.extractSortOrder(normalizedParams.sortBy) as
          | "asc"
          | "desc",
        isActive: true, // 활성 상품만 조회
      };

      // undefined 값들을 제거하여 exactOptionalPropertyTypes 문제 해결
      if (normalizedParams.search)
        searchOptions.search = normalizedParams.search;
      if (normalizedParams.categoryId)
        searchOptions.categoryId = normalizedParams.categoryId;
      if (normalizedParams.brand) searchOptions.brand = normalizedParams.brand;
      if (normalizedParams.minPrice !== undefined)
        searchOptions.minPrice = normalizedParams.minPrice;
      if (normalizedParams.maxPrice !== undefined)
        searchOptions.maxPrice = normalizedParams.maxPrice;

      const { products, total } =
        await this.productRepository.search(searchOptions);

      // 5. 상품 세부 정보 보강 (카테고리, 재고 정보)
      const enrichedProducts = await this.enrichProductsWithDetails(products);

      // 6. 응답 데이터 구성
      const response = this.buildResponse(
        enrichedProducts,
        total,
        normalizedParams,
        request
      );

      // 7. 캐시 저장 시도
      try {
        await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
      } catch (cacheError) {
        // 캐시 저장 오류는 무시
        console.warn("캐시 저장 실패:", cacheError);
      }

      return Result.ok(response);
    } catch (error) {
      console.error("GetProductListUseCase 실행 오류:", error);

      if (error instanceof DomainError) {
        return Result.fail(error);
      }

      return Result.fail(
        new DomainError(
          "상품 목록 조회 중 오류가 발생했습니다",
          "INTERNAL_ERROR"
        )
      );
    }
  }

  /**
   * 입력값 유효성 검증
   */
  private validateInput(request: GetProductListRequest): string | null {
    // 페이지 번호 검증
    if (request.page !== undefined && request.page < 1) {
      return "페이지 번호는 1 이상이어야 합니다";
    }

    // 페이지 크기 검증
    if (request.limit !== undefined) {
      if (request.limit < 1) {
        return "페이지 크기는 1 이상이어야 합니다";
      }
      if (request.limit > this.MAX_LIMIT) {
        return `페이지 크기는 ${this.MAX_LIMIT} 이하여야 합니다`;
      }
    }

    // 가격 범위 검증
    if (request.minPrice !== undefined && request.minPrice < 0) {
      return "최소 가격은 0 이상이어야 합니다";
    }

    if (request.maxPrice !== undefined && request.maxPrice < 0) {
      return "최대 가격은 0 이상이어야 합니다";
    }

    if (
      request.minPrice !== undefined &&
      request.maxPrice !== undefined &&
      request.minPrice > request.maxPrice
    ) {
      return "최소 가격은 최대 가격보다 작거나 같아야 합니다";
    }

    // 검색어 길이 검증
    if (request.search !== undefined && request.search.trim().length > 100) {
      return "검색어는 100자 이하여야 합니다";
    }

    return null;
  }

  /**
   * 입력 파라미터 정규화
   */
  private normalizeParameters(request: GetProductListRequest) {
    return {
      page: Math.max(1, request.page || this.DEFAULT_PAGE),
      limit: Math.min(
        this.MAX_LIMIT,
        Math.max(1, request.limit || this.DEFAULT_LIMIT)
      ),
      categoryId: request.categoryId?.trim() || undefined,
      search: request.search?.trim() || undefined,
      brand: request.brand?.trim() || undefined,
      minPrice: request.minPrice || undefined,
      maxPrice: request.maxPrice || undefined,
      sortBy: request.sortBy || "created_desc",
    };
  }

  /**
   * 정렬 순서 추출
   */
  private extractSortOrder(sortBy?: string): string {
    if (!sortBy) return "desc";

    if (sortBy.endsWith("_asc")) return "asc";
    if (sortBy.endsWith("_desc")) return "desc";

    return "desc"; // 기본값
  }

  /**
   * 캐시 키 생성
   */
  private buildCacheKey(params: any): string {
    const keyParts = [
      this.CACHE_KEY_PREFIX,
      `page:${params.page}`,
      `limit:${params.limit}`,
      `sort:${params.sortBy}`,
    ];

    if (params.categoryId) keyParts.push(`category:${params.categoryId}`);
    if (params.search) keyParts.push(`search:${params.search}`);
    if (params.brand) keyParts.push(`brand:${params.brand}`);
    if (params.minPrice) keyParts.push(`minPrice:${params.minPrice}`);
    if (params.maxPrice) keyParts.push(`maxPrice:${params.maxPrice}`);

    return keyParts.join(":");
  }

  /**
   * 상품 정보 보강 - 카테고리 및 재고 정보 추가
   * ✅ getSlug() 메서드 제거하고 대안 사용
   */
  private async enrichProductsWithDetails(products: Product[]): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      discountPrice?: number | undefined;
      sku: string;
      brand: string;
      tags: string[];
      slug: string;
      category: {
        id: string;
        name: string;
        slug: string;
      };
      inventory: {
        availableQuantity: number;
        status: string;
      };
      createdAt: Date;
    }>
  > {
    // ✅ 수정: products가 배열인지 확인
    if (!products || !Array.isArray(products)) {
      console.warn("products가 배열이 아닙니다:", products);
      return [];
    }

    const enrichedProducts = [];

    for (const product of products) {
      try {
        // 카테고리 정보 조회
        const category = await this.categoryRepository.findById(
          product.getCategoryId()
        );

        // 재고 정보 조회
        const inventory = await this.inventoryRepository.findByProductId(
          product.getId()
        );

        // ✅ slug 생성 (getSlug 메서드 대신 직접 생성)
        const slug = this.generateSlug(product.getName());

        enrichedProducts.push({
          id: product.getId(),
          name: product.getName(),
          description: product.getDescription(),
          price: product.getPrice(),
          discountPrice: product.getDiscountPrice() || undefined, // ✅ 명시적 undefined
          sku: product.getSku(),
          brand: product.getBrand(),
          tags: product.getTags(),
          slug: slug,
          category: {
            id: category?.getId() || "",
            name: category?.getName() || "미분류",
            slug: category
              ? this.generateSlug(category.getName())
              : "uncategorized",
          },
          inventory: {
            availableQuantity: inventory?.getAvailableQuantity() || 0,
            status: inventory?.getStatus() || "out_of_stock",
          },
          createdAt: product.getCreatedAt(),
        });
      } catch (error) {
        console.error(`상품 ${product.getId()} 정보 보강 실패:`, error);
        // 오류가 발생한 상품도 기본 정보로 포함
        enrichedProducts.push({
          id: product.getId(),
          name: product.getName(),
          description: product.getDescription(),
          price: product.getPrice(),
          discountPrice: product.getDiscountPrice() || undefined,
          sku: product.getSku(),
          brand: product.getBrand(),
          tags: product.getTags(),
          slug: this.generateSlug(product.getName()),
          category: {
            id: "",
            name: "미분류",
            slug: "uncategorized",
          },
          inventory: {
            availableQuantity: 0,
            status: "out_of_stock",
          },
          createdAt: product.getCreatedAt(),
        });
      }
    }

    return enrichedProducts;
  }

  /**
   * Slug 생성 유틸리티 메서드
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "") // 특수문자 제거 (한글 유지)
      .replace(/\s+/g, "-") // 공백을 하이픈으로
      .replace(/-+/g, "-") // 연속된 하이픈 제거
      .trim()
      .replace(/^-|-$/g, ""); // 앞뒤 하이픈 제거
  }

  /**
   * 최종 응답 데이터 구성
   * ✅ exactOptionalPropertyTypes 대응
   */
  private buildResponse(
    enrichedProducts: any[],
    total: number,
    normalizedParams: any,
    originalRequest: GetProductListRequest
  ): ProductListResponse {
    const totalPages = Math.ceil(total / normalizedParams.limit);
    const currentPage = normalizedParams.page;

    // ✅ undefined 값을 명시적으로 처리
    const filters: ProductListResponse["filters"] = {};

    if (originalRequest.categoryId)
      filters.appliedCategory = originalRequest.categoryId;
    if (originalRequest.search) filters.appliedSearch = originalRequest.search;
    if (originalRequest.brand) filters.appliedBrand = originalRequest.brand;
    if (originalRequest.sortBy) filters.appliedSortBy = originalRequest.sortBy;

    if (
      originalRequest.minPrice !== undefined ||
      originalRequest.maxPrice !== undefined
    ) {
      filters.appliedPriceRange = {};
      if (originalRequest.minPrice !== undefined)
        filters.appliedPriceRange.min = originalRequest.minPrice;
      if (originalRequest.maxPrice !== undefined)
        filters.appliedPriceRange.max = originalRequest.maxPrice;
    }

    return {
      products: enrichedProducts,
      pagination: {
        currentPage,
        totalPages,
        totalItems: total,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
      filters,
    };
  }
}
