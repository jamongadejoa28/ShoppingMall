// ========================================
// ProductServiceClient - Product Service와의 HTTP 통신
// cart-service/src/adapters/ProductServiceClient.ts
// ========================================

import axios from 'axios';
import { injectable } from 'inversify';
import {
  ProductServiceClient,
  ProductInfo,
  InventoryCheckResult,
} from '../usecases/types';

interface ProductApiResponse {
  success: boolean;
  message: string;
  data: any;
  timestamp: string;
  requestId: string;
}

@injectable()
export class HttpProductServiceClient implements ProductServiceClient {
  private readonly httpClient: any;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
    
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10초
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터
    this.httpClient.interceptors.request.use(
      (config: any) => {
        // 요청 로깅 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ProductServiceClient] Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error: any) => {
        console.error('[ProductServiceClient] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.httpClient.interceptors.response.use(
      (response: any) => {
        return response;
      },
      (error: any) => {
        const errorMessage = error.response?.data?.message || error.message || 'Product Service 호출 실패';
        console.error('[ProductServiceClient] Response error:', errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * 상품 정보 조회
   */
  async getProduct(productId: string): Promise<ProductInfo | null> {
    try {
      const response: any = await this.httpClient.get(
        `/api/v1/products/${productId}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || '상품 조회 실패');
      }

      const productData = response.data.data;
      
      // Product Service 응답을 ProductInfo 인터페이스로 변환
      return this.transformToProductInfo(productData);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // 상품을 찾을 수 없음
      }
      
      console.error(`[ProductServiceClient] Failed to get product ${productId}:`, error.message);
      throw new Error(`상품 조회 실패: ${error.message}`);
    }
  }

  /**
   * 재고 확인
   */
  async checkInventory(productId: string, quantity: number): Promise<InventoryCheckResult> {
    try {
      const product = await this.getProduct(productId);
      
      if (!product) {
        return {
          productId,
          requestedQuantity: quantity,
          availableQuantity: 0,
          isAvailable: false,
          message: '상품을 찾을 수 없습니다',
        };
      }

      const isAvailable = product.availableQuantity >= quantity;

      return {
        productId,
        requestedQuantity: quantity,
        availableQuantity: product.availableQuantity,
        isAvailable,
        message: isAvailable
          ? '재고가 충분합니다'
          : `재고가 부족합니다. 요청: ${quantity}, 가용: ${product.availableQuantity}`,
      };
    } catch (error: any) {
      console.error(`[ProductServiceClient] Failed to check inventory for ${productId}:`, error.message);
      throw new Error(`재고 확인 실패: ${error.message}`);
    }
  }

  /**
   * 재고 예약 (실제로는 Product Service에 재고 감소 요청)
   */
  async reserveInventory(productId: string, quantity: number): Promise<boolean> {
    try {
      // TODO: 실제 Product Service에 재고 감소 API가 구현되면 호출
      // 현재는 재고 확인만 수행
      const inventoryCheck = await this.checkInventory(productId, quantity);
      return inventoryCheck.isAvailable;
    } catch (error: any) {
      console.error(`[ProductServiceClient] Failed to reserve inventory for ${productId}:`, error.message);
      return false;
    }
  }

  /**
   * Product Service 응답을 ProductInfo로 변환
   */
  private transformToProductInfo(productData: any): ProductInfo {
    return {
      id: productData.id,
      name: productData.name,
      description: productData.description || '',
      price: this.parsePrice(productData.price),
      currency: 'KRW', // 기본값
      availableQuantity: productData.inventory?.availableQuantity || 0,
      category: productData.category?.name || 'uncategorized',
      imageUrl: productData.imageUrls?.[0] || '',
      inventory: {
        quantity: productData.inventory?.availableQuantity || 0,
        status: this.mapInventoryStatus(productData.inventory?.status || 'unknown'),
      },
      isActive: productData.isActive || true,
      // 추가 필드들
      brand: productData.brand || '',
      sku: productData.sku || '',
      slug: productData.slug || '',
      imageUrls: productData.imageUrls || [],
    };
  }

  /**
   * 가격을 안전하게 숫자로 변환
   */
  private parsePrice(price: any): number {
    if (typeof price === 'number') {
      return price;
    }
    
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^\d.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * Product Service의 재고 상태를 Cart Service의 상태로 매핑
   */
  private mapInventoryStatus(status: string): 'in_stock' | 'low_stock' | 'out_of_stock' {
    switch (status.toLowerCase()) {
      case 'in_stock':
      case 'available':
        return 'in_stock';
      case 'low_stock':
      case 'limited':
        return 'low_stock';
      case 'out_of_stock':
      case 'unavailable':
      case 'sold_out':
        return 'out_of_stock';
      default:
        return 'in_stock'; // 기본값
    }
  }

  /**
   * Product Service 연결 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn('[ProductServiceClient] Health check failed:', error);
      return false;
    }
  }
}