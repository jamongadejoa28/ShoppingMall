// ========================================
// Category Entity 테스트 - TDD 방식
// src/entities/__tests__/Category.test.ts
// ========================================

import { Category } from "../Category";

describe("Category Entity", () => {
  describe("Category 생성", () => {
    it("루트 카테고리를 생성할 수 있어야 한다", () => {
      // Given
      const categoryData = {
        name: "전자제품",
        description: "모든 전자제품 카테고리",
        slug: "electronics",
      };

      // When
      const category = Category.createRoot(categoryData);

      // Then
      expect(category).toBeInstanceOf(Category);
      expect(category.getName()).toBe(categoryData.name);
      expect(category.getDescription()).toBe(categoryData.description);
      expect(category.getSlug()).toBe(categoryData.slug);
      expect(category.getParentId()).toBeNull();
      expect(category.getDepth()).toBe(0);
      expect(category.isActive()).toBe(true);
      expect(category.getCreatedAt()).toBeInstanceOf(Date);
    });

    it("하위 카테고리를 생성할 수 있어야 한다", () => {
      // Given
      const parentData = {
        name: "전자제품",
        description: "전자제품 카테고리",
        slug: "electronics",
      };
      const parent = Category.createRoot(parentData);

      const childData = {
        name: "컴퓨터",
        description: "컴퓨터 관련 제품",
        slug: "computers",
        parentId: parent.getId(),
      };

      // When
      const child = Category.createChild(childData);

      // Then
      expect(child.getName()).toBe(childData.name);
      expect(child.getParentId()).toBe(parent.getId());
      expect(child.getDepth()).toBe(1);
      expect(child.isActive()).toBe(true);
    });

    it("기존 Category를 복원할 수 있어야 한다", () => {
      // Given
      const existingData = {
        id: "category-123",
        name: "노트북",
        description: "노트북 카테고리",
        slug: "laptops",
        parentId: "parent-456",
        depth: 2,
        isActive: true,
        productCount: 150,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-15"),
      };

      // When
      const category = Category.restore(existingData);

      // Then
      expect(category.getId()).toBe(existingData.id);
      expect(category.getName()).toBe(existingData.name);
      expect(category.getParentId()).toBe(existingData.parentId);
      expect(category.getDepth()).toBe(existingData.depth);
      expect(category.getProductCount()).toBe(existingData.productCount);
    });
  });

  describe("Category 유효성 검증", () => {
    it("카테고리명이 비어있으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "",
        description: "설명",
        slug: "test",
      };

      // When & Then
      expect(() => Category.createRoot(invalidData)).toThrow(
        "카테고리명은 필수입니다"
      );
    });

    it("카테고리명이 너무 길면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "A".repeat(101), // 100자 초과
        description: "설명",
        slug: "test",
      };

      // When & Then
      expect(() => Category.createRoot(invalidData)).toThrow(
        "카테고리명은 100자를 초과할 수 없습니다"
      );
    });

    it("슬러그가 유효하지 않으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "카테고리",
        description: "설명",
        slug: "invalid slug!", // 공백과 특수문자 포함
      };

      // When & Then
      expect(() => Category.createRoot(invalidData)).toThrow(
        "슬러그는 영문, 숫자, 하이픈만 허용됩니다"
      );
    });

    it("깊이가 최대값을 초과하면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        name: "깊은 카테고리",
        description: "설명",
        slug: "deep-category",
        parentId: "parent-123",
      };

      // When & Then
      expect(() => Category.createChild(invalidData, 5)).toThrow(
        "카테고리 깊이는 4를 초과할 수 없습니다"
      );
    });
  });

  describe("Category 계층 구조", () => {
    let rootCategory: Category;
    let level1Category: Category;
    let level2Category: Category;

    beforeEach(() => {
      rootCategory = Category.createRoot({
        name: "전자제품",
        description: "전자제품 카테고리",
        slug: "electronics",
      });

      level1Category = Category.createChild(
        {
          name: "컴퓨터",
          description: "컴퓨터 카테고리",
          slug: "computers",
          parentId: rootCategory.getId(),
        },
        0
      ); // rootCategory의 깊이 (0)

      level2Category = Category.createChild(
        {
          name: "노트북",
          description: "노트북 카테고리",
          slug: "laptops",
          parentId: level1Category.getId(),
        },
        1
      ); // level1Category의 깊이 (1)
    });

    it("카테고리 경로를 생성할 수 있어야 한다", () => {
      // Given
      const categoryPath = [rootCategory, level1Category, level2Category];

      // When
      const path = level2Category.generatePath(categoryPath);

      // Then
      expect(path).toBe("전자제품 > 컴퓨터 > 노트북");
    });

    it("루트 카테고리인지 확인할 수 있어야 한다", () => {
      // When & Then
      expect(rootCategory.isRoot()).toBe(true);
      expect(level1Category.isRoot()).toBe(false);
      expect(level2Category.isRoot()).toBe(false);
    });

    it("리프 카테고리인지 확인할 수 있어야 한다", () => {
      // Given
      const hasChildren = false; // 실제로는 DB에서 확인

      // When & Then
      expect(level2Category.isLeaf(hasChildren)).toBe(true);
      expect(level1Category.isLeaf(!hasChildren)).toBe(false); // 하위 카테고리 있음
    });

    it("카테고리 깊이를 올바르게 계산해야 한다", () => {
      // When & Then
      expect(rootCategory.getDepth()).toBe(0);
      expect(level1Category.getDepth()).toBe(1);
      expect(level2Category.getDepth()).toBe(2);
    });

    it("카테고리 풀패스 슬러그를 생성할 수 있어야 한다", () => {
      // Given
      const parentSlugs = ["electronics", "computers"];

      // When
      const fullSlug = level2Category.generateFullSlug(parentSlugs);

      // Then
      expect(fullSlug).toBe("electronics/computers/laptops");
    });
  });

  describe("Category 상태 관리", () => {
    let category: Category;

    beforeEach(() => {
      category = Category.createRoot({
        name: "테스트 카테고리",
        description: "테스트용 카테고리",
        slug: "test-category",
      });
    });

    it("카테고리를 비활성화할 수 있어야 한다", async () => {
      // Given
      const originalUpdatedAt = category.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms 딜레이로 증가
      category.deactivate();

      // Then
      expect(category.isActive()).toBe(false);
      expect(category.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("카테고리를 활성화할 수 있어야 한다", () => {
      // Given
      category.deactivate();

      // When
      category.activate();

      // Then
      expect(category.isActive()).toBe(true);
    });

    it("카테고리 정보를 업데이트할 수 있어야 한다", async () => {
      // Given
      const updateData = {
        name: "업데이트된 카테고리",
        description: "업데이트된 설명",
      };
      const originalUpdatedAt = category.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 1));
      category.updateDetails(updateData);

      // Then
      expect(category.getName()).toBe(updateData.name);
      expect(category.getDescription()).toBe(updateData.description);
      expect(category.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("상품 개수를 업데이트할 수 있어야 한다", () => {
      // Given
      const newCount = 50;

      // When
      category.updateProductCount(newCount);

      // Then
      expect(category.getProductCount()).toBe(newCount);
    });

    it("상품 개수가 음수이면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => category.updateProductCount(-1)).toThrow(
        "상품 개수는 0 이상이어야 합니다"
      );
    });
  });

  describe("Category 검색 및 필터링", () => {
    let category: Category;

    beforeEach(() => {
      category = Category.createRoot({
        name: "스마트폰 & 태블릿",
        description: "모바일 디바이스 카테고리",
        slug: "mobile-devices",
      });
    });

    it("카테고리명으로 검색 매치 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(category.matchesSearchQuery("스마트폰")).toBe(true);
      expect(category.matchesSearchQuery("smartphone")).toBe(false); // 영문명 검색 실패
      expect(category.matchesSearchQuery("태블릿")).toBe(true);
      expect(category.matchesSearchQuery("laptop")).toBe(false);
    });

    it("슬러그로 검색 매치 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(category.matchesSearchQuery("mobile")).toBe(true);
      expect(category.matchesSearchQuery("devices")).toBe(true);
      expect(category.matchesSearchQuery("computers")).toBe(false);
    });

    it("깊이별 필터링을 할 수 있어야 한다", () => {
      // When & Then
      expect(category.isAtDepth(0)).toBe(true);
      expect(category.isAtDepth(1)).toBe(false);
      expect(category.isAtDepth(2)).toBe(false);
    });
  });

  describe("Category 도메인 규칙", () => {
    it("카테고리가 표시 가능한 상태인지 확인할 수 있어야 한다", () => {
      // Given
      const category = Category.createRoot({
        name: "표시 카테고리",
        description: "설명",
        slug: "display-category",
      });

      // When & Then
      expect(category.isDisplayable()).toBe(true);

      // 비활성화 시
      category.deactivate();
      expect(category.isDisplayable()).toBe(false);
    });

    it("카테고리의 SEO 정보를 생성할 수 있어야 한다", () => {
      // Given
      const category = Category.createRoot({
        name: "게이밍 노트북",
        description: "고성능 게이밍을 위한 노트북 카테고리",
        slug: "gaming-laptops",
      });

      // When
      const seoInfo = category.generateSEOInfo();

      // Then
      expect(seoInfo.title).toContain("게이밍 노트북");
      expect(seoInfo.description).toBe(category.getDescription());
      expect(seoInfo.keywords).toContain("게이밍 노트북");
      expect(seoInfo.slug).toBe("gaming-laptops");
    });

    it("카테고리 요약 정보를 제공할 수 있어야 한다", () => {
      // Given
      const category = Category.createRoot({
        name: "테스트 카테고리",
        description: "테스트 설명",
        slug: "test-category",
      });
      category.updateProductCount(25);

      // When
      const summary = category.getSummary();

      // Then
      expect(summary.id).toBe(category.getId());
      expect(summary.name).toBe(category.getName());
      expect(summary.slug).toBe(category.getSlug());
      expect(summary.depth).toBe(category.getDepth());
      expect(summary.productCount).toBe(25);
      expect(summary.isActive).toBe(category.isActive());
      expect(summary.isRoot).toBe(category.isRoot());
    });
  });

  describe("Category 도메인 이벤트", () => {
    it("카테고리 생성 이벤트를 발생시켜야 한다", () => {
      // Given
      const category = Category.createRoot({
        name: "새 카테고리",
        description: "새로운 카테고리",
        slug: "new-category",
      });

      // When
      const event = category.getCreatedEvent();

      // Then
      expect(event.type).toBe("CategoryCreated");
      expect(event.categoryId).toBe(category.getId());
      expect(event.categoryName).toBe(category.getName());
      expect(event.depth).toBe(0);
      expect(event.parentId).toBeNull();
    });

    it("카테고리 업데이트 이벤트를 발생시켜야 한다", () => {
      // Given
      const category = Category.createRoot({
        name: "카테고리",
        description: "설명",
        slug: "category",
      });

      // When
      const event = category.getUpdatedEvent();

      // Then
      expect(event.type).toBe("CategoryUpdated");
      expect(event.categoryId).toBe(category.getId());
      expect(event.categoryName).toBe(category.getName());
    });
  });
});
