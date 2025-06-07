import { Product } from '@entities/product/Product';
import { IProductRepository } from '@entities/product/IProductRepository';

export class GetProductDetailUseCase {
  constructor(private productRepository: IProductRepository) {}

  async execute(productId: string): Promise<Product> {
    if (!productId) {
      throw new Error('상품 ID가 필요합니다');
    }

    try {
      return await this.productRepository.getProductById(productId);
    } catch (error: any) {
      throw new Error(error.message || '상품 정보를 불러오는데 실패했습니다');
    }
  }
}
