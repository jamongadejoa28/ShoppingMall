// ========================================
// CreateProductUseCase 테스트 - TDD 방식
// src/usecases/__tests__/CreateProductUseCase.test.ts
// ========================================

import { CreateProductUseCase } from "../CreateProductUseCase";
import { Product } from "../../entities/Product";
import { Category } from "../../entities/Category";
import { Inventory } from "../../entities/Inventory";

// Mock 인터페이스들
interface MockProductRepository {
  save: jest.Mock;
  findByEmail: jest.Mock;
  findById: jest.Mock;
  findBySku: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
}

interface MockCategoryRepository {
  findById: jest.Mock;
  save: jest.Mock;
  findBySlug: jest.Mock;
  findChildren: jest.Mock;
}

interface MockInventoryRepository {
  save: jest.Mock;
  findByProductId: jest.Mock;
  update: jest.Mock;
}

interface MockEventPublisher {
  publish: jest.Mock;
}

describe("CreateProductUseCase", () => {
  let useCase: CreateProductUseCase;
  let mockProductRepository: MockProductRepository;
  let mockCategoryRepository: MockCategoryRepository;
  let mockInventoryRepository: MockInventoryRepository;
  let mockEventPublisher: MockEventPublisher;

  beforeEach(() => {
    // Mock Repository 생성
    mockProductRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findBySku: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockCategoryRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findBySlug: jest.fn(),
      findChildren: jest.fn(),
    };

    mockInventoryRepository = {
      save: jest.fn(),
      findByProductId: jest.fn(),
      update: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
    };

    // UseCase 인스턴스 생성
    useCase = new CreateProductUseCase(
      mockProductRepository as any,
      mockCategoryRepository as any,
      mockInventoryRepository as any,
      mockEventPublisher as any
    );
  });

  describe("성공적인 상품 생성", () => {
    it("유효한 데이터로 상품을 생성할 수 있어야 한다", async () => {
      // Given
      const request = {
        name: "MacBook Pro 16인치",
        description: "Apple M3 Pro 칩, 18GB 메모리, 512GB SSD",
        price: 3190000,
        categoryId: "category-123",
        brand: "Apple",
        sku: "MBP-16-M3-512",
        weight: 2.1,
        dimensions: {
          width: 35.57,
          height: 24.81,
          depth: 1.68,
        },
        tags: ["laptop", "apple", "macbook", "professional"],
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 카테고리 존재 확인
      const mockCategory = Category.createRoot({
        name: "컴퓨터",
        description: "컴퓨터 카테고리",
        slug: "computers",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      // Mock SKU 중복 없음
      mockProductRepository.findBySku.mockResolvedValue(null);

      // Mock 저장 성공
      const savedProduct = Product.create({
        name: request.name,
        description: request.description,
        price: request.price,
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
        weight: request.weight,
        dimensions: request.dimensions,
        tags: request.tags,
      });
      mockProductRepository.save.mockResolvedValue(savedProduct);

      const savedInventory = Inventory.create({
        productId: savedProduct.getId(),
        quantity: request.initialStock.quantity,
        reservedQuantity: 0,
        lowStockThreshold: request.initialStock.lowStockThreshold,
        location: request.initialStock.location,
      });
      mockInventoryRepository.save.mockResolvedValue(savedInventory);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.product).toBeDefined();
      expect(result.data?.inventory).toBeDefined();

      // Repository 호출 확인
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(
        request.categoryId
      );
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(request.sku);
      expect(mockProductRepository.save).toHaveBeenCalledWith(
        expect.any(Product)
      );
      expect(mockInventoryRepository.save).toHaveBeenCalledWith(
        expect.any(Inventory)
      );

      // 이벤트 발행 확인
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ProductCreated",
          productId: savedProduct.getId(),
        })
      );
    });

    it("태그 없이도 상품을 생성할 수 있어야 한다", async () => {
      // Given
      const request = {
        name: "iPhone 15 Pro",
        description: "티타늄 디자인, A17 Pro 칩",
        price: 1550000,
        categoryId: "category-456",
        brand: "Apple",
        sku: "IPH-15-PRO-256",
        weight: 0.187,
        initialStock: {
          quantity: 100,
          location: "WAREHOUSE-B",
          lowStockThreshold: 20,
        },
        // tags 없음
      };

      // Mock 설정
      const mockCategory = Category.createRoot({
        name: "스마트폰",
        description: "스마트폰 카테고리",
        slug: "smartphones",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.findBySku.mockResolvedValue(null);

      const savedProduct = Product.create({
        name: request.name,
        description: request.description,
        price: request.price,
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
        weight: request.weight,
      });
      mockProductRepository.save.mockResolvedValue(savedProduct);

      const savedInventory = Inventory.create({
        productId: savedProduct.getId(),
        quantity: request.initialStock.quantity,
        reservedQuantity: 0,
        lowStockThreshold: request.initialStock.lowStockThreshold,
        location: request.initialStock.location,
      });
      mockInventoryRepository.save.mockResolvedValue(savedInventory);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);
      expect(result.data?.product).toBeDefined();
      expect(result.data?.inventory).toBeDefined();
    });
  });

  describe("유효성 검증 실패", () => {
    it("필수 필드가 누락되면 에러를 반환해야 한다", async () => {
      // Given
      const invalidRequest = {
        name: "", // 빈 이름
        description: "설명",
        price: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // When
      const result = await useCase.execute(invalidRequest);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("상품명은 필수입니다");

      // Repository 호출되지 않음
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    it("가격이 0 이하이면 에러를 반환해야 한다", async () => {
      // Given
      const invalidRequest = {
        name: "상품명",
        description: "설명",
        price: -1000, // 음수 가격
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // When
      const result = await useCase.execute(invalidRequest);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("가격은 0보다 커야 합니다");
    });

    it("초기 재고가 음수이면 에러를 반환해야 한다", async () => {
      // Given
      const invalidRequest = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: -10, // 음수 재고
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // When
      const result = await useCase.execute(invalidRequest);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("재고 수량은 0 이상이어야 합니다");
    });
  });

  describe("비즈니스 규칙 검증 실패", () => {
    it("존재하지 않는 카테고리면 에러를 반환해야 한다", async () => {
      // Given
      const request = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "nonexistent-category",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 카테고리 없음
      mockCategoryRepository.findById.mockResolvedValue(null);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("카테고리를 찾을 수 없습니다");

      // 상품 저장되지 않음
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it("SKU가 중복되면 에러를 반환해야 한다", async () => {
      // Given
      const request = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "DUPLICATE-SKU",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 카테고리 존재
      const mockCategory = Category.createRoot({
        name: "카테고리",
        description: "설명",
        slug: "category",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);

      // Mock SKU 중복
      const existingProduct = Product.create({
        name: "기존 상품",
        description: "기존 설명",
        price: 20000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "DUPLICATE-SKU",
      });
      mockProductRepository.findBySku.mockResolvedValue(existingProduct);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("이미 존재하는 SKU입니다");

      // 상품 저장되지 않음
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it("비활성화된 카테고리면 에러를 반환해야 한다", async () => {
      // Given
      const request = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "inactive-category",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 비활성화된 카테고리
      const inactiveCategory = Category.createRoot({
        name: "비활성 카테고리",
        description: "설명",
        slug: "inactive-category",
      });
      inactiveCategory.deactivate();
      mockCategoryRepository.findById.mockResolvedValue(inactiveCategory);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "비활성화된 카테고리에는 상품을 등록할 수 없습니다"
      );
    });
  });

  describe("Repository 오류 처리", () => {
    it("상품 저장 실패 시 에러를 반환해야 한다", async () => {
      // Given
      const request = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 설정
      const mockCategory = Category.createRoot({
        name: "카테고리",
        description: "설명",
        slug: "category",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.findBySku.mockResolvedValue(null);

      // Mock 저장 실패
      mockProductRepository.save.mockRejectedValue(
        new Error("Database connection failed")
      );

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("상품 저장에 실패했습니다");

      // 재고는 저장되지 않아야 함
      expect(mockInventoryRepository.save).not.toHaveBeenCalled();
    });

    it("재고 저장 실패 시 에러를 반환해야 한다", async () => {
      // Given
      const request = {
        name: "상품명",
        description: "설명",
        price: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
        initialStock: {
          quantity: 50,
          location: "WAREHOUSE-A",
          lowStockThreshold: 10,
        },
      };

      // Mock 설정
      const mockCategory = Category.createRoot({
        name: "카테고리",
        description: "설명",
        slug: "category",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.findBySku.mockResolvedValue(null);

      const savedProduct = Product.create({
        name: request.name,
        description: request.description,
        price: request.price,
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
      });
      mockProductRepository.save.mockResolvedValue(savedProduct);

      // Mock 재고 저장 실패
      mockInventoryRepository.save.mockRejectedValue(
        new Error("Inventory save failed")
      );

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(false);
      expect(result.error).toContain("재고 생성에 실패했습니다");
    });
  });

  describe("트랜잭션 처리", () => {
    it("상품 생성 성공 시 도메인 이벤트를 발행해야 한다", async () => {
      // Given
      const request = {
        name: "테스트 상품",
        description: "테스트 설명",
        price: 50000,
        categoryId: "category-123",
        brand: "TestBrand",
        sku: "TEST-001",
        initialStock: {
          quantity: 30,
          location: "WAREHOUSE-A",
          lowStockThreshold: 5,
        },
      };

      // Mock 설정
      const mockCategory = Category.createRoot({
        name: "테스트 카테고리",
        description: "설명",
        slug: "test-category",
      });
      mockCategoryRepository.findById.mockResolvedValue(mockCategory);
      mockProductRepository.findBySku.mockResolvedValue(null);

      const savedProduct = Product.create({
        name: request.name,
        description: request.description,
        price: request.price,
        categoryId: request.categoryId,
        brand: request.brand,
        sku: request.sku,
      });
      mockProductRepository.save.mockResolvedValue(savedProduct);

      const savedInventory = Inventory.create({
        productId: savedProduct.getId(),
        quantity: request.initialStock.quantity,
        reservedQuantity: 0,
        lowStockThreshold: request.initialStock.lowStockThreshold,
        location: request.initialStock.location,
      });
      mockInventoryRepository.save.mockResolvedValue(savedInventory);

      // When
      const result = await useCase.execute(request);

      // Then
      expect(result.success).toBe(true);

      // 도메인 이벤트 발행 확인
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(2);

      // 상품 생성 이벤트
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ProductCreated",
          productId: savedProduct.getId(),
          productName: request.name,
          categoryId: request.categoryId,
        })
      );

      // 재고 생성 이벤트
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "InventoryCreated",
          productId: savedProduct.getId(),
          quantity: request.initialStock.quantity,
          location: request.initialStock.location,
        })
      );
    });
  });
});
