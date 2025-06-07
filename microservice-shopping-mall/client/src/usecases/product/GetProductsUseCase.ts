import { Product } from '@entities/product/Product';
import { IProductRepository } from '@entities/product/IProductRepository';
import { ProductFilter, PaginatedResponse } from '@shared/types';

export class GetProductsUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(
    filter: ProductFilter = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Product>> {
    if (page < 1) {
      throw new Error('페이지 번호는 1 이상이어야 합니다');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('한 페이지당 상품 수는 1-100 사이여야 합니다');
    }

    try {
      return await this.productRepository.getProducts(filter, page, limit);
    } catch (error: any) {
      throw new Error(error.message || '상품 목록을 불러오는데 실패했습니다');
    }
  }
}
