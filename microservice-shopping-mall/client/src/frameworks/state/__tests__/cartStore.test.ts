// ========================================
// 장바구니 Store 테스트 - TDD 방식 (수정 완료)
// client/src/frameworks/state/__tests__/cartStore.test.ts
// ========================================

import { renderHook, act } from '@testing-library/react';
import { useCartStore } from '../cartStore';

// 테스트용 상품 데이터 (Product Service API 응답 형태)
const mockProduct1 = {
  id: 'product-1',
  name: 'MacBook Pro 16인치 M3 Pro',
  price: 2999000,
  brand: 'Apple',
  sku: 'MBP16-M3PRO-18-512',
  slug: 'macbook-pro-16-m3-pro',
  category: {
    id: 'cat-1',
    name: '노트북',
    slug: 'laptop',
  },
  inventory: {
    availableQuantity: 45,
    status: 'sufficient',
  },
};

const mockProduct2 = {
  id: 'product-2',
  name: 'iPhone 15 Pro',
  price: 1550000,
  brand: 'Apple',
  sku: 'IP15PRO-256GB-BLU',
  slug: 'iphone-15-pro',
  category: {
    id: 'cat-2',
    name: '스마트폰',
    slug: 'smartphone',
  },
  inventory: {
    availableQuantity: 20,
    status: 'sufficient',
  },
};

describe('CartStore - TDD 테스트', () => {
  // 각 테스트 실행 전 장바구니를 초기화하여 테스트 간의 독립성 보장
  beforeEach(() => {
    act(() => {
      useCartStore.getState().clearCart();
    });
  });

  describe('장바구니 초기 상태', () => {
    it('초기 장바구니는 비어있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.items).toEqual([]);
      expect(result.current.getTotalQuantity()).toBe(0);
      expect(result.current.getTotalPrice()).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('상품 추가 (addItem)', () => {
    it('새로운 상품을 장바구니에 추가할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        product: mockProduct1,
        quantity: 1,
        addedAt: expect.any(Date),
      });
      expect(result.current.getTotalQuantity()).toBe(1);
      expect(result.current.getTotalPrice()).toBe(2999000);
      expect(result.current.isEmpty()).toBe(false);
    });

    it('같은 상품을 다시 추가하면 수량이 증가해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.getTotalQuantity()).toBe(3);
      expect(result.current.getTotalPrice()).toBe(8997000); // 2999000 * 3
    });

    it('다른 상품을 추가하면 새로운 아이템으로 추가되어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
        result.current.addItem(mockProduct2, 2);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.getTotalQuantity()).toBe(3);
      expect(result.current.getTotalPrice()).toBe(6099000); // 2999000 + (1550000 * 2)
    });

    it('수량이 0 이하이면 에러를 발생시켜야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.addItem(mockProduct1, 0);
        });
      }).toThrow('수량은 1 이상이어야 합니다');

      expect(() => {
        act(() => {
          result.current.addItem(mockProduct1, -1);
        });
      }).toThrow('수량은 1 이상이어야 합니다');
    });

    it('상품 정보가 없으면 에러를 발생시켜야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.addItem(null as any, 1);
        });
      }).toThrow('상품 정보가 필요합니다');
    });

    it('재고보다 많은 수량을 추가하려 하면 에러를 발생시켜야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.addItem(mockProduct1, 50); // 재고 45개보다 많음
        });
      }).toThrow('재고가 부족합니다');
    });
  });

  describe('수량 업데이트 (updateQuantity)', () => {
    it('특정 상품의 수량을 업데이트할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.updateQuantity('product-1', 5);
      });

      const item = result.current.items.find(
        item => item.product.id === 'product-1'
      );
      expect(item?.quantity).toBe(5);
      expect(result.current.getTotalQuantity()).toBe(6); // 5 + 1
    });

    it('수량을 0으로 설정하면 상품이 제거되어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.updateQuantity('product-1', 0);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('product-2');
    });

    it('존재하지 않는 상품의 수량 업데이트는 무시되어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      const initialItems = [...result.current.items];

      act(() => {
        result.current.updateQuantity('nonexistent-id', 5);
      });

      expect(result.current.items).toEqual(initialItems);
    });

    it('재고보다 많은 수량으로 업데이트하려 하면 에러를 발생시켜야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct2, 1);
      });

      expect(() => {
        act(() => {
          result.current.updateQuantity('product-2', 25); // 재고 20개보다 많음
        });
      }).toThrow('재고가 부족합니다');
    });
  });

  describe('상품 제거 (removeItem)', () => {
    it('특정 상품을 장바구니에서 제거할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      act(() => {
        result.current.removeItem('product-1');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe('product-2');
      expect(result.current.getTotalQuantity()).toBe(1);
    });

    it('존재하지 않는 상품 제거는 무시되어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      const initialItemsCount = result.current.items.length;

      act(() => {
        result.current.removeItem('nonexistent-id');
      });

      expect(result.current.items).toHaveLength(initialItemsCount);
    });
  });

  describe('장바구니 비우기 (clearCart)', () => {
    it('장바구니의 모든 상품을 제거할 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 1);
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.getTotalQuantity()).toBe(0);
      expect(result.current.getTotalPrice()).toBe(0);
      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('장바구니 계산 메서드', () => {
    it('getTotalQuantity는 전체 수량을 반환해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.getTotalQuantity()).toBe(5); // 2 + 3
    });

    it('getTotalPrice는 전체 가격을 반환해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2); // 2999000 * 2 = 5998000
        result.current.addItem(mockProduct2, 3); // 1550000 * 3 = 4650000
      });

      expect(result.current.getTotalPrice()).toBe(10648000); // 5998000 + 4650000
    });

    it('getItemCount는 상품 종류 수를 반환해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
        result.current.addItem(mockProduct2, 3);
      });

      expect(result.current.getItemCount()).toBe(2);
    });

    it('isEmpty는 장바구니가 비어있는지 여부를 반환해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 1);
      });

      expect(result.current.isEmpty()).toBe(false);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.isEmpty()).toBe(true);
    });
  });

  describe('특정 상품 검색 (getItem)', () => {
    it('상품 ID로 장바구니 아이템을 찾을 수 있어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      const item = result.current.getItem('product-1');
      expect(item).toBeDefined();
      expect(item?.product.id).toBe('product-1');
      expect(item?.quantity).toBe(2);
    });

    it('존재하지 않는 상품 ID는 undefined를 반환해야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      const item = result.current.getItem('nonexistent-id');
      expect(item).toBeUndefined();
    });
  });

  describe('로컬 스토리지 지속성', () => {
    it('장바구니 상태가 로컬 스토리지에 저장되어야 한다', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockProduct1, 2);
      });

      // 로컬 스토리지에 저장되었는지 확인
      const savedData = localStorage.getItem('shopping-cart');

      // 데이터가 null이 아닌지 먼저 확인합니다.
      expect(savedData).not.toBeNull();

      // 위 expect가 통과했으므로 savedData는 항상 string 타입임을 보장할 수 있습니다.
      // TypeScript에게 non-null임을 알려주기 위해 '!'를 사용합니다.
      const parsedData = JSON.parse(savedData!);

      // 조건문 없이 나머지 항목을 검증합니다.
      expect(parsedData.state.items).toHaveLength(1);
      expect(parsedData.state.items[0].product.id).toBe('product-1');
      expect(parsedData.state.items[0].quantity).toBe(2);
    });
  });

  describe('장바구니 유효성 검증', () => {
    it('상품의 재고 상태가 out_of_stock인 경우 추가할 수 없어야 한다', () => {
      const outOfStockProduct = {
        ...mockProduct1,
        inventory: {
          availableQuantity: 0,
          status: 'out_of_stock',
        },
      };

      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.addItem(outOfStockProduct, 1);
        });
      }).toThrow('품절된 상품입니다');
    });

    it('가격이 0 이하인 상품은 추가할 수 없어야 한다', () => {
      const invalidPriceProduct = {
        ...mockProduct1,
        price: 0,
      };

      const { result } = renderHook(() => useCartStore());

      expect(() => {
        act(() => {
          result.current.addItem(invalidPriceProduct, 1);
        });
      }).toThrow('올바르지 않은 상품 가격입니다');
    });
  });
});
