// src/usecases/__tests__/GetProductListUseCase.test.ts

import { GetProductListUseCase } from "../GetProductListUseCase";
import { Product } from "../../entities/Product";
import { Category } from "../../entities/Category";
import { Inventory } from "../../entities/Inventory";
import { ProductRepository } from "../../repositories/ProductRepository";
import { CategoryRepository } from "../../repositories/CategoryRepository";
import { InventoryRepository } from "../../repositories/InventoryRepository";
import { CacheService } from "../../services/CacheService";
import { DomainError } from "../../shared/errors/DomainError";

// Mock implementations
class MockProductRepository implements ProductRepository {
  private products: Map<string, Product> = new Map();

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.getSku() === sku) {
        return product;
      }
    }
    return null;
  }

  async save(product: Product): Promise<Product> {
    this.products.set(product.getId(), product);
    return product;
  }

  async findByCategory(
    categoryId: string,
    limit?: number,
    offset?: number
  ): Promise<Product[]> {
    const results: Product[] = [];
    for (const product of this.products.values()) {
      if (product.getCategoryId() === categoryId && product.isActive()) {
        results.push(product);
      }
    }
    return results.slice(
      offset || 0,
      (offset || 0) + (limit || results.length)
    );
  }

  async search(
    query: string,
    filters?: any,
    limit?: number,
    offset?: number
  ): Promise<Product[]> {
    const results: Product[] = [];
    for (const product of this.products.values()) {
      if (!product.isActive()) continue;

      const matchesSearch =
        query === "" ||
        product.getName().toLowerCase().includes(query.toLowerCase()) ||
        product.getDescription().toLowerCase().includes(query.toLowerCase()) ||
        product.getBrand().toLowerCase().includes(query.toLowerCase()) ||
        product
          .getTags()
          .some((tag) => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesCategory =
        !filters?.categoryId || product.getCategoryId() === filters.categoryId;
      const matchesBrand =
        !filters?.brand ||
        product.getBrand().toLowerCase() === filters.brand.toLowerCase();
      const matchesPrice =
        (!filters?.minPrice || product.getPrice() >= filters.minPrice) &&
        (!filters?.maxPrice || product.getPrice() <= filters.maxPrice);

      if (matchesSearch && matchesCategory && matchesBrand && matchesPrice) {
        results.push(product);
      }
    }

    // 정렬 처리
    if (filters?.sortBy) {
      results.sort((a, b) => {
        switch (filters.sortBy) {
          case "price_asc":
            return a.getPrice() - b.getPrice();
          case "price_desc":
            return b.getPrice() - a.getPrice();
          case "name_asc":
            return a.getName().localeCompare(b.getName());
          case "name_desc":
            return b.getName().localeCompare(a.getName());
          case "created_desc":
            return b.getCreatedAt().getTime() - a.getCreatedAt().getTime();
          default:
            return 0;
        }
      });
    }

    return results.slice(
      offset || 0,
      (offset || 0) + (limit || results.length)
    );
  }

  // Test helper method
  addProduct(product: Product): void {
    this.products.set(product.getId(), product);
  }

  // 전체 상품 수 조회 (페이지네이션용)
  async countProducts(filters?: any): Promise<number> {
    let count = 0;
    for (const product of this.products.values()) {
      if (!product.isActive()) continue;

      const matchesCategory =
        !filters?.categoryId || product.getCategoryId() === filters.categoryId;
      const matchesBrand =
        !filters?.brand ||
        product.getBrand().toLowerCase() === filters.brand.toLowerCase();
      const matchesPrice =
        (!filters?.minPrice || product.getPrice() >= filters.minPrice) &&
        (!filters?.maxPrice || product.getPrice() <= filters.maxPrice);

      if (matchesCategory && matchesBrand && matchesPrice) {
        count++;
      }
    }
    return count;
  }
}

class MockCategoryRepository implements CategoryRepository {
  private categories: Map<string, Category> = new Map();

  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    for (const category of this.categories.values()) {
      if (category.getSlug() === slug) {
        return category;
      }
    }
    return null;
  }

  async save(category: Category): Promise<Category> {
    this.categories.set(category.getId(), category);
    return category;
  }

  async findChildren(parentId: string): Promise<Category[]> {
    const results: Category[] = [];
    for (const category of this.categories.values()) {
      if (category.getParentId() === parentId) {
        results.push(category);
      }
    }
    return results;
  }

  async findByDepth(depth: number): Promise<Category[]> {
    const results: Category[] = [];
    for (const category of this.categories.values()) {
      if (category.getDepth() === depth) {
        results.push(category);
      }
    }
    return results;
  }

  // Test helper method
  addCategory(category: Category): void {
    this.categories.set(category.getId(), category);
  }
}

class MockInventoryRepository implements InventoryRepository {
  private inventories: Map<string, Inventory> = new Map();

  async findByProductId(productId: string): Promise<Inventory | null> {
    return this.inventories.get(productId) || null;
  }

  async save(inventory: Inventory): Promise<Inventory> {
    this.inventories.set(inventory.getProductId(), inventory);
    return inventory;
  }

  async findLowStock(threshold: number): Promise<Inventory[]> {
    const results: Inventory[] = [];
    for (const inventory of this.inventories.values()) {
      if (inventory.getAvailableQuantity() <= threshold) {
        results.push(inventory);
      }
    }
    return results;
  }

  async findOutOfStock(): Promise<Inventory[]> {
    const results: Inventory[] = [];
    for (const inventory of this.inventories.values()) {
      if (inventory.isOutOfStock()) {
        results.push(inventory);
      }
    }
    return results;
  }

  // Test helper method
  addInventory(inventory: Inventory): void {
    this.inventories.set(inventory.getProductId(), inventory);
  }
}

class MockCacheService implements CacheService {
  private cache: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  // Test helper method
  clear(): void {
    this.cache.clear();
  }
}

// 상품 목록 조회 요청 DTO
interface GetProductListRequest {
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
interface ProductListResponse {
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

describe("GetProductListUseCase", () => {
  let useCase: GetProductListUseCase;
  let productRepository: MockProductRepository;
  let categoryRepository: MockCategoryRepository;
  let inventoryRepository: MockInventoryRepository;
  let cacheService: MockCacheService;

  // 테스트 데이터 준비
  let category1: Category;
  let category2: Category;
  let products: Product[];
  let inventories: Inventory[];

  beforeEach(() => {
    productRepository = new MockProductRepository();
    categoryRepository = new MockCategoryRepository();
    inventoryRepository = new MockInventoryRepository();
    cacheService = new MockCacheService();

    useCase = new GetProductListUseCase(
      productRepository,
      categoryRepository,
      inventoryRepository,
      cacheService
    );

    // 테스트 데이터 설정
    setupTestData();
  });

  function setupTestData() {
    // 카테고리 생성
    category1 = Category.createRoot({
      name: "전자제품",
      slug: "electronics",
      description: "전자제품 카테고리",
    });
    category2 = Category.createRoot({
      name: "의류",
      slug: "clothing",
      description: "의류 카테고리",
    });

    categoryRepository.addCategory(category1);
    categoryRepository.addCategory(category2);

    // 상품 생성
    products = [
      Product.create({
        name: "아이폰 15",
        description: "최신 스마트폰",
        price: 1200000,
        sku: "IPHONE15-001",
        categoryId: category1.getId(),
        brand: "Apple",
        tags: ["스마트폰", "애플"],
      }),
      Product.create({
        name: "갤럭시 S24",
        description: "삼성 플래그십 스마트폰",
        price: 1100000,
        sku: "GALAXY-S24-001",
        categoryId: category1.getId(),
        brand: "Samsung",
        tags: ["스마트폰", "삼성"],
      }),
      Product.create({
        name: "나이키 운동화",
        description: "편안한 러닝화",
        price: 150000,
        sku: "NIKE-SHOES-001",
        categoryId: category2.getId(),
        brand: "Nike",
        tags: ["운동화", "러닝"],
      }),
      Product.create({
        name: "아디다스 트레이닝복",
        description: "고품질 운동복",
        price: 80000,
        sku: "ADIDAS-WEAR-001",
        categoryId: category2.getId(),
        brand: "Adidas",
        tags: ["운동복", "트레이닝"],
      }),
    ];

    products.forEach((product) => productRepository.addProduct(product));

    // 재고 생성
    inventories = products.map((product) =>
      Inventory.create({
        productId: product.getId(),
        quantity: 100,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      })
    );

    inventories.forEach((inventory) =>
      inventoryRepository.addInventory(inventory)
    );
  }

  describe("기본 상품 목록 조회", () => {
    it("전체 상품 목록을 조회할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.products).toHaveLength(4);
      expect(result.data!.pagination.totalItems).toBe(4);
      expect(result.data!.pagination.currentPage).toBe(1);
      expect(result.data!.pagination.totalPages).toBe(1);
      expect(result.data!.pagination.hasNextPage).toBe(false);
      expect(result.data!.pagination.hasPreviousPage).toBe(false);
    });

    it("기본값으로 조회할 수 있어야 한다 (page=1, limit=20)", async () => {
      // Given
      const request: GetProductListRequest = {};

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(4);
      expect(result.data!.pagination.currentPage).toBe(1);
    });
  });

  describe("페이지네이션", () => {
    it("페이지별로 상품을 조회할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        limit: 2,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(result.data!.pagination.currentPage).toBe(1);
      expect(result.data!.pagination.totalPages).toBe(2);
      expect(result.data!.pagination.hasNextPage).toBe(true);
      expect(result.data!.pagination.hasPreviousPage).toBe(false);
    });

    it("두 번째 페이지를 조회할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 2,
        limit: 2,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(result.data!.pagination.currentPage).toBe(2);
      expect(result.data!.pagination.hasNextPage).toBe(false);
      expect(result.data!.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe("카테고리별 필터링", () => {
    it("특정 카테고리의 상품만 조회할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        categoryId: category1.getId(),
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(
        result.data!.products.every(
          (p: any) => p.category.id === category1.getId()
        )
      ).toBe(true);
      expect(result.data!.filters.appliedCategory).toBe(category1.getId());
    });

    it("존재하지 않는 카테고리로 조회하면 빈 결과를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        categoryId: "non-existent-category",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(0);
      expect(result.data!.pagination.totalItems).toBe(0);
    });
  });

  describe("검색 기능", () => {
    it("상품명으로 검색할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        search: "아이폰",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(1);
      expect(result.data!.products[0]!.name).toBe("아이폰 15");
      expect(result.data!.filters.appliedSearch).toBe("아이폰");
    });

    it("태그로 검색할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        search: "스마트폰",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(
        result.data!.products.every((p: any) => p.tags.includes("스마트폰"))
      ).toBe(true);
    });

    it("대소문자 구분 없이 검색할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        search: "apple", // 영어로 변경
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(1);
      expect(result.data!.products[0]!.brand).toBe("Apple"); // 브랜드로 확인
    });
  });

  describe("브랜드별 필터링", () => {
    it("특정 브랜드의 상품만 조회할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        brand: "Apple",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(1);
      expect(result.data!.products[0]!.brand).toBe("Apple");
      expect(result.data!.filters.appliedBrand).toBe("Apple");
    });
  });

  describe("가격 범위 필터링", () => {
    it("최소 가격으로 필터링할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        minPrice: 500000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(result.data!.products.every((p: any) => p.price >= 500000)).toBe(
        true
      );
      expect(result.data!.filters.appliedPriceRange?.min).toBe(500000);
    });

    it("최대 가격으로 필터링할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        maxPrice: 200000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(result.data!.products.every((p: any) => p.price <= 200000)).toBe(
        true
      );
      expect(result.data!.filters.appliedPriceRange?.max).toBe(200000);
    });

    it("가격 범위로 필터링할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        minPrice: 100000,
        maxPrice: 500000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(1); // 나이키 운동화(150,000원)만 해당
      expect(
        result.data!.products.every(
          (p: any) => p.price >= 100000 && p.price <= 500000
        )
      ).toBe(true);
    });
  });

  describe("정렬 기능", () => {
    it("가격 오름차순으로 정렬할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        sortBy: "price_asc",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(4);

      const prices = result.data!.products.map((p: any) => p.price);
      const sortedPrices = [...prices].sort((a, b) => a - b);
      expect(prices).toEqual(sortedPrices);
      expect(result.data!.filters.appliedSortBy).toBe("price_asc");
    });

    it("가격 내림차순으로 정렬할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        sortBy: "price_desc",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);

      const prices = result.data!.products.map((p: any) => p.price);
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    });

    it("상품명 오름차순으로 정렬할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        sortBy: "name_asc",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);

      const names = result.data!.products.map((p: any) => p.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe("복합 필터링", () => {
    it("카테고리 + 브랜드 + 가격 범위로 필터링할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        categoryId: category1.getId(),
        brand: "Apple",
        minPrice: 1000000,
        maxPrice: 1500000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(1);
      expect(result.data!.products[0]!.name).toBe("아이폰 15");
      expect(result.data!.products[0]!.brand).toBe("Apple");
      expect(result.data!.products[0]!.category.id).toBe(category1.getId());
    });

    it("검색 + 정렬을 함께 사용할 수 있어야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        search: "스마트폰",
        sortBy: "price_desc",
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.products).toHaveLength(2);
      expect(result.data!.products[0]!.price).toBeGreaterThan(
        result.data!.products[1]!.price
      );
    });
  });

  describe("입력값 유효성 검증", () => {
    it("페이지가 0 이하이면 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 0,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("limit이 0 이하이면 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        limit: 0,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("limit이 최대값을 초과하면 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        limit: 101, // 최대 100개
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("최소 가격이 음수이면 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        minPrice: -1000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("최소 가격이 최대 가격보다 크면 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        minPrice: 200000,
        maxPrice: 100000,
        page: 1,
        limit: 10,
      };

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });
  });

  describe("캐시 처리", () => {
    it("동일한 조건의 조회 결과를 캐시에서 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = {
        page: 1,
        limit: 10,
        categoryId: category1.getId(),
      };

      // When - 첫 번째 호출
      const firstResult = await useCase.execute(request);

      // When - 두 번째 호출 (캐시에서 반환)
      const secondResult = await useCase.execute(request);

      // Then
      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(true);
      expect(firstResult.data).toEqual(secondResult.data);
    });
  });

  describe("Repository 오류 처리", () => {
    it("ProductRepository 오류 시 에러를 반환해야 한다", async () => {
      // Given
      const request: GetProductListRequest = { page: 1, limit: 10 };
      jest
        .spyOn(productRepository, "search")
        .mockRejectedValue(new Error("Database error"));

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Database error");
    });
  });
});
