// ========================================
// Inventory Entity 테스트 - TDD 방식
// src/entities/__tests__/Inventory.test.ts
// ========================================

import { Inventory, InventoryStatus } from "../Inventory";

describe("Inventory Entity", () => {
  describe("Inventory 생성", () => {
    it("새로운 Inventory를 생성할 수 있어야 한다", () => {
      // Given
      const inventoryData = {
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 10,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      };

      // When
      const inventory = Inventory.create(inventoryData);

      // Then
      expect(inventory).toBeInstanceOf(Inventory);
      expect(inventory.getProductId()).toBe(inventoryData.productId);
      expect(inventory.getQuantity()).toBe(inventoryData.quantity);
      expect(inventory.getReservedQuantity()).toBe(
        inventoryData.reservedQuantity
      );
      expect(inventory.getLowStockThreshold()).toBe(
        inventoryData.lowStockThreshold
      );
      expect(inventory.getLocation()).toBe(inventoryData.location);
      expect(inventory.getAvailableQuantity()).toBe(90); // 100 - 10
      expect(inventory.getStatus()).toBe(InventoryStatus.SUFFICIENT);
      expect(inventory.getCreatedAt()).toBeInstanceOf(Date);
    });

    it("기존 Inventory를 복원할 수 있어야 한다", () => {
      // Given
      const existingData = {
        id: "inventory-123",
        productId: "product-456",
        quantity: 50,
        reservedQuantity: 5,
        lowStockThreshold: 10,
        location: "WAREHOUSE-B",
        lastRestockedAt: new Date("2024-01-01"),
        createdAt: new Date("2023-12-01"),
        updatedAt: new Date("2024-01-15"),
      };

      // When
      const inventory = Inventory.restore(existingData);

      // Then
      expect(inventory.getId()).toBe(existingData.id);
      expect(inventory.getProductId()).toBe(existingData.productId);
      expect(inventory.getQuantity()).toBe(existingData.quantity);
      expect(inventory.getAvailableQuantity()).toBe(45); // 50 - 5
      expect(inventory.getLastRestockedAt()).toEqual(
        existingData.lastRestockedAt
      );
    });
  });

  describe("Inventory 유효성 검증", () => {
    it("상품 ID가 비어있으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        productId: "",
        quantity: 100,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      };

      // When & Then
      expect(() => Inventory.create(invalidData)).toThrow(
        "상품 ID는 필수입니다"
      );
    });

    it("수량이 음수이면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        productId: "product-123",
        quantity: -10,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      };

      // When & Then
      expect(() => Inventory.create(invalidData)).toThrow(
        "재고 수량은 0 이상이어야 합니다"
      );
    });

    it("예약 수량이 음수이면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        productId: "product-123",
        quantity: 100,
        reservedQuantity: -5,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      };

      // When & Then
      expect(() => Inventory.create(invalidData)).toThrow(
        "예약 수량은 0 이상이어야 합니다"
      );
    });

    it("예약 수량이 전체 수량보다 많으면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 150,
        lowStockThreshold: 10,
        location: "WAREHOUSE-A",
      };

      // When & Then
      expect(() => Inventory.create(invalidData)).toThrow(
        "예약 수량은 전체 수량을 초과할 수 없습니다"
      );
    });

    it("부족 임계값이 음수이면 에러를 발생시켜야 한다", () => {
      // Given
      const invalidData = {
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 10,
        lowStockThreshold: -5,
        location: "WAREHOUSE-A",
      };

      // When & Then
      expect(() => Inventory.create(invalidData)).toThrow(
        "부족 임계값은 0 이상이어야 합니다"
      );
    });
  });

  describe("재고 상태 계산", () => {
    it("재고가 충분할 때 SUFFICIENT 상태를 반환해야 한다", () => {
      // Given
      const inventory = Inventory.create({
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 10,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });

      // When
      const status = inventory.getStatus();

      // Then
      expect(status).toBe(InventoryStatus.SUFFICIENT);
      expect(inventory.getAvailableQuantity()).toBe(90); // 100 - 10 > 20
    });

    it("재고가 부족할 때 LOW_STOCK 상태를 반환해야 한다", () => {
      // Given
      const inventory = Inventory.create({
        productId: "product-123",
        quantity: 25,
        reservedQuantity: 10,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });

      // When
      const status = inventory.getStatus();

      // Then
      expect(status).toBe(InventoryStatus.LOW_STOCK);
      expect(inventory.getAvailableQuantity()).toBe(15); // 25 - 10 = 15 < 20
    });

    it("재고가 없을 때 OUT_OF_STOCK 상태를 반환해야 한다", () => {
      // Given
      const inventory = Inventory.create({
        productId: "product-123",
        quantity: 0,
        reservedQuantity: 0,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });

      // When
      const status = inventory.getStatus();

      // Then
      expect(status).toBe(InventoryStatus.OUT_OF_STOCK);
      expect(inventory.getAvailableQuantity()).toBe(0);
    });

    it("예약 수량이 전체 수량과 같을 때 OUT_OF_STOCK 상태를 반환해야 한다", () => {
      // Given
      const inventory = Inventory.create({
        productId: "product-123",
        quantity: 30,
        reservedQuantity: 30,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });

      // When
      const status = inventory.getStatus();

      // Then
      expect(status).toBe(InventoryStatus.OUT_OF_STOCK);
      expect(inventory.getAvailableQuantity()).toBe(0); // 30 - 30 = 0
    });
  });

  describe("재고 입고 (Restock)", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 50,
        reservedQuantity: 5,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });
    });

    it("재고를 입고할 수 있어야 한다", async () => {
      // Given
      const restockQuantity = 100;
      const originalQuantity = inventory.getQuantity();
      const originalUpdatedAt = inventory.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 1));
      inventory.restock(restockQuantity, "Manual restock");

      // Then
      expect(inventory.getQuantity()).toBe(originalQuantity + restockQuantity);
      expect(inventory.getAvailableQuantity()).toBe(145); // (50 + 100) - 5
      expect(inventory.getStatus()).toBe(InventoryStatus.SUFFICIENT);
      expect(inventory.getLastRestockedAt()).toBeInstanceOf(Date);
      expect(inventory.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("입고 수량이 0 이하이면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => inventory.restock(0, "Invalid restock")).toThrow(
        "입고 수량은 0보다 커야 합니다"
      );
      expect(() => inventory.restock(-10, "Invalid restock")).toThrow(
        "입고 수량은 0보다 커야 합니다"
      );
    });

    it("입고 이유가 비어있으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => inventory.restock(100, "")).toThrow(
        "입고 이유는 필수입니다"
      );
    });
  });

  describe("재고 출고 (Reduce)", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 10,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });
    });

    it("재고를 출고할 수 있어야 한다", async () => {
      // Given
      const reduceQuantity = 30;
      const originalQuantity = inventory.getQuantity();
      const originalUpdatedAt = inventory.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms 딜레이
      inventory.reduce(reduceQuantity, "Order fulfillment");

      // Then
      expect(inventory.getQuantity()).toBe(originalQuantity - reduceQuantity);
      expect(inventory.getAvailableQuantity()).toBe(60); // (100 - 30) - 10
      expect(inventory.getStatus()).toBe(InventoryStatus.SUFFICIENT);
      expect(inventory.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("사용 가능한 수량보다 많이 출고하려 하면 에러를 발생시켜야 한다", () => {
      // Given
      const availableQuantity = inventory.getAvailableQuantity(); // 90

      // When & Then
      expect(() =>
        inventory.reduce(availableQuantity + 1, "Over reduce")
      ).toThrow("출고 수량이 사용 가능한 재고를 초과합니다");
    });

    it("출고 수량이 0 이하이면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => inventory.reduce(0, "Invalid reduce")).toThrow(
        "출고 수량은 0보다 커야 합니다"
      );
      expect(() => inventory.reduce(-10, "Invalid reduce")).toThrow(
        "출고 수량은 0보다 커야 합니다"
      );
    });

    it("출고 이유가 비어있으면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => inventory.reduce(10, "")).toThrow("출고 이유는 필수입니다");
    });
  });

  describe("예약 재고 관리", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 20,
        lowStockThreshold: 30,
        location: "WAREHOUSE-A",
      });
    });

    it("재고를 예약할 수 있어야 한다", async () => {
      // Given
      const reserveQuantity = 15;
      const originalReserved = inventory.getReservedQuantity();
      const originalUpdatedAt = inventory.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms 딜레이
      inventory.reserve(reserveQuantity, "Order placed");

      // Then
      expect(inventory.getReservedQuantity()).toBe(
        originalReserved + reserveQuantity
      );
      expect(inventory.getAvailableQuantity()).toBe(65); // 100 - (20 + 15)
      expect(inventory.getStatus()).toBe(InventoryStatus.SUFFICIENT);
      expect(inventory.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("예약을 해제할 수 있어야 한다", async () => {
      // Given
      const releaseQuantity = 10;
      const originalReserved = inventory.getReservedQuantity();
      const originalUpdatedAt = inventory.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms 딜레이
      inventory.releaseReservation(releaseQuantity, "Order cancelled");

      // Then
      expect(inventory.getReservedQuantity()).toBe(
        originalReserved - releaseQuantity
      );
      expect(inventory.getAvailableQuantity()).toBe(90); // 100 - (20 - 10)
      expect(inventory.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("사용 가능한 수량보다 많이 예약하려 하면 에러를 발생시켜야 한다", () => {
      // Given
      const availableQuantity = inventory.getAvailableQuantity(); // 80

      // When & Then
      expect(() =>
        inventory.reserve(availableQuantity + 1, "Over reserve")
      ).toThrow("예약 수량이 사용 가능한 재고를 초과합니다");
    });

    it("현재 예약량보다 많이 해제하려 하면 에러를 발생시켜야 한다", () => {
      // Given
      const currentReserved = inventory.getReservedQuantity(); // 20

      // When & Then
      expect(() =>
        inventory.releaseReservation(currentReserved + 1, "Over release")
      ).toThrow("해제할 예약 수량이 현재 예약량을 초과합니다");
    });
  });

  describe("재고 임계값 관리", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 10,
        lowStockThreshold: 30,
        location: "WAREHOUSE-A",
      });
    });

    it("부족 임계값을 업데이트할 수 있어야 한다", async () => {
      // Given
      const newThreshold = 50;
      const originalUpdatedAt = inventory.getUpdatedAt();

      // When
      await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms 딜레이
      inventory.updateLowStockThreshold(newThreshold);

      // Then
      expect(inventory.getLowStockThreshold()).toBe(newThreshold);
      expect(inventory.getStatus()).toBe(InventoryStatus.SUFFICIENT); // 90 > 50
      expect(inventory.getUpdatedAt().getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it("부족 임계값을 높여서 상태가 변경되는지 확인해야 한다", () => {
      // Given & When
      inventory.updateLowStockThreshold(95); // 사용 가능 수량 90보다 높게 설정

      // Then
      expect(inventory.getStatus()).toBe(InventoryStatus.LOW_STOCK);
    });

    it("임계값이 음수이면 에러를 발생시켜야 한다", () => {
      // When & Then
      expect(() => inventory.updateLowStockThreshold(-1)).toThrow(
        "부족 임계값은 0 이상이어야 합니다"
      );
    });
  });

  describe("재고 정보 조회", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 100,
        reservedQuantity: 15,
        lowStockThreshold: 25,
        location: "WAREHOUSE-A",
      });
    });

    it("재고 부족 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(inventory.isLowStock()).toBe(false); // 85 > 25

      // 임계값 변경 후
      inventory.updateLowStockThreshold(90);
      expect(inventory.isLowStock()).toBe(true); // 85 < 90
    });

    it("재고 품절 여부를 확인할 수 있어야 한다", () => {
      // When & Then
      expect(inventory.isOutOfStock()).toBe(false);

      // 모든 재고 예약 후
      inventory.reserve(85, "Reserve all");
      expect(inventory.isOutOfStock()).toBe(true);
    });

    it("재고 요약 정보를 제공할 수 있어야 한다", () => {
      // When
      const summary = inventory.getSummary();

      // Then
      expect(summary.id).toBe(inventory.getId());
      expect(summary.productId).toBe(inventory.getProductId());
      expect(summary.quantity).toBe(100);
      expect(summary.availableQuantity).toBe(85);
      expect(summary.reservedQuantity).toBe(15);
      expect(summary.status).toBe(InventoryStatus.SUFFICIENT);
      expect(summary.location).toBe("WAREHOUSE-A");
      expect(summary.isLowStock).toBe(false);
      expect(summary.isOutOfStock).toBe(false);
    });
  });

  describe("재고 도메인 이벤트", () => {
    let inventory: Inventory;

    beforeEach(() => {
      inventory = Inventory.create({
        productId: "product-123",
        quantity: 50,
        reservedQuantity: 5,
        lowStockThreshold: 20,
        location: "WAREHOUSE-A",
      });
    });

    it("재고 입고 이벤트를 발생시켜야 한다", () => {
      // Given
      inventory.restock(100, "Supplier delivery");

      // When
      const event = inventory.getRestockEvent();

      // Then
      expect(event.type).toBe("InventoryRestocked");
      expect(event.productId).toBe("product-123");
      expect(event.quantity).toBe(150); // 50 + 100
      expect(event.restockQuantity).toBe(100);
      expect(event.location).toBe("WAREHOUSE-A");
    });

    it("재고 부족 이벤트를 발생시켜야 한다", () => {
      // Given
      inventory.reduce(35, "Order fulfillment"); // 15 남음, 임계값 20보다 적음

      // When
      const event = inventory.getLowStockEvent();

      // Then
      expect(event.type).toBe("InventoryLowStock");
      expect(event.productId).toBe("product-123");
      expect(event.availableQuantity).toBe(10); // 15 - 5
      expect(event.threshold).toBe(20);
      expect(event.location).toBe("WAREHOUSE-A");
    });

    it("재고 품절 이벤트를 발생시켜야 한다", () => {
      // Given
      inventory.reduce(45, "Order fulfillment"); // 모든 사용 가능 재고 소진

      // When
      const event = inventory.getOutOfStockEvent();

      // Then
      expect(event.type).toBe("InventoryOutOfStock");
      expect(event.productId).toBe("product-123");
      expect(event.location).toBe("WAREHOUSE-A");
    });
  });
});
