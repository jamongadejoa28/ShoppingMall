import { Product } from './Product';
import { Category, ProductFilter, PaginatedResponse } from '@shared/types';

export interface IProductRepository {
  getProducts(filter: ProductFilter, page: number, limit: number): Promise<PaginatedResponse<Product>>;
  getProductById(id: string): Promise<Product>;
  getCategories(): Promise<Category[]>;
  getRecommendations(userId: string): Promise<Product[]>;
  searchProducts(query: string, page: number, limit: number): Promise<PaginatedResponse<Product>>;
}