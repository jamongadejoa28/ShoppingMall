// ========================================
// cartStore - 안정화 버전 (가격 포맷 수정 + shallow 최적화)
// client/src/frameworks/state/cartStore.ts
// ========================================

import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { CartProduct } from '../../types/cart-type/CartProduct';

// ========================================
// Types & Interfaces
// ========================================

export interface Product {
  id: string;
  name: string;
  price: number;
  brand: string;
  sku: string;
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
  imageUrls: string[];
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
  addedAt: Date;
}

export interface CartState {
  items: CartItem[];
  addItem: (product: CartProduct, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalQuantity: () => number;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isEmpty: () => boolean;
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
}

// ========================================
// 유효성 검증 함수들 (테스트 호환성 유지)
// ========================================

function validateProduct(product: Product): void {
  if (!product) {
    throw new Error('상품 정보가 필요합니다');
  }
  if (!product.id || !product.name) {
    throw new Error('올바르지 않은 상품 정보입니다');
  }
  if (product.price <= 0) {
    throw new Error('올바르지 않은 상품 가격입니다');
  }
  if (
    product.inventory.status === 'out_of_stock' ||
    product.inventory.availableQuantity <= 0
  ) {
    throw new Error('품절된 상품입니다');
  }
}

function validateQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('수량은 1 이상이어야 합니다');
  }
  if (!Number.isInteger(quantity)) {
    throw new Error('수량은 정수여야 합니다');
  }
}

function validateStock(
  product: Product,
  requestedQuantity: number,
  currentCartQuantity: number = 0
): void {
  const totalRequested = requestedQuantity + currentCartQuantity;
  if (totalRequested > product.inventory.availableQuantity) {
    throw new Error('재고가 부족합니다');
  }
}

// ========================================
// Zustand Store 생성 (shallow 최적화 + 안정성)
// ========================================

export const useCartStore = createWithEqualityFn<CartState>(
  (set, get) => ({
    // 초기 상태
    items: [],

    // Actions (완전한 유효성 검증 포함)
    addItem: (product, quantity) => {
      // 🔧 완전한 유효성 검증 (테스트 호환성)
      validateProduct(product);
      validateQuantity(quantity);

      const currentItems = get().items;
      const existingItemIndex = currentItems.findIndex(
        item => item.product.id === product.id
      );

      if (existingItemIndex >= 0) {
        const existingItem = currentItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        // 재고 확인 (기존 수량 고려)
        validateStock(product, quantity, existingItem.quantity);

        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };
        set({ items: updatedItems });
      } else {
        // 새로운 상품 추가
        validateStock(product, quantity);

        const newItem: CartItem = {
          product,
          quantity,
          addedAt: new Date(), // 🔧 Date 객체로 복원
        };
        set({ items: [...currentItems, newItem] });
      }
    },

    removeItem: productId => {
      set(state => ({
        items: state.items.filter(item => item.product.id !== productId),
      }));
    },

    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(productId);
        return;
      }

      // 🔧 완전한 유효성 검증
      validateQuantity(quantity);

      const itemToUpdate = get().items.find(
        item => item.product.id === productId
      );
      if (itemToUpdate) {
        validateStock(itemToUpdate.product, quantity);
      }

      set(state => ({
        items: state.items.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        ),
      }));
    },

    clearCart: () => {
      set({ items: [] });
    },

    // 🔧 Getters (안정화된 구현)
    getTotalQuantity: () => {
      const items = get().items;
      return items.reduce((sum, item) => sum + item.quantity, 0);
    },

    getTotalPrice: () => {
      const items = get().items;
      return items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
    },

    getItemCount: () => get().items.length,
    isEmpty: () => get().items.length === 0,
    getItem: productId =>
      get().items.find(item => item.product.id === productId),
    hasItem: productId =>
      get().items.some(item => item.product.id === productId),
    getItemQuantity: productId => {
      const item = get().items.find(item => item.product.id === productId);
      return item ? item.quantity : 0;
    },
  }),
  Object.is
);

// ========================================
// 🔥 최적화된 Individual Hooks (shallow 사용)
// ========================================

// 단일 값 selector들 (shallow 불필요)
export const useCartTotalQuantity = () =>
  useCartStore(state => state.getTotalQuantity());

export const useCartTotalPrice = () =>
  useCartStore(state => state.getTotalPrice());

export const useCartItemCount = () =>
  useCartStore(state => state.getItemCount());

export const useCartEmpty = () => useCartStore(state => state.isEmpty());

// 🔧 객체 반환 hooks (shallow 적용으로 무한 리렌더링 방지)
export const useCartActions = () => {
  return useCartStore(
    state => ({
      addItem: state.addItem,
      removeItem: state.removeItem,
      updateQuantity: state.updateQuantity,
      clearCart: state.clearCart,
    }),
    shallow // 🔥 무한 리렌더링 방지
  );
};

export const useCartItem = (productId: string) => {
  return useCartStore(
    state => {
      const item = state.items.find(item => item.product.id === productId);
      return {
        item,
        quantity: item ? item.quantity : 0,
        hasItem: !!item,
      };
    },
    shallow // 🔥 무한 리렌더링 방지
  );
};

export const useCartSummary = () => {
  return useCartStore(
    state => ({
      totalQuantity: state.getTotalQuantity(),
      totalPrice: state.getTotalPrice(),
      itemCount: state.getItemCount(),
      isEmpty: state.isEmpty(),
    }),
    shallow // 🔥 무한 리렌더링 방지
  );
};
