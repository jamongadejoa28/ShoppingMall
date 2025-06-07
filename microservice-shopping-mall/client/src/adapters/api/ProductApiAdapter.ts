import { IProductRepository } from '@entities/product/IProductRepository';
import { Product } from '@entities/product/Product';
import { Category, ProductFilter, PaginatedResponse } from '@shared/types';
import { apiClient } from '@shared/utils/api';
import { API_ENDPOINTS } from '@shared/constants/api';

export class ProductApiAdapter implements IProductRepository {
  async getProducts(
    filter: ProductFilter,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<Product>> {
    const params = {
      page,
      limit,
      ...filter,
    };

    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
      params,
    });

    return {
      ...response.data,
      data: response.data.data.map((item: any) =>
        Product.fromApiResponse(item)
      ),
    };
  }

  async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.DETAIL(id));
    return Product.fromApiResponse(response.data.data);
  }

  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.CATEGORIES);
    return response.data.data;
  }

  async getRecommendations(userId: string): Promise<Product[]> {
    const response = await apiClient.get(
      API_ENDPOINTS.PRODUCTS.RECOMMENDATIONS(userId)
    );
    return response.data.data.map((item: any) => Product.fromApiResponse(item));
  }

  async searchProducts(
    query: string,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<Product>> {
    const params = {
      search: query,
      page,
      limit,
    };

    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS.LIST, {
      params,
    });

    return {
      ...response.data,
      data: response.data.data.map((item: any) =>
        Product.fromApiResponse(item)
      ),
    };
  }
}
