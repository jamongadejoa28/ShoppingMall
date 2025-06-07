import { create } from 'zustand';
import { Product } from '@entities/product/Product';
import {
  CartStorageAdapter,
  CartItem,
} from '@adapters/storage/CartStorageAdapter';

interface CartState {
  items: CartItem[];
  products: Record<string, Product>;
  isLoading: boolean;

  // Actions
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  loadCart: () => void;
  getTotalPrice: () => number;
  getTotalQuantity: () => number;
}

const cartStorageAdapter = new CartStorageAdapter();

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  products: {},
  isLoading: false,

  addToCart: (product: Product, quantity: number) => {
    cartStorageAdapter.addToCart(product.id, quantity);
    const items = cartStorageAdapter.getCartItems();

    set(state => ({
      items,
      products: { ...state.products, [product.id]: product },
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    cartStorageAdapter.updateQuantity(productId, quantity);
    const items = cartStorageAdapter.getCartItems();
    set({ items });
  },

  removeFromCart: (productId: string) => {
    cartStorageAdapter.removeFromCart(productId);
    const items = cartStorageAdapter.getCartItems();

    set(state => {
      const { [productId]: removed, ...remainingProducts } = state.products;
      return { items, products: remainingProducts };
    });
  },

  clearCart: () => {
    cartStorageAdapter.clearCart();
    set({ items: [], products: {} });
  },

  loadCart: () => {
    const items = cartStorageAdapter.getCartItems();
    set({ items });
  },

  getTotalPrice: () => {
    const { items, products } = get();
    return items.reduce((total, item) => {
      const product = products[item.productId];
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  },

  getTotalQuantity: () => {
    const { items } = get();
    return items.reduce((total, item) => total + item.quantity, 0);
  },
}));
