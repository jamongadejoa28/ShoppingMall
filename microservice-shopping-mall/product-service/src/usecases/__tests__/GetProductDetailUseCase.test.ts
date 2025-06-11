// src/usecases/__tests__/GetProductDetailUseCase.test.ts

import { GetProductDetailUseCase } from "../GetProductDetailUseCase";
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
      if (product.getCategoryId() === categoryId) {
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
      if (
        product.getName().toLowerCase().includes(query.toLowerCase()) ||
        product.getDescription().toLowerCase().includes(query.toLowerCase())
      ) {
        results.push(product);
      }
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

interface ProductDetailResponse {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  category: {
    name: string;
  };
  inventory: {
    availableQuantity: number;
    status: string;
  };
}

describe("GetProductDetailUseCase", () => {
  let useCase: GetProductDetailUseCase;
  let productRepository: MockProductRepository;
  let categoryRepository: MockCategoryRepository;
  let inventoryRepository: MockInventoryRepository;
  let cacheService: MockCacheService;

  beforeEach(() => {
    productRepository = new MockProductRepository();
    categoryRepository = new MockCategoryRepository();
    inventoryRepository = new MockInventoryRepository();
    cacheService = new MockCacheService();

    useCase = new GetProductDetailUseCase(
      productRepository,
      categoryRepository,
      inventoryRepository,
      cacheService
    );
  });

  describe("성공적인 상품 상세 조회", () => {
    it("활성화된 상품의 상세 정보를 조회할 수 있어야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "전자제품",
        slug: "electronics",
        description: "전자제품 카테고리",
      });
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "아이폰 15",
        description: "최신 아이폰",
        price: 1200000,
        sku: "IPHONE15-001",
        categoryId: category.getId(),
        brand: "Apple",
        tags: ["스마트폰", "애플"],
      });
      productRepository.addProduct(product);

      const inventory = Inventory.create({
        productId: product.getId(),
        quantity: 100,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      });
      inventoryRepository.addInventory(inventory);

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(product.getId());
      expect(result.data!.name).toBe("아이폰 15");
      expect(result.data!.price).toBe(1200000);
      expect(result.data!.isActive).toBe(true);
      expect(result.data!.category).toBeDefined();
      expect(result.data!.category.name).toBe("전자제품");
      expect(result.data!.inventory).toBeDefined();
      expect(result.data!.inventory.availableQuantity).toBe(100);
      expect(result.data!.inventory.status).toBe("sufficient");
    });

    it("캐시된 상품 정보를 반환해야 한다", async () => {
      // Given
      const productId = "test-product-id";
      const cachedData: ProductDetailResponse = {
        id: productId,
        name: "캐시된 상품",
        price: 50000,
        isActive: true,
        category: { name: "테스트 카테고리" },
        inventory: { availableQuantity: 10, status: "sufficient" },
      };

      await cacheService.set(`product_detail:${productId}`, cachedData, 300);

      // When
      const result = await useCase.execute(productId);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedData);
    });
  });

  describe("상품이 존재하지 않는 경우", () => {
    it("상품 ID가 존재하지 않으면 에러를 반환해야 한다", async () => {
      // Given
      const nonExistentProductId = "non-existent-id";

      // When
      const result = await useCase.execute(nonExistentProductId);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품을 찾을 수 없습니다");
      expect((result.error as DomainError)?.code).toBe("PRODUCT_NOT_FOUND");
    });
  });

  describe("비활성화된 상품 처리", () => {
    it("비활성화된 상품에 대해 에러를 반환해야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "전자제품",
        slug: "electronics",
        description: "전자제품 카테고리",
      });
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "비활성 상품",
        description: "비활성화된 상품",
        price: 100000,
        sku: "INACTIVE-001",
        categoryId: category.getId(),
        brand: "TestBrand",
      });
      product.deactivate();
      productRepository.addProduct(product);

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품이 비활성화 상태입니다");
      expect((result.error as DomainError)?.code).toBe("PRODUCT_INACTIVE");
    });
  });

  describe("카테고리 정보 연동", () => {
    it("카테고리가 존재하지 않으면 에러를 반환해야 한다", async () => {
      // Given
      const product = Product.create({
        name: "고아 상품",
        description: "카테고리가 없는 상품",
        price: 100000,
        sku: "ORPHAN-001",
        categoryId: "non-existent-category-id",
        brand: "TestBrand",
      });
      productRepository.addProduct(product);

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품의 카테고리를 찾을 수 없습니다");
      expect((result.error as DomainError)?.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("비활성화된 카테고리의 상품에 대해 에러를 반환해야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "비활성 카테고리",
        slug: "inactive-category",
        description: "비활성화된 카테고리",
      });
      category.deactivate();
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "상품",
        description: "비활성 카테고리의 상품",
        price: 100000,
        sku: "PRODUCT-001",
        categoryId: category.getId(),
        brand: "TestBrand",
      });
      productRepository.addProduct(product);

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe(
        "상품의 카테고리가 비활성화 상태입니다"
      );
      expect((result.error as DomainError)?.code).toBe("CATEGORY_INACTIVE");
    });
  });

  describe("재고 정보 연동", () => {
    it("재고 정보가 없어도 상품 정보를 조회할 수 있어야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "전자제품",
        slug: "electronics",
        description: "전자제품 카테고리",
      });
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "재고 없는 상품",
        description: "재고 정보가 없는 상품",
        price: 100000,
        sku: "NO-INVENTORY-001",
        categoryId: category.getId(),
        brand: "TestBrand",
      });
      productRepository.addProduct(product);

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(true);
      expect(result.data!.inventory).toEqual({
        availableQuantity: 0,
        reservedQuantity: 0,
        status: "out_of_stock",
        lowStockThreshold: 0,
      });
    });
  });

  describe("입력값 유효성 검증", () => {
    it("상품 ID가 빈 문자열이면 에러를 반환해야 한다", async () => {
      // When
      const result = await useCase.execute("");

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품 ID는 필수입니다");
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("상품 ID가 null이면 에러를 반환해야 한다", async () => {
      // When
      const result = await useCase.execute(null as any);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품 ID는 필수입니다");
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });

    it("상품 ID가 undefined이면 에러를 반환해야 한다", async () => {
      // When
      const result = await useCase.execute(undefined as any);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error?.message).toBe("상품 ID는 필수입니다");
      expect((result.error as DomainError)?.code).toBe("INVALID_INPUT");
    });
  });

  describe("캐시 처리", () => {
    it("조회한 상품 정보를 캐시에 저장해야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "전자제품",
        slug: "electronics",
        description: "전자제품 카테고리",
      });
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "아이폰 15",
        description: "최신 아이폰",
        price: 1200000,
        sku: "IPHONE15-001",
        categoryId: category.getId(),
        brand: "Apple",
      });
      productRepository.addProduct(product);

      const inventory = Inventory.create({
        productId: product.getId(),
        quantity: 100,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      });
      inventoryRepository.addInventory(inventory);

      // When
      await useCase.execute(product.getId());

      // Then
      const cachedData = await cacheService.get<ProductDetailResponse>(
        `product_detail:${product.getId()}`
      );
      expect(cachedData).toBeDefined();
      expect(cachedData!.id).toBe(product.getId());
      expect(cachedData!.name).toBe("아이폰 15");
    });
  });

  describe("Repository 오류 처리", () => {
    it("ProductRepository 오류 시 에러를 반환해야 한다", async () => {
      // Given
      const productId = "test-product-id";
      jest
        .spyOn(productRepository, "findById")
        .mockRejectedValue(new Error("Database error"));

      // When
      const result = await useCase.execute(productId);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Database error");
    });

    it("CategoryRepository 오류 시 에러를 반환해야 한다", async () => {
      // Given
      const category = Category.createRoot({
        name: "전자제품",
        slug: "electronics",
        description: "전자제품 카테고리",
      });
      categoryRepository.addCategory(category);

      const product = Product.create({
        name: "상품",
        description: "테스트 상품",
        price: 100000,
        sku: "TEST-001",
        categoryId: category.getId(),
        brand: "TestBrand",
      });
      productRepository.addProduct(product);

      jest
        .spyOn(categoryRepository, "findById")
        .mockRejectedValue(new Error("Category DB error"));

      // When
      const result = await useCase.execute(product.getId());

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Category DB error");
    });
  });
});
