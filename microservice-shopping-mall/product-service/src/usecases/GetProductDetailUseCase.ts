// src/usecases/GetProductDetailUseCase.ts

import { Product } from "../entities/Product";
import { Category } from "../entities/Category";
import { Inventory } from "../entities/Inventory";
import { ProductRepository } from "../repositories/ProductRepository";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { InventoryRepository } from "../repositories/InventoryRepository";
import { CacheService } from "../services/CacheService";
import { DomainError } from "../shared/errors/DomainError";
import { Result } from "../shared/types/Result";

// 응답 DTO 타입 정의
export interface ProductDetailResponse {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number; // optional로 변경
  sku: string;
  brand: string;
  tags: string[];
  isActive: boolean;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    lowStockThreshold: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class GetProductDetailUseCase {
  private readonly CACHE_TTL = 300; // 5분
  private readonly CACHE_KEY_PREFIX = "product_detail:";

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly cacheService: CacheService
  ) {}

  async execute(productId: string): Promise<Result<ProductDetailResponse>> {
    try {
      // 1. 입력값 유효성 검증
      const validationError = this.validateInput(productId);
      if (validationError) {
        return Result.fail(validationError);
      }

      // 2. 캐시에서 먼저 조회
      const cacheKey = `${this.CACHE_KEY_PREFIX}${productId}`;
      const cachedData =
        await this.cacheService.get<ProductDetailResponse>(cacheKey);

      if (cachedData) {
        return Result.ok(cachedData);
      }

      // 3. Repository에서 데이터 조회
      const product = await this.productRepository.findById(productId);
      if (!product) {
        return Result.fail(DomainError.productNotFound());
      }

      // 4. 비즈니스 규칙 검증
      const businessError = this.validateBusinessRules(product);
      if (businessError) {
        return Result.fail(businessError);
      }

      // 5. 카테고리 정보 조회 및 검증
      const category = await this.categoryRepository.findById(
        product.getCategoryId()
      );
      if (!category) {
        return Result.fail(DomainError.categoryNotFound());
      }

      if (!category.isActive()) {
        return Result.fail(DomainError.categoryInactive());
      }

      // 6. 재고 정보 조회 (없어도 진행)
      const inventory =
        await this.inventoryRepository.findByProductId(productId);

      // 7. 응답 데이터 구성
      const responseData = this.buildResponse(product, category, inventory);

      // 8. 캐시에 저장
      await this.cacheService.set(cacheKey, responseData, this.CACHE_TTL);

      return Result.ok(responseData);
    } catch (error) {
      if (error instanceof Error) {
        return Result.fail(error);
      }
      return Result.fail(
        new Error("상품 상세 조회 중 예상치 못한 오류가 발생했습니다")
      );
    }
  }

  private validateInput(productId: string): DomainError | null {
    if (!productId || productId.trim() === "") {
      return DomainError.invalidInput("상품 ID는 필수입니다");
    }
    return null;
  }

  private validateBusinessRules(product: Product): DomainError | null {
    if (!product.isActive()) {
      return DomainError.productInactive();
    }
    return null;
  }

  private buildResponse(
    product: Product,
    category: Category,
    inventory: Inventory | null
  ): ProductDetailResponse {
    // 재고 정보 처리
    const inventoryInfo = inventory
      ? {
          availableQuantity: inventory.getAvailableQuantity(),
          reservedQuantity: inventory.getReservedQuantity(),
          status: inventory.getStatus(),
          lowStockThreshold: inventory.getLowStockThreshold(),
        }
      : {
          availableQuantity: 0,
          reservedQuantity: 0,
          status: "out_of_stock",
          lowStockThreshold: 0,
        };

    // SEO 정보 생성 (기본값으로 처리)
    const seoInfo = {
      title: `${product.getName()} - ${product.getBrand()}`,
      description: product.getDescription(),
      keywords: product.getTags(),
    };

    // discountPrice 처리 - undefined인 경우 제외
    const response: ProductDetailResponse = {
      id: product.getId(),
      name: product.getName(),
      description: product.getDescription(),
      price: product.getPrice(),
      sku: product.getSku(),
      brand: product.getBrand(),
      tags: product.getTags(),
      isActive: product.isActive(),
      slug: product.generateSlug(),
      category: {
        id: category.getId(),
        name: category.getName(),
        slug: category.getSlug(),
        description: category.getDescription(),
        isActive: category.isActive(),
      },
      inventory: inventoryInfo,
      seo: seoInfo,
      createdAt: product.getCreatedAt(),
      updatedAt: product.getUpdatedAt(),
    };

    // discountPrice가 존재하는 경우에만 추가
    const discountPrice = product.getDiscountPrice();
    if (discountPrice !== undefined) {
      response.discountPrice = discountPrice;
    }

    return response;
  }
}
