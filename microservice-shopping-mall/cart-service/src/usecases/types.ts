// ========================================
// 타입 정의 및 인터페이스 - Types Layer
// cart-service/src/usecases/types.ts
// ========================================

import { Cart } from "../entities/Cart";
import { CartItem } from "../entities/CartItem";

// ========================================
// Repository Interfaces
// ========================================

export interface CartRepository {
  save(cart: Cart): Promise<Cart>;
  findById(id: string): Promise<Cart | null>;
  findByUserId(userId: string): Promise<Cart | null>;
  findBySessionId(sessionId: string): Promise<Cart | null>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

export interface CartCache {
  setCart(cartId: string, cart: Cart): Promise<void>;
  getCart(cartId: string): Promise<Cart | null>;
  setUserCartId(userId: string, cartId: string): Promise<void>;
  getUserCartId(userId: string): Promise<string | null>;
  setSessionCartId(sessionId: string, cartId: string): Promise<void>;
  getSessionCartId(sessionId: string): Promise<string | null>;
  deleteCart(cartId: string): Promise<void>;
  deleteUserCart(userId: string): Promise<void>;
  deleteSessionCart(sessionId: string): Promise<void>;
}

export interface ProductServiceClient {
  getProduct(productId: string): Promise<ProductInfo | null>;
  checkInventory(
    productId: string,
    quantity: number
  ): Promise<InventoryCheckResult>;
  reserveInventory(productId: string, quantity: number): Promise<boolean>;
}

// ========================================
// DTOs (Data Transfer Objects)
// ========================================

// Add to Cart
export interface AddToCartRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface AddToCartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Get Cart
export interface GetCartRequest {
  userId?: string;
  sessionId?: string;
}

export interface GetCartResponse {
  success: boolean;
  cart: Cart | null;
  message?: string;
}

// Update Cart Item
export interface UpdateCartItemRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Remove from Cart
export interface RemoveFromCartRequest {
  userId?: string;
  sessionId?: string;
  productId: string;
}

export interface RemoveFromCartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Transfer Cart
export interface TransferCartRequest {
  userId: string;
  sessionId: string;
}

export interface TransferCartResponse {
  success: boolean;
  cart: Cart;
  message?: string;
}

// Clear Cart
export interface ClearCartRequest {
  userId?: string;
  sessionId?: string;
}

export interface ClearCartResponse {
  success: boolean;
  message?: string;
}

// ========================================
// External Service DTOs
// ========================================

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  inventory: {
    quantity: number;
    status: "in_stock" | "low_stock" | "out_of_stock";
  };
  isActive: boolean;
}

export interface InventoryCheckResult {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
  message?: string;
}

// ========================================
// Error Classes
// ========================================

export class CartError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CartError";
  }
}

export class ProductNotFoundError extends CartError {
  constructor(productId?: string) {
    super(
      productId
        ? `상품을 찾을 수 없습니다: ${productId}`
        : "상품을 찾을 수 없습니다",
      "PRODUCT_NOT_FOUND"
    );
  }
}

export class InsufficientStockError extends CartError {
  constructor(
    message: string,
    public availableQuantity?: number
  ) {
    super(message, "INSUFFICIENT_STOCK");
  }
}

export class CartNotFoundError extends CartError {
  constructor(identifier?: string) {
    super(
      identifier
        ? `장바구니를 찾을 수 없습니다: ${identifier}`
        : "장바구니를 찾을 수 없습니다",
      "CART_NOT_FOUND"
    );
  }
}

export class InvalidRequestError extends CartError {
  constructor(message: string) {
    super(message, "INVALID_REQUEST");
  }
}

export class ExternalServiceError extends CartError {
  constructor(serviceName: string, message: string) {
    super(`${serviceName} 서비스 오류: ${message}`, "EXTERNAL_SERVICE_ERROR");
  }
}

// ========================================
// Utility Types
// ========================================

export type CartIdentifier = {
  userId?: string;
  sessionId?: string;
};

export type CartItemSummary = {
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type CartSummary = {
  id?: string;
  userId?: string;
  sessionId?: string;
  items: CartItemSummary[];
  totalItems: number;
  totalAmount: number;
  uniqueItemCount: number;
  isEmpty: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ========================================
// Configuration Types
// ========================================

export interface CartServiceConfig {
  maxCartItems: number;
  sessionCartExpiryDays: number;
  cacheDefaultTTL: number;
  cacheCartTTL: number;
  cacheUserCartTTL: number;
}

// ========================================
// Event Types (추후 확장용)
// ========================================

export interface CartEvent {
  type: string;
  cartId?: string;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  data: any;
}

export interface ItemAddedEvent extends CartEvent {
  type: "ITEM_ADDED";
  data: {
    productId: string;
    quantity: number;
    price: number;
  };
}

export interface ItemRemovedEvent extends CartEvent {
  type: "ITEM_REMOVED";
  data: {
    productId: string;
  };
}

export interface CartTransferredEvent extends CartEvent {
  type: "CART_TRANSFERRED";
  data: {
    fromSessionId: string;
    toUserId: string;
  };
}
