import {
  Product,
  Category,
  ProductFilter,
  ProductReview,
  ProductQnA,
} from '../../shared/types/product';

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
    products: Product[];
    categories: Category[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface ProductDetailResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface ProductReviewsResponse {
  success: boolean;
  message: string;
  data: {
    reviews: ProductReview[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

export interface ProductQnAResponse {
  success: boolean;
  message: string;
  data: {
    qnas: ProductQnA[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
    };
  };
}

// 관리자용 인터페이스 추가
export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  brand: string;
  sku: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  discountPercent?: number; // 할인율 (0-100)
  images?: File[]; // 상품 이미지 파일들
  thumbnailIndex?: number; // 썸네일로 사용할 이미지 인덱스
  initialStock: {
    quantity: number;
    location?: string;
    lowStockThreshold?: number;
  };
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  brand?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  tags?: string[];
  discountPercent?: number; // 할인율 (0-100)
  images?: File[]; // 상품 이미지 파일들
  thumbnailIndex?: number; // 썸네일로 사용할 이미지 인덱스
}

export interface CreateProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface UpdateProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface DeleteProductResponse {
  success: boolean;
  message: string;
}

export interface ProductStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
    categoryCounts: { [categoryName: string]: number };
    brandCounts: { [brandName: string]: number };
  };
}

export class ProductApiAdapter {
  private readonly baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL;
  }

  async getProducts(filters: ProductFilter = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.brand && filters.brand.length > 0)
      params.set('brand', filters.brand[0]);
    if (filters.minPrice !== null && filters.minPrice !== undefined)
      params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== null && filters.maxPrice !== undefined)
      params.set('maxPrice', filters.maxPrice.toString());
    if (filters.rating !== null && filters.rating !== undefined)
      params.set('minRating', filters.rating.toString());
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.page) params.set('page', filters.page.toString());
    if (filters.limit) params.set('limit', filters.limit.toString());

    const response = await fetch(
      `${this.baseURL}/products?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getProduct(id: string): Promise<ProductDetailResponse> {
    const response = await fetch(`${this.baseURL}/products/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ProductReviewsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${this.baseURL}/products/${productId}/reviews?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getProductQnA(
    productId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ProductQnAResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${this.baseURL}/products/${productId}/qna?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ========================================
  // 관리자용 상품 관리 메서드들
  // ========================================

  /**
   * 상품 생성 (관리자)
   */
  async createProduct(
    productData: CreateProductRequest,
    authToken?: string
  ): Promise<CreateProductResponse> {
    const headers: Record<string, string> = {};

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // 이미지 파일이 있는 경우 FormData 사용, 없으면 JSON 사용
    let body: FormData | string;

    if (productData.images && productData.images.length > 0) {
      // FormData를 사용한 멀티파트 업로드
      const formData = new FormData();

      // 기본 상품 데이터 추가
      const { images, thumbnailIndex, ...basicData } = productData;
      formData.append('productData', JSON.stringify(basicData));

      // 이미지 파일들 추가
      images.forEach((file, _index) => {
        formData.append('images', file);
      });

      // 썸네일 인덱스 추가 (있는 경우)
      if (thumbnailIndex !== undefined) {
        formData.append('thumbnailIndex', thumbnailIndex.toString());
      }

      body = formData;
    } else {
      // JSON 데이터만 전송
      headers['Content-Type'] = 'application/json';
      const {
        images: _images,
        thumbnailIndex: _thumbnailIndex,
        ...jsonData
      } = productData;
      body = JSON.stringify(jsonData);
    }

    const response = await fetch(`${this.baseURL}/products`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 상품 수정 (관리자) - 백엔드에 구현되면 활성화
   */
  async updateProduct(
    productId: string,
    productData: UpdateProductRequest,
    authToken?: string
  ): Promise<UpdateProductResponse> {
    const headers: Record<string, string> = {};

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // 이미지 파일이 있는 경우 FormData 사용, 없으면 JSON 사용
    let body: FormData | string;

    if (productData.images && productData.images.length > 0) {
      // FormData를 사용한 멀티파트 업로드
      const formData = new FormData();

      // 기본 상품 데이터 추가
      const { images, thumbnailIndex, ...basicData } = productData;
      formData.append('productData', JSON.stringify(basicData));

      // 이미지 파일들 추가
      images.forEach((file, _index) => {
        formData.append('images', file);
      });

      // 썸네일 인덱스 추가 (있는 경우)
      if (thumbnailIndex !== undefined) {
        formData.append('thumbnailIndex', thumbnailIndex.toString());
      }

      body = formData;
    } else {
      // JSON 데이터만 전송
      headers['Content-Type'] = 'application/json';
      const {
        images: _images,
        thumbnailIndex: _thumbnailIndex,
        ...jsonData
      } = productData;
      body = JSON.stringify(jsonData);
    }

    const response = await fetch(`${this.baseURL}/products/${productId}`, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 상품 삭제 (관리자) - 백엔드에 구현되면 활성화
   */
  async deleteProduct(
    productId: string,
    authToken?: string
  ): Promise<DeleteProductResponse> {
    const headers: Record<string, string> = {};

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseURL}/products/${productId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 재고 업데이트 (관리자)
   */
  async updateInventory(
    productId: string,
    inventoryData: {
      quantity: number;
      location?: string;
      lowStockThreshold?: number;
    },
    authToken?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${this.baseURL}/products/${productId}/inventory/update`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(inventoryData),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 상품 통계 조회 (관리자)
   */
  async getProductStats(authToken?: string): Promise<ProductStatsResponse> {
    const headers: Record<string, string> = {};

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseURL}/products/stats`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 카테고리 목록 조회
   */
  async getCategories(): Promise<{
    success: boolean;
    message: string;
    data: Category[];
  }> {
    const response = await fetch(`${this.baseURL}/categories`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}
