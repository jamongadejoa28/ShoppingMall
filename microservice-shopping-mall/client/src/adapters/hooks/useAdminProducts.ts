// ========================================
// Admin Products Hook - 관리자용 상품 관리 Hook
// Clean Architecture: Adapter Layer
// src/adapters/hooks/useAdminProducts.ts
// ========================================

import { useState, useEffect, useCallback } from 'react';
import {
  ProductApiAdapter,
  CreateProductRequest,
  UpdateProductRequest,
  ProductStatsResponse,
} from '../api/ProductApiAdapter';
import { Product, Category, ProductFilter } from '../../shared/types/product';

interface UseAdminProductsResult {
  // 상품 목록 관련
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;

  // 통계 정보
  stats: ProductStatsResponse['data'] | null;
  statsLoading: boolean;

  // 상품 관리 액션들
  fetchProducts: (filters?: ProductFilter) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createProduct: (productData: CreateProductRequest) => Promise<Product>;
  updateProduct: (
    productId: string,
    productData: UpdateProductRequest
  ) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  updateInventory: (
    productId: string,
    inventoryData: {
      quantity: number;
      location?: string;
      lowStockThreshold?: number;
    }
  ) => Promise<void>;

  // 유틸리티
  refreshProducts: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export const useAdminProducts = (): UseAdminProductsResult => {
  const [productApiAdapter] = useState(() => new ProductApiAdapter());

  // 상태 관리
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] =
    useState<UseAdminProductsResult['pagination']>(null);

  // 통계 관련 상태
  const [stats, setStats] = useState<ProductStatsResponse['data'] | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 현재 필터 상태 (재조회용)
  const [currentFilters, setCurrentFilters] = useState<ProductFilter>({});

  // 인증 토큰 가져오기
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    return token;
  }, []);

  // 상품 목록 조회
  const fetchProducts = useCallback(
    async (filters: ProductFilter = {}) => {
      setLoading(true);
      setError(null);
      setCurrentFilters(filters);

      try {
        const response = await productApiAdapter.getProducts(filters);

        if (response.success) {
          setProducts(response.data.products);
          setPagination(response.data.pagination);
        } else {
          setError(response.message || '상품 목록을 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '상품 목록을 불러오는데 실패했습니다.'
        );
      } finally {
        setLoading(false);
      }
    },
    [productApiAdapter]
  );

  // 카테고리 목록 조회
  const fetchCategories = useCallback(async () => {
    try {
      const response = await productApiAdapter.getCategories();

      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('카테고리 목록 조회 실패:', err);
    }
  }, [productApiAdapter]);

  // 통계 정보 조회
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const authToken = getAuthToken();
      const response = await productApiAdapter.getProductStats(
        authToken || undefined
      );

      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('통계 정보 조회 실패:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [productApiAdapter, getAuthToken]);

  // 상품 생성
  const createProduct = useCallback(
    async (productData: CreateProductRequest): Promise<Product> => {
      try {
        const authToken = getAuthToken();
        const response = await productApiAdapter.createProduct(
          productData,
          authToken || undefined
        );

        if (response.success) {
          // 상품 목록 새로고침
          await fetchProducts(currentFilters);
          await fetchStats();
          return response.data;
        } else {
          throw new Error(response.message || '상품 생성에 실패했습니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '상품 생성에 실패했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [productApiAdapter, getAuthToken, fetchProducts, fetchStats, currentFilters]
  );

  // 상품 수정
  const updateProduct = useCallback(
    async (
      productId: string,
      productData: UpdateProductRequest
    ): Promise<Product> => {
      try {
        const authToken = getAuthToken();
        const response = await productApiAdapter.updateProduct(
          productId,
          productData,
          authToken || undefined
        );

        if (response.success) {
          // 상품 목록 새로고침
          await fetchProducts(currentFilters);
          await fetchStats();
          return response.data;
        } else {
          throw new Error(response.message || '상품 수정에 실패했습니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '상품 수정에 실패했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [productApiAdapter, getAuthToken, fetchProducts, fetchStats, currentFilters]
  );

  // 상품 삭제
  const deleteProduct = useCallback(
    async (productId: string): Promise<void> => {
      try {
        const authToken = getAuthToken();
        const response = await productApiAdapter.deleteProduct(
          productId,
          authToken || undefined
        );

        if (response.success) {
          // 상품 목록 새로고침
          await fetchProducts(currentFilters);
          await fetchStats();
        } else {
          throw new Error(response.message || '상품 삭제에 실패했습니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '상품 삭제에 실패했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [productApiAdapter, getAuthToken, fetchProducts, fetchStats, currentFilters]
  );

  // 재고 업데이트
  const updateInventory = useCallback(
    async (
      productId: string,
      inventoryData: {
        quantity: number;
        location?: string;
        lowStockThreshold?: number;
      }
    ): Promise<void> => {
      try {
        const authToken = getAuthToken();
        const response = await productApiAdapter.updateInventory(
          productId,
          inventoryData,
          authToken || undefined
        );

        if (response.success) {
          // 상품 목록 새로고침
          await fetchProducts(currentFilters);
          await fetchStats();
        } else {
          throw new Error(response.message || '재고 업데이트에 실패했습니다.');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '재고 업데이트에 실패했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [productApiAdapter, getAuthToken, fetchProducts, fetchStats, currentFilters]
  );

  // 상품 목록 새로고침
  const refreshProducts = useCallback(() => {
    return fetchProducts(currentFilters);
  }, [fetchProducts, currentFilters]);

  // 통계 새로고침
  const refreshStats = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchStats();
  }, [fetchProducts, fetchCategories, fetchStats]); // 의존성 배열에 함수들 포함

  return {
    // 상품 목록 관련
    products,
    categories,
    loading,
    error,
    pagination,

    // 통계 정보
    stats,
    statsLoading,

    // 상품 관리 액션들
    fetchProducts,
    fetchCategories,
    fetchStats,
    createProduct,
    updateProduct,
    deleteProduct,
    updateInventory,

    // 유틸리티
    refreshProducts,
    refreshStats,
  };
};
