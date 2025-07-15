// ========================================
// Product Entity 테스트 - TDD 방식
// src/entities/__tests__/Product.test.ts
// ========================================

import { Product } from "../Product";

describe("Product Entity", () => {
  describe("Product 생성", () => {
    it("유효한 데이터로 Product을 생성할 수 있어야 한다", () => {
      // Given
      const productData = {
        name: "MacBook Pro 16인치",
        description: "Apple M3 Pro 칩, 18GB 메모리, 512GB SSD",
        originalPrice: 3190000,
        categoryId: "category-123",
        brand: "Apple",
        sku: "MBP-16-M3-512",
        weight: 2.1,
        dimensions: {
          width: 35.57,
          height: 24.81,
          depth: 1.68,
        },
      };

      // When
      const product = Product.create(productData);

      // Then
      expect(product).toBeInstanceOf(Product);
      expect(product.getName()).toBe(productData.name);
      expect(product.getDescription()).toBe(productData.description);
      expect(product.getPrice()).toBe(productData.originalPrice);
      expect(product.getCategoryId()).toBe(productData.categoryId);
      expect(product.getBrand()).toBe(productData.brand);
      expect(product.getSku()).toBe(productData.sku);
      expect(product.getWeight()).toBe(productData.weight);
      expect(product.getDimensions()).toEqual(productData.dimensions);
      expect(product.isActive()).toBe(true); // 기본값
      expect(product.getCreatedAt()).toBeInstanceOf(Date);
      expect(product.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it("ID가 있는 Product을 복원할 수 있어야 한다", () => {
      // Given
      const existingProductData = {
        id: "product-123",
        name: "iPhone 15 Pro",
        description: "티타늄 디자인, A17 Pro 칩",
        originalPrice: 1550000,
        price: 1550000,
        categoryId: "category-456",
        brand: "Apple",
        sku: "IPH-15-PRO-256",
        weight: 0.187,
        dimensions: { width: 7.09, height: 14.67, depth: 0.83 },
        rating: 4.5,
        reviewCount: 128,
        isActive: true,
        isFeatured: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      };

      // When
      const product = Product.restore(existingProductData);

      // Then
      expect(product.getId()).toBe(existingProductData.id);
      expect(product.getName()).toBe(existingProductData.name);
      expect(product.getPrice()).toBe(existingProductData.price);
      expect(product.isActive()).toBe(true);
      expect(product.getCreatedAt()).toEqual(existingProductData.createdAt);
      expect(product.getUpdatedAt()).toEqual(existingProductData.updatedAt);
    });
  });

  describe("Product 유효성 검증", () => {
    it("상품명이 비어있으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "",
        description: "설명",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
      };

      // When & Then
      expect(() => Product.create(invalidData)).toThrow("상품명은 필수입니다");
    });

    it("상품명이 너무 길면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "A".repeat(201), // 200자 초과
        description: "설명",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
      };

      // When & Then
      expect(() => Product.create(invalidData)).toThrow(
        "상품명은 200자를 초과할 수 없습니다"
      );
    });

    it("가격이 0 이하면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "상품명",
        description: "설명",
        originalPrice: -1000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
      };

      // When & Then
      expect(() => Product.create(invalidData)).toThrow(
        "가격은 0보다 커야 합니다"
      );
    });

    it("SKU가 유효하지 않으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "상품명",
        description: "설명",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "invalid sku!", // 공백과 특수문자 포함
      };

      // When & Then
      expect(() => Product.create(invalidData)).toThrow(
        "SKU는 영문, 숫자, 하이픈만 허용됩니다"
      );
    });

    it("브랜드명이 너무 길면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "상품명",
        description: "설명",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "B".repeat(101), // 100자 초과
        sku: "SKU-123",
      };

      // When & Then
      expect(() => Product.create(invalidData)).toThrow(
        "브랜드명은 100자를 초과할 수 없습니다"
      );
    });
  });

  describe("Product 상태 관리", () => {
    let product: Product;

    beforeEach(() => {
      product = Product.create({
        name: "테스트 상품",
        description: "테스트 설명",
        originalPrice: 50000,
        categoryId: "category-123",
        brand: "TestBrand",
        sku: "TEST-001",
      });
    });

    it("상품을 비활성화할 수 있어야 한다", async () => {
      // When
      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 지연
      product.deactivate();

      // Then
      expect(product.isActive()).toBe(false);
      expect(product.getUpdatedAt().getTime()).toBeGreaterThan(
        product.getCreatedAt().getTime()
      );
    });

    it("상품을 활성화할 수 있어야 한다", () => {
      // Given
      product.deactivate();

      // When
      product.activate();

      // Then
      expect(product.isActive()).toBe(true);
    });

    it("상품 정보를 업데이트할 수 있어야 한다", async () => {
      // Given
      const updateData = {
        name: "업데이트된 상품명",
        description: "업데이트된 설명",
        price: 60000,
        originalPrice: 60000,
        brand: "UpdatedBrand",
      };
      const originalUpdatedAt = product.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms 지연
      product.updateDetails(updateData);

      // Then
      expect(product.getName()).toBe(updateData.name);
      expect(product.getDescription()).toBe(updateData.description);
      expect(product.getPrice()).toBe(updateData.price);
      expect(product.getBrand()).toBe(updateData.brand);
      expect(product.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("할인 여부를 확인할 수 있어야 한다", () => {
      // Given - originalPrice가 있는 상품 생성
      const productWithDiscount = Product.create({
        name: "할인 상품",
        description: "설명",
        originalPrice: 50000, // 할인 전 가격
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-DISCOUNT",
      });

      // Then
      expect(productWithDiscount.hasDiscount()).toBe(true);
      expect(productWithDiscount.getDiscountRate()).toBe(20); // 20% 할인
      expect(productWithDiscount.getDiscountAmount()).toBe(10000);
      expect(productWithDiscount.getDiscountPrice()).toBe(40000); // 현재 가격
    });

    it("할인이 없는 상품은 할인 방법이 undefined를 반환해야 한다", () => {
      // Given - originalPrice가 없는 상품
      const productWithoutDiscount = Product.create({
        name: "일반 상품",
        description: "설명",
        originalPrice: 50000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-NORMAL",
      });

      // Then
      expect(productWithoutDiscount.hasDiscount()).toBe(false);
      expect(productWithoutDiscount.getDiscountRate()).toBe(0);
      expect(productWithoutDiscount.getDiscountAmount()).toBe(0);
      expect(productWithoutDiscount.getDiscountPrice()).toBeUndefined();
    });
  });

  describe("Product 검색 및 필터링", () => {
    let product: Product;

    beforeEach(() => {
      product = Product.create({
        name: "MacBook Pro 16인치 M3",
        description: "Apple 실리콘 M3 Pro 칩셋이 탑재된 고성능 노트북",
        originalPrice: 3190000,
        categoryId: "category-123",
        brand: "Apple",
        sku: "MBP-16-M3-512",
        tags: ["laptop", "apple", "macbook", "professional"],
      });
    });

    it("상품명으로 검색 매치 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(product.matchesSearchQuery("macbook")).toBe(true);
      expect(product.matchesSearchQuery("MacBook")).toBe(true);
      expect(product.matchesSearchQuery("Pro")).toBe(true); // 실제 상품명에 있는 'Pro'
      expect(product.matchesSearchQuery("16인치")).toBe(true); // 실제 상품명에 있는 '16인치'
      expect(product.matchesSearchQuery("windows")).toBe(false);
    });

    it("태그로 검색 매치 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(product.matchesSearchQuery("laptop")).toBe(true);
      expect(product.matchesSearchQuery("professional")).toBe(true);
      expect(product.matchesSearchQuery("gaming")).toBe(false);
    });

    it("가격 범위 필터링을 할 수 있어야 한다", () => {
      // When & Then
      expect(product.isInPriceRange(2000000, 4000000)).toBe(true);
      expect(product.isInPriceRange(1000000, 2000000)).toBe(false);
      expect(product.isInPriceRange(4000000, 5000000)).toBe(false);
    });

    it("브랜드 매치 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(product.matchesBrand("Apple")).toBe(true);
      expect(product.matchesBrand("apple")).toBe(true);
      expect(product.matchesBrand("Samsung")).toBe(false);
    });
  });

  describe("Product 도메인 규칙", () => {
    it("상품이 판매 가능한 상태인지 확인할 수 있어야 한다", () => {
      // Given
      const product = Product.create({
        name: "판매 상품",
        description: "설명",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
      });

      // When & Then
      expect(product.isAvailableForSale()).toBe(true);

      // 비활성화 시
      product.deactivate();
      expect(product.isAvailableForSale()).toBe(false);
    });

    it("상품의 SEO 친화적 슬러그를 생성할 수 있어야 한다", () => {
      // Given
      const product = Product.create({
        name: "MacBook Pro 16인치 M3 Pro (512GB)",
        description: "설명",
        originalPrice: 3190000,
        categoryId: "category-123",
        brand: "Apple",
        sku: "MBP-16-M3-512",
      });

      // When
      const slug = product.generateSlug();

      // Then
      expect(slug).toBe("macbook-pro-16인치-m3-pro-512gb");
      expect(slug).not.toContain(" ");
      expect(slug).not.toContain("(");
      expect(slug).not.toContain(")");
    });

    it("상품 요약 정보를 제공할 수 있어야 한다", () => {
      // Given
      const product = Product.create({
        name: "테스트 상품",
        description:
          "이것은 매우 긴 상품 설명입니다. 상품의 다양한 특징과 기능을 자세히 설명하고 있습니다.",
        originalPrice: 10000,
        categoryId: "category-123",
        brand: "Brand",
        sku: "SKU-123",
      });

      // When
      const summary = product.getSummary();

      // Then
      expect(summary.id).toBe(product.getId());
      expect(summary.name).toBe(product.getName());
      expect(summary.price).toBe(product.getPrice());
      expect(summary.brand).toBe(product.getBrand());
      expect(summary.isActive).toBe(product.isActive());
      expect(summary.isFeatured).toBe(product.isFeatured());
      expect(summary.hasDiscount).toBe(product.hasDiscount());
    });
  });
});
