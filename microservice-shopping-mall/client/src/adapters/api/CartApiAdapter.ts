// ========================================
// Cart API Adapter - Clean Architecture
// src/adapters/api/CartApiAdapter.ts
// ========================================

import axios, { AxiosResponse } from 'axios';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// 장바구니 관련 타입 정의
interface CartProduct {
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

interface CartItem {
  product: CartProduct;
  quantity: number;
  addedAt: string;
}

interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  totalAmount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

interface AddToCartRequest {
  productId: string;
  quantity: number;
}

interface UpdateQuantityRequest {
  quantity: number;
}

/**
 * Cart API Adapter - 장바구니 관련 API 호출을 담당
 */
export class CartApiAdapter {
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly sessionStorageKey = 'cart_session_id';

  constructor() {
    // 환경에 따라 API Gateway URL 설정 (Cart Service 직접 호출 대신)
    this.baseURL =
      process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:3001';
    this.timeout = 10000; // 10초
  }

  /**
   * 세션 ID 관리
   */
  private getSessionId(): string {
    let sessionId = localStorage.getItem(this.sessionStorageKey);
    if (!sessionId) {
      // 새 세션 ID 생성
      sessionId = `sess_${this.generateUUID()}`;
      localStorage.setItem(this.sessionStorageKey, sessionId);
    }
    return sessionId;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  /**
   * 인증 헤더 생성 (선택적)
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-ID': this.getSessionId(), // 세션 ID 헤더 추가
    };

    // Zustand store에서 토큰 가져오기 (있으면 포함)
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        if (authData.state?.token) {
          headers['Authorization'] = `Bearer ${authData.state.token}`;
        }
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
    }

    return headers;
  }

  /**
   * 장바구니 조회 API 호출
   */
  async getCart(): Promise<Cart> {
    try {
      const response: AxiosResponse<ApiResponse<Cart>> = await axios.get(
        `${this.baseURL}/api/v1/cart`,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('장바구니 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니에 상품 추가 API 호출
   */
  async addToCart(productId: string, quantity: number): Promise<Cart> {
    try {
      const requestData: AddToCartRequest = { productId, quantity };
      const response: AxiosResponse<ApiResponse<Cart>> = await axios.post(
        `${this.baseURL}/api/v1/cart/items`,
        requestData,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('장바구니에 상품 추가 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 아이템 수량 변경 API 호출
   */
  async updateQuantity(productId: string, quantity: number): Promise<Cart> {
    try {
      const requestData: UpdateQuantityRequest = { quantity };
      const response: AxiosResponse<ApiResponse<Cart>> = await axios.put(
        `${this.baseURL}/api/v1/cart/items/${productId}`,
        requestData,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('수량 변경 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니에서 상품 제거 API 호출
   */
  async removeFromCart(productId: string): Promise<Cart> {
    try {
      const response: AxiosResponse<ApiResponse<Cart>> = await axios.delete(
        `${this.baseURL}/api/v1/cart/items/${productId}`,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('상품 제거 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 전체 비우기 API 호출
   */
  async clearCart(): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.delete(
        `${this.baseURL}/api/v1/cart`,
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('장바구니 비우기 중 오류가 발생했습니다.');
    }
  }

  /**
   * 장바구니 이전 API 호출 (로그인 시 세션 → 사용자)
   */
  async transferCart(): Promise<Cart> {
    try {
      const response: AxiosResponse<ApiResponse<Cart>> = await axios.post(
        `${this.baseURL}/api/v1/cart/transfer`,
        {},
        {
          timeout: this.timeout,
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('장바구니 이전 중 오류가 발생했습니다.');
    }
  }

  /**
   * 헬스체크 API 호출 (서비스 상태 확인)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000,
      });
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}
