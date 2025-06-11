// src/usecases/GetProductListUseCase.ts

import { Product } from "../entities/Product";
import { Category } from "../entities/Category";
import { Inventory } from "../entities/Inventory";
import { ProductRepository } from "../repositories/ProductRepository";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { CacheService } from "../services/CacheService";
import { DomainError } from "../shared/errors/DomainError";
import { Result } from "../shared/types/Result";

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

// 상품 목록 응답 DTO
export interface ProductListResponse {
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
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
    appliedCategory?: string;
    appliedSearch?: string;
    appliedBrand?: string;
    appliedPriceRange?: {
      min?: number;
      max?: number;
    };
    appliedSortBy?: string;
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

export class GetProductListUseCase {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;
  private readonly CACHE_TTL = 300; // 5분
  private readonly CACHE_KEY_PREFIX = "product_list:";

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(
    request: GetProductListRequest
  ): Promise<Result<ProductListResponse>> {
    try {
      // 1. 입력값 유효성 검증
      const validationError = this.validateInput(request);
      if (validationError) {
        return Result.fail(validationError);
      }

      // 2. 기본값 설정
      const page = request.page || this.DEFAULT_PAGE;
      const limit = request.limit || this.DEFAULT_LIMIT;
      const offset = (page - 1) * limit;

      // 3. 캐시 키 생성
      const cacheKey = this.generateCacheKey(request);
      const cachedData =
        await this.cacheService.get<ProductListResponse>(cacheKey);

      if (cachedData) {
        return Result.ok(cachedData);
      }

      // 4. 검색 필터 준비
      const filters: SearchFilters = {};
      if (request.categoryId) filters.categoryId = request.categoryId;
      if (request.brand) filters.brand = request.brand;
      if (request.minPrice !== undefined) filters.minPrice = request.minPrice;
      if (request.maxPrice !== undefined) filters.maxPrice = request.maxPrice;
      if (request.sortBy) filters.sortBy = request.sortBy;

      // 5. 상품 목록 조회
      const products = await this.productRepository.search(
        request.search || "",
        filters,
        limit,
        offset
      );

      // 6. 총 개수 조회 (페이지네이션용)
      const totalItems = await this.getTotalCount(
        request.search || "",
        filters
      );

      // 7. 상품별 상세 정보 보강 (카테고리, 재고)
      const enrichedProducts = await this.enrichProductsWithDetails(products);

      // 8. 응답 데이터 구성
      const responseData = this.buildResponse(
        enrichedProducts,
        page,
        limit,
        totalItems,
        request
      );

      // 9. 캐시에 저장
      await this.cacheService.set(cacheKey, responseData, this.CACHE_TTL);

      return Result.ok(responseData);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(error);
      }
      return Result.fail(
        new Error("상품 목록 조회 중 예상치 못한 오류가 발생했습니다")
      );
    }
  }

  private validateInput(request: GetProductListRequest): DomainError | null {
    // 페이지 유효성 검증
    if (request.page !== undefined && request.page <= 0) {
      return DomainError.invalidInput("페이지는 1 이상이어야 합니다");
    }

    // 제한 개수 유효성 검증
    if (request.limit !== undefined) {
      if (request.limit <= 0) {
        return DomainError.invalidInput("제한 개수는 1 이상이어야 합니다");
      }
      if (request.limit > this.MAX_LIMIT) {
        return DomainError.invalidInput(
          `제한 개수는 ${this.MAX_LIMIT}개 이하여야 합니다`
        );
      }
    }

    // 가격 유효성 검증
    if (request.minPrice !== undefined && request.minPrice < 0) {
      return DomainError.invalidInput("최소 가격은 0 이상이어야 합니다");
    }

    if (request.maxPrice !== undefined && request.maxPrice < 0) {
      return DomainError.invalidInput("최대 가격은 0 이상이어야 합니다");
    }

    if (request.minPrice !== undefined && request.maxPrice !== undefined) {
      if (request.minPrice > request.maxPrice) {
        return DomainError.invalidInput(
          "최소 가격은 최대 가격보다 클 수 없습니다"
        );
      }
    }

    return null;
  }

  private generateCacheKey(request: GetProductListRequest): string {
    const keyParts = [
      this.CACHE_KEY_PREFIX,
      `page:${request.page || this.DEFAULT_PAGE}`,
      `limit:${request.limit || this.DEFAULT_LIMIT}`,
      request.categoryId ? `cat:${request.categoryId}` : "",
      request.search ? `search:${request.search}` : "",
      request.brand ? `brand:${request.brand}` : "",
      request.minPrice ? `minPrice:${request.minPrice}` : "",
      request.maxPrice ? `maxPrice:${request.maxPrice}` : "",
      request.sortBy ? `sort:${request.sortBy}` : "",
    ]
      .filter(Boolean)
      .join("|");

    return keyParts;
  }

  private async getTotalCount(
    search: string,
    filters: SearchFilters
  ): Promise<number> {
    // ProductRepository의 countProducts 메서드가 없는 경우 search로 대체
    // 실제로는 별도 count 메서드가 있어야 성능상 좋음
    const allProducts = await this.productRepository.search(
      search,
      filters,
      999999,
      0
    );
    return allProducts.length;
  }

  private async enrichProductsWithDetails(products: Product[]): Promise<any[]> {
    const enrichedProducts = [];

    for (const product of products) {
      // 카테고리 정보 조회
      const category = await this.categoryRepository.findById(
        product.getCategoryId()
      );
      if (!category) continue; // 카테고리가 없는 상품은 제외

      // 재고 정보 조회
      const inventory = await this.inventoryRepository.findByProductId(
        product.getId()
      );

      const enrichedProduct: any = {
        id: product.getId(),
        name: product.getName(),
        description: product.getDescription(),
        price: product.getPrice(),
        sku: product.getSku(),
        brand: product.getBrand(),
        tags: product.getTags(),
        slug: product.generateSlug(),
        category: {
          id: category.getId(),
          name: category.getName(),
          slug: category.getSlug(),
        },
        inventory: {
          availableQuantity: inventory ? inventory.getAvailableQuantity() : 0,
          status: inventory ? inventory.getStatus() : "out_of_stock",
        },
        createdAt: product.getCreatedAt(),
      };

      // discountPrice가 존재하는 경우에만 추가
      const discountPrice = product.getDiscountPrice();
      if (discountPrice !== undefined) {
        enrichedProduct.discountPrice = discountPrice;
      }

      enrichedProducts.push(enrichedProduct);
    }

    return enrichedProducts;
  }

  private buildResponse(
    products: any[],
    page: number,
    limit: number,
    totalItems: number,
    originalRequest: GetProductListRequest
  ): ProductListResponse {
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const responseFilters: any = {
      appliedCategory: originalRequest.categoryId,
      appliedSearch: originalRequest.search,
      appliedBrand: originalRequest.brand,
      appliedSortBy: originalRequest.sortBy,
    };

    // appliedPriceRange 조건부 추가
    if (
      originalRequest.minPrice !== undefined ||
      originalRequest.maxPrice !== undefined
    ) {
      responseFilters.appliedPriceRange = {};
      if (originalRequest.minPrice !== undefined) {
        responseFilters.appliedPriceRange.min = originalRequest.minPrice;
      }
      if (originalRequest.maxPrice !== undefined) {
        responseFilters.appliedPriceRange.max = originalRequest.maxPrice;
      }
    }

    return {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage,
        hasPreviousPage,
      },
      filters: responseFilters,
    };
  }
}
